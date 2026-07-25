
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatOpenAI } from "@langchain/openai";
import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { z } from "zod";
import { promises as fs } from "fs";
import { config } from "./config";
import { scrapeWebsite, fetchYoutubeTranscript, parseVtt } from "./parsers";

export class MistralDirectEmbeddings extends Embeddings {
  apiKey: string;
  baseURL: string;
  model: string;

  constructor(fields: EmbeddingsParams & { apiKey?: string; baseURL?: string; model?: string }) {
    super(fields);
    this.apiKey = fields.apiKey || "";
    this.baseURL = fields.baseURL || "https://api.mistral.ai/v1";
    this.model = fields.model || "mistral-embed";
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const batchSize = 32;
    const results: number[][] = [];
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const res = await fetch(`${this.baseURL}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
        }),
      });

      if (!res.ok) {
        throw new Error(`Mistral API error: ${res.status} ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      const embeddings = data.data.map((item: any) => item.embedding);
      results.push(...embeddings);
    }

    return results;
  }

  async embedQuery(document: string): Promise<number[]> {
    const res = await fetch(`${this.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [document],
      }),
    });

    if (!res.ok) {
      throw new Error(`Mistral API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return data.data[0].embedding;
  }
}

// Initialize Custom Mistral Embeddings
export const embeddings = new MistralDirectEmbeddings({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
  model: config.openai.embeddingModel,
});

let payloadIndexesCreated = false;

/**
 * Helper to ensure payload keyword indexes for notebookId and sourceId.
 * Essential for strict Qdrant Cloud cluster environments where filtered queries fail if the filter key is not indexed.
 */
export async function ensurePayloadIndexes() {
  const fields = ["metadata.notebookId", "metadata.sourceId", "metadata.userId"];
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/index`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.qdrant.apiKey) {
    headers["api-key"] = config.qdrant.apiKey;
  }

  for (const field of fields) {
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          field_name: field,
          field_schema: "keyword",
        }),
      });
      if (res.status === 404) {
        // Collection does not exist yet (will be created when first source is indexed)
        return;
      }
      if (!res.ok) {
        console.warn(`[Qdrant] Warning: Failed to ensure payload index for ${field}: ${res.status} ${await res.text()}`);
      } else {
        console.log(`[Qdrant] Ensured payload index for ${field}`);
      }
    } catch (err) {
      console.warn(`[Qdrant] Error ensuring payload index for ${field}:`, err);
    }
  }
  payloadIndexesCreated = true;
}

// Helper to ensure Qdrant vector store
export async function getVectorStore() {
  if (!payloadIndexesCreated) {
    // Attempt to ensure indexes in the background (does not block RAG startup)
    ensurePayloadIndexes().catch((err) => {
      console.warn("[Qdrant] Error in background index creation:", err);
    });
  }

  return QdrantVectorStore.fromExistingCollection(embeddings, {
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey,
    collectionName: config.qdrant.collection,
  });
}

/**
 * Full indexing pipeline for a notebook knowledge source:
 * extract -> chunk -> embed -> upsert into Qdrant.
 */
export async function indexSource({
  sourceId,
  notebookId,
  userId,
  type,
  filePath,
  url,
  name,
}: {
  sourceId: string;
  notebookId: string;
  userId: string;
  type: "pdf" | "text" | "url" | "youtube" | "transcript";
  filePath?: string;
  url?: string;
  name: string;
}) {
  let docs: Document[] = [];

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: config.chunking.chunkSize,
    chunkOverlap: config.chunking.chunkOverlap,
  });

  if (type === "pdf") {
    if (!filePath) throw new Error("Missing filePath for PDF");
    const loader = new PDFLoader(filePath);
    const rawDocs = await loader.load();
    const splitDocs = await splitter.splitDocuments(rawDocs);
    docs = splitDocs.map((doc, i) => {
      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          notebookId,
          sourceId,
          userId,
          sourceName: name,
          sourceType: "pdf",
          chunkIndex: i,
          pageNumber: doc.metadata?.loc?.pageNumber ?? 1,
        },
      });
    });
  } else if (type === "text") {
    if (!filePath) throw new Error("Missing filePath for Text source");
    const rawText = await fs.readFile(filePath, "utf-8");
    const splitTexts = await splitter.splitText(rawText);
    docs = splitTexts.map((text, i) => {
      return new Document({
        pageContent: text,
        metadata: {
          notebookId,
          sourceId,
          userId,
          sourceName: name,
          sourceType: "text",
          chunkIndex: i,
        },
      });
    });
  } else if (type === "url") {
    if (!url) throw new Error("Missing URL for Website source");
    const scrapedText = await scrapeWebsite(url);
    const splitTexts = await splitter.splitText(scrapedText);
    docs = splitTexts.map((text, i) => {
      return new Document({
        pageContent: text,
        metadata: {
          notebookId,
          sourceId,
          userId,
          sourceName: name,
          sourceType: "url",
          url,
          chunkIndex: i,
        },
      });
    });
  } else if (type === "youtube") {
    if (!url) throw new Error("Missing URL for YouTube video");
    const segments = await fetchYoutubeTranscript(url);
    
    let currentChunkText = "";
    let currentChunkStart = 0;
    let chunkCount = 0;

    for (const segment of segments) {
      if (currentChunkText.length === 0) {
        currentChunkStart = segment.start;
      }
      
      const cleanText = segment.text.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      currentChunkText += " " + cleanText;

      if (currentChunkText.length >= config.chunking.chunkSize) {
        docs.push(
          new Document({
            pageContent: currentChunkText.trim(),
            metadata: {
              notebookId,
              sourceId,
              userId,
              sourceName: name,
              sourceType: "youtube",
              url,
              timestamp: Math.floor(currentChunkStart),
              chunkIndex: chunkCount++,
            },
          })
        );
        currentChunkText = "";
      }
    }

    if (currentChunkText.trim().length > 0) {
      docs.push(
        new Document({
          pageContent: currentChunkText.trim(),
          metadata: {
            notebookId,
            sourceId,
            userId,
            sourceName: name,
            sourceType: "youtube",
            url,
            timestamp: Math.floor(currentChunkStart),
            chunkIndex: chunkCount++,
          },
        })
      );
    }
  } else if (type === "transcript") {
    if (!filePath) throw new Error("Missing filePath for Transcript source");
    const content = await fs.readFile(filePath, "utf-8");
    const segments = parseVtt(content);

    let currentChunkText = "";
    let currentChunkStart = 0;
    let chunkCount = 0;

    for (const segment of segments) {
      if (currentChunkText.length === 0) {
        currentChunkStart = segment.start;
      }
      currentChunkText += " " + segment.text;

      if (currentChunkText.length >= config.chunking.chunkSize) {
        docs.push(
          new Document({
            pageContent: currentChunkText.trim(),
            metadata: {
              notebookId,
              sourceId,
              userId,
              sourceName: name,
              sourceType: "transcript",
              timestamp: Math.floor(currentChunkStart),
              chunkIndex: chunkCount++,
            },
          })
        );
        currentChunkText = "";
      }
    }

    if (currentChunkText.trim().length > 0) {
      docs.push(
        new Document({
          pageContent: currentChunkText.trim(),
          metadata: {
            notebookId,
            sourceId,
            userId,
            sourceName: name,
            sourceType: "transcript",
            timestamp: Math.floor(currentChunkStart),
            chunkIndex: chunkCount++,
          },
        })
      );
    }
  }

  if (docs.length === 0) {
    throw new Error("No extractable content found to index.");
  }

  // Save to Qdrant
  const vectorStore = await QdrantVectorStore.fromDocuments(docs, embeddings, {
    url: config.qdrant.url,
    apiKey: config.qdrant.apiKey,
    collectionName: config.qdrant.collection,
  });

  // Ensure metadata payload indexes are created for filters (essential for Qdrant Cloud)
  await ensurePayloadIndexes();

  return { chunks: docs.length, collection: config.qdrant.collection };
}

// Zod schema for query rewriting output
const queryRewritingSchema = z.object({
  stepBack: z
    .string()
    .describe(
      "A broader, higher-level 'step-back' question whose answer gives useful background for the original query."
    ),
  rewritten: z
    .string()
    .describe(
      "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent."
    ),
  subQueries: z
    .array(z.string())
    .describe("Exactly 3 focused sub-questions the original query can be decomposed into."),
});

/**
 * Rewrite a user's query into several variants using ChatOpenAI structured output:
 */
export async function queryRewriting(query: string) {
  const model = new ChatOpenAI({
    // apiKey: config.openai.apiKey,
    model: config.openai.chatModel,
    temperature: 0.2,
    configuration: {
      baseURL: config.openai.baseURL,
      apiKey: config.openai.apiKey,
    },
  });

  const structuredModel = model.withStructuredOutput(queryRewritingSchema);

  try {
    const result = await structuredModel.invoke([
      {
        role: "system",
        content:
          "You are a query understanding assistant for a retrieval system. " +
          "Given a user's question, produce query variants that help retrieve relevant documents. " +
          "Apply three techniques: (1) step-back prompting -> one broader background question; " +
          "(2) query rewriting -> fix typos/grammar and make the query explicit and self-contained; " +
          "(3) sub-query decomposition -> break the query into exactly 3 focused sub-questions.",
      },
      { role: "user", content: query },
    ]);

    return {
      stepBack: result.stepBack || "",
      rewritten: result.rewritten || query,
      subQueries: result.subQueries || [],
    };
  } catch (error) {
    console.error("Query rewriting failed:", error);
    return {
      stepBack: "",
      rewritten: query,
      subQueries: [],
    };
  }
}

/**
 * HyDE (Hypothetical Document Embeddings): generates a hypothetical document excerpt
 */
export async function hydeDocument(query: string): Promise<string> {
  const model = new ChatOpenAI({
    // apiKey: config.openai.apiKey,
    model: config.openai.chatModel,
    temperature: 0.3,
    configuration: {
      baseURL: config.openai.baseURL,
      apiKey: config.openai.apiKey,
    },
  });

  const response = await model.invoke([
    {
      role: "system",
      content:
        "You are an expert writer. Write a concise, factual passage (3-5 sentences) that directly answers " +
        "the user's question, as if it were an excerpt from a relevant reference document. " +
        "Write confidently in a neutral, encyclopedic tone. Do not add disclaimers or say you are unsure.",
    },
    { role: "user", content: query },
  ]);

  return (response.content as string).trim() || "";
}

interface RrfHit {
  id: string;
  text: string;
  source: string | null;
  chunkIndex: number | null;
  score: number;
}

/**
 * Reciprocal Rank Fusion: combines several ranked result lists
 */
function reciprocalRankFusion(
  rankedLists: Array<{ label: string; hits: any[] }>,
  k = config.retrieval.rrfK
) {
  const fused = new Map<string, any>();

  for (const { label, hits } of rankedLists) {
    hits.forEach((h, index) => {
      // LangChain vector store results are [Document, score]
      const doc = h[0] || h;
      const rawScore = h[1] ?? 0;
      
      const docId = doc.metadata?.id || doc.pageContent.slice(0, 50) + doc.metadata?.chunkIndex;
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
export async function retrieveChunks(query: string, notebookId?: string, userId?: string) {
  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    queryRewriting(query),
    hydeDocument(query),
  ]);

  const variants = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((q) => q.text.trim().length > 0);

  const vectorStore = await getVectorStore();

  const mustClauses: any[] = [];
  if (notebookId) {
    mustClauses.push({ key: "metadata.notebookId", match: { value: notebookId } });
  }
  if (userId) {
    mustClauses.push({ key: "metadata.userId", match: { value: userId } });
  }
  const filter = mustClauses.length > 0 ? { must: mustClauses } : undefined;

  // Search in parallel for all variants
  const resultsPerQuery = await Promise.all(
    variants.map(async (v) => {
      const hits = await vectorStore.similaritySearchWithScore(v.text, config.retrieval.topK, filter);
      return hits;
    })
  );

  const rankedLists = variants.map((v, i) => ({
    label: v.label,
    hits: resultsPerQuery[i],
  }));

  const fused = reciprocalRankFusion(rankedLists);
  let chunks = fused.slice(0, config.retrieval.finalK);

  // First Chunks Injection: always fetch the first 8 chunks (cover, credits, author) for each source in the notebook
  if (notebookId) {
    try {
      const scrollUrl = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/scroll`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
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
              { key: "metadata.chunkIndex", range: { lte: 7 } }
            ]
          },
          limit: 24, // up to 3 sources * 8 chunks = 24 chunks max
          with_payload: true
        })
      });
      if (scrollRes.ok) {
        const scrollData = (await scrollRes.json()) as any;
        const points = scrollData.result?.points || [];
        
        for (const p of points) {
          const docId = p.id;
          const text = p.payload?.content || p.payload?.page_content || p.payload?.text || "";
          
          // Check if this chunk is already retrieved
          const isDup = chunks.some(c => c.id === docId || c.text === text);
          if (!isDup) {
            chunks.push({
              id: docId,
              text,
              source: p.payload?.metadata?.sourceName || p.payload?.metadata?.source || null,
              chunkIndex: p.payload?.metadata?.chunkIndex ?? null,
              bestScore: 0.5,
              rrfScore: 0.001,
              matchedBy: ["metadataPage"],
              metadata: p.payload?.metadata || {}
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to inject metadata chunks:", err);
    }
  }

  return {
    queries: { original: query, rewritten, stepBack, hyde, subQueries },
    chunks,
  };
}

/**
 * Full RAG workflow using LangChain
 */
export async function answerQuery(query: string, notebookId?: string) {
  // 1. Retrieve the chunks using advanced RRF retrieval
  const { queries, chunks } = await retrieveChunks(query, notebookId);

  if (chunks.length === 0) {
    return {
      query,
      queries,
      answer: "I couldn't find anything relevant in the indexed documents.",
      sources: [],
    };
  }

  // 2. Build context
  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (title: "${c.source}", type: "${c.metadata?.sourceType || "document"}"` +
        `${c.metadata?.pageNumber ? `, page: ${c.metadata.pageNumber}` : ""}` +
        `${c.metadata?.timestamp ? `, timestamp: ${c.metadata.timestamp}` : ""})\n${c.text}`
    )
    .join("\n\n");

  // 3. Generate answer using ChatOpenAI
  const model = new ChatOpenAI({
    model: config.openai.chatModel,
    temperature: 0.2,
    configuration: {
      baseURL: config.openai.baseURL,
      apiKey: config.openai.apiKey,
    },
  });

  const response = await model.invoke([
    {
      role: "system",
      content:
        "You are a helpful assistant. Answer the user's question using ONLY the provided context. " +
        "You MUST cite the source inside your answer using brackets like [Source 1], [Source 2], etc. " +
        "whenever you state a fact derived from it. Try to place these citations inline at the end of relevant sentences. " +
        "Do not formulate the answer without inline citations. If the answer cannot be found in the context, say: " +
        "'I couldn't find information about this in the uploaded documents.' and do not cite anything. Be concise.",
    },
    {
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${query}`,
    },
  ]);

  return {
    query,
    queries,
    answer: (response.content as string).trim(),
    sources: chunks.map((c, i) => ({
      index: i + 1,
      text: c.text,
      source: c.source,
      chunkIndex: c.chunkIndex,
      score: c.bestScore,
      rrfScore: c.rrfScore,
      matchedBy: c.matchedBy,
      metadata: c.metadata ?? {},
    })),
  };
}

/**
 * Deletes all points in Qdrant matching a filter query (e.g. metadata.notebookId or metadata.sourceId)
 */
async function deletePointsByFilter(filter: any) {
  const url = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/delete`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.qdrant.apiKey) {
    headers["api-key"] = config.qdrant.apiKey;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ filter }),
  });

  if (!res.ok) {
    throw new Error(`Failed to delete Qdrant points: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function deleteNotebookVectors(notebookId: string) {
  const filter = {
    must: [
      {
        key: "metadata.notebookId",
        match: { value: notebookId },
      },
    ],
  };
  return deletePointsByFilter(filter);
}

export async function deleteSourceVectors(sourceId: string) {
  const filter = {
    must: [
      {
        key: "metadata.sourceId",
        match: { value: sourceId },
      },
    ],
  };
  return deletePointsByFilter(filter);
}

