import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { Document } from "@langchain/core/documents";
import { config } from "../../lib/config";
import { getVectorStore } from "../vector-store/qdrant";
import { queryRewriting, hydeDocument } from "./query-processor";
import { rerankChunks } from "./reranker";

interface NotebookCacheEntry {
  retriever: BM25Retriever;
  firstChunks: any[];
  ts: number;
}

const notebookCache = new Map<string, NotebookCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Reciprocal Rank Fusion: combines several ranked result lists
 */
function reciprocalRankFusion(
  rankedLists: Array<{ label: string; hits: any[] }>,
  k = config.retrieval.rrfK,
) {
  const fused = new Map<string, any>();

  for (const { label, hits } of rankedLists) {
    hits.forEach((h, index) => {
      // LangChain vector store similarity results are [Document, score]
      // BM25 results are just Document
      const doc = Array.isArray(h) ? h[0] : h;
      const rawScore = Array.isArray(h) ? (h[1] ?? 0) : 0;

      if (!doc) return;

      const docId =
        doc.metadata?.id ||
        doc.pageContent.slice(0, 50) + doc.metadata?.chunkIndex;
      const rank = index + 1; // 1-based
      const contribution = 1 / (k + rank);
      const existing = fused.get(docId);

      if (existing) {
        existing.rrfScore += contribution;
        existing.bestScore = Math.max(existing.bestScore, rawScore);
        existing.matchedBy.push(label);
      } else {
        fused.set(docId, {
          id: docId,
          text: doc.pageContent,
          source: doc.metadata?.sourceName ?? doc.metadata?.source ?? null,
          chunkIndex: doc.metadata?.chunkIndex ?? null,
          bestScore: rawScore,
          rrfScore: contribution,
          matchedBy: [label],
          metadata: doc.metadata ?? {},
        });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Retrieve chunks using Multi-query expansion and RRF
 */
export async function retrieveChunks(
  query: string,
  notebookId?: string,
  userId?: string,
) {
  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    queryRewriting(query),
    hydeDocument(query),
  ]);

  const variants = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q: string, i: number) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((q) => q.text.trim().length > 0);

  // Initialize BM25 Retriever if notebookId is present
  let bm25Retriever: BM25Retriever | null = null;
  let firstChunksList: any[] = [];

  if (notebookId) {
    const cached = notebookCache.get(notebookId);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      console.log(`[Self-RAG] Cache hit: reusing BM25 index & metadata chunks for notebook ${notebookId}`);
      bm25Retriever = cached.retriever;
      firstChunksList = cached.firstChunks;
    } else {
      try {
        console.log(`[Self-RAG] Cache miss: Fetching notebook ${notebookId} chunks from Qdrant...`);
        const scrollUrl = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/scroll`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.qdrant.apiKey) {
          headers["api-key"] = config.qdrant.apiKey;
        }
        const scrollRes = await fetch(scrollUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            filter: {
              must: [
                { key: "metadata.notebookId", match: { value: notebookId } },
              ],
            },
            limit: 1000,
            with_payload: true,
          }),
        });

        if (scrollRes.ok) {
          const scrollData = (await scrollRes.json()) as any;
          const points = scrollData.result?.points || [];
          console.log(`[Self-RAG] Scrolled ${points.length} chunks for notebook ${notebookId}`);

          if (points.length > 0) {
            const docs = points.map(
              (p: any) =>
                new Document({
                  pageContent:
                    p.payload?.content ||
                    p.payload?.page_content ||
                    p.payload?.text ||
                    "",
                  metadata: p.payload?.metadata || {},
                })
            );

            bm25Retriever = BM25Retriever.fromDocuments(docs, {
              k: config.retrieval.topK,
            });

            firstChunksList = points
              .filter((p: any) => typeof p.payload?.metadata?.chunkIndex === "number" && p.payload.metadata.chunkIndex <= 7)
              .map((p: any) => {
                const text = p.payload?.content || p.payload?.page_content || p.payload?.text || "";
                return {
                  id: p.id,
                  text,
                  source: p.payload?.metadata?.sourceName || p.payload?.metadata?.source || null,
                  chunkIndex: p.payload?.metadata?.chunkIndex ?? null,
                  bestScore: 0.5,
                  rrfScore: 0.001,
                  matchedBy: ["metadataPage"],
                  metadata: p.payload?.metadata || {},
                };
              });

            notebookCache.set(notebookId, {
              retriever: bm25Retriever,
              firstChunks: firstChunksList,
              ts: Date.now(),
            });
            console.log(`[Self-RAG] Cached BM25 index and ${firstChunksList.length} metadata chunks.`);
          }
        } else {
          console.warn(`[Self-RAG] Scroll API returned status: ${scrollRes.status}`);
        }
      } catch (err) {
        console.error("[Self-RAG] Failed to retrieve notebook chunks for caching/BM25:", err);
      }
    }
  }

  const vectorStore = await getVectorStore();

  const mustClauses: any[] = [];
  if (notebookId) {
    mustClauses.push({
      key: "metadata.notebookId",
      match: { value: notebookId },
    });
  }
  if (userId) {
    mustClauses.push({ key: "metadata.userId", match: { value: userId } });
  }
  const filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

  // Search in parallel for all variants across both Vector and BM25 search spaces
  const vectorResults = await Promise.all(
    variants.map(async (v) => {
      const hits = await vectorStore.similaritySearchWithScore(
        v.text,
        config.retrieval.topK,
        filter,
      );
      return hits;
    })
  );

  const bm25Results = bm25Retriever
    ? await Promise.all(
        variants.map(async (v) => {
          try {
            const hits = await bm25Retriever!.invoke(v.text);
            return hits;
          } catch (err) {
            console.error(`[Self-RAG] BM25 query error for "${v.text}":`, err);
            return [];
          }
        })
      )
    : [];

  const rankedLists: Array<{ label: string; hits: any[] }> = [];

  variants.forEach((v, i) => {
    // Vector list
    rankedLists.push({
      label: `vector_${v.label}`,
      hits: vectorResults[i],
    });

    // BM25 list
    if (bm25Retriever && bm25Results[i]) {
      rankedLists.push({
        label: `bm25_${v.label}`,
        hits: bm25Results[i],
      });
    }
  });

  const fused = reciprocalRankFusion(rankedLists);
  let chunks = await rerankChunks(query, fused, 7);

  // Inject metadata first chunks in memory from cache
  if (firstChunksList && firstChunksList.length > 0) {
    for (const item of firstChunksList) {
      const isDup = chunks.some((c) => c.id === item.id || c.text === item.text);
      if (!isDup) {
        chunks.push(item);
      }
    }
  }

  return {
    queries: { original: query, rewritten, stepBack, hyde, subQueries },
    chunks,
  };
}
