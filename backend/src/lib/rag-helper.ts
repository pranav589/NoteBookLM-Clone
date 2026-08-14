import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import {
  HumanMessage,
  SystemMessage
} from "@langchain/core/messages";
import { getLLM } from "./llm";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { promises as fs } from "fs";
import mongoose from "mongoose";
import { z } from "zod";
import { config } from "./config";
import { embeddings } from "./embeddings";
import { downloadFileFromGridFS } from "./gridfs";
import { fetchYoutubeTranscript, parseVtt, scrapeWebsite } from "./parsers";
import {
  HYDE_SYSTEM_PROMPT,
  QUERY_REWRITING_SYSTEM_PROMPT,
  RAG_SYSTEM_PROMPT_BASE,
} from "./prompts";
import { ensurePayloadIndexes, getVectorStore } from "./qdrant-client";

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
  type: "pdf" | "text" | "url" | "youtube" | "transcript" | "image";
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
    let loader: PDFLoader;
    if (mongoose.Types.ObjectId.isValid(filePath)) {
      const buffer = await downloadFileFromGridFS(filePath);
      const blob = new Blob([buffer]);
      loader = new PDFLoader(blob);
    } else {
      loader = new PDFLoader(filePath);
    }
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
    let rawText = "";
    if (mongoose.Types.ObjectId.isValid(filePath)) {
      const buffer = await downloadFileFromGridFS(filePath);
      rawText = buffer.toString("utf-8");
    } else {
      rawText = await fs.readFile(filePath, "utf-8");
    }
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
  } else if (type === "image") {
    if (!filePath) throw new Error("Missing filePath for Image source");
    let buffer: Buffer;
    if (mongoose.Types.ObjectId.isValid(filePath)) {
      buffer = await downloadFileFromGridFS(filePath);
    } else {
      buffer = await fs.readFile(filePath);
    }

    const base64Image = buffer.toString("base64");
    const llm = getLLM(0.0);
    
    console.log(`[OCR] Ingesting image source. Transcribing with LLM helper...`);
    
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: "Transcribe all text from this image exactly. Do not add any conversational text, explanation, or commentary. Only return the exact transcription."
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    });

    const response = await llm.invoke([message]);
    const transcribedText = (response.content as string) || "";
    
    if (!transcribedText.trim()) {
      throw new Error("No text transcribed or empty response returned from OCR model.");
    }

    console.log(`[OCR] Transcribed ${transcribedText.length} characters.`);

    const splitTexts = await splitter.splitText(transcribedText);
    docs = splitTexts.map((text, i) => {
      return new Document({
        pageContent: text,
        metadata: {
          notebookId,
          sourceId,
          userId,
          sourceName: name,
          sourceType: "image",
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

      const cleanText = segment.text
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"');
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
          }),
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
        }),
      );
    }
  } else if (type === "transcript") {
    if (!filePath) throw new Error("Missing filePath for Transcript source");
    let content = "";
    if (mongoose.Types.ObjectId.isValid(filePath)) {
      const buffer = await downloadFileFromGridFS(filePath);
      content = buffer.toString("utf-8");
    } else {
      content = await fs.readFile(filePath, "utf-8");
    }
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
          }),
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
        }),
      );
    }
  }

  if (docs.length === 0) {
    throw new Error("No extractable content found to index.");
  }

  // Save to Qdrant
  await QdrantVectorStore.fromDocuments(docs, embeddings, {
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
      "A broader, higher-level 'step-back' question whose answer gives useful background for the original query.",
    ),
  rewritten: z
    .string()
    .describe(
      "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent.",
    ),
  subQueries: z
    .array(z.string())
    .describe(
      "Exactly 3 focused sub-questions the original query can be decomposed into.",
    ),
});

/**
 * Rewrite a user's query into several variants using ChatOpenAI structured output:
 */
export async function queryRewriting(query: string) {
  const model = getLLM(0.2);

  const structuredModel = model.withStructuredOutput(queryRewritingSchema);

  try {
    const result = await structuredModel.invoke([
      new SystemMessage(QUERY_REWRITING_SYSTEM_PROMPT),
      new HumanMessage(query),
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
  const model = getLLM(0.3);

  const response = await model.invoke([
    new SystemMessage(HYDE_SYSTEM_PROMPT),
    new HumanMessage(query),
  ]);

  return (response.content as string).trim() || "";
}

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
      // LangChain vector store results are [Document, score]
      const doc = h[0] || h;
      const rawScore = h[1] ?? 0;

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

  // Search in parallel for all variants
  const resultsPerQuery = await Promise.all(
    variants.map(async (v) => {
      const hits = await vectorStore.similaritySearchWithScore(
        v.text,
        config.retrieval.topK,
        filter,
      );
      return hits;
    }),
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
              { key: "metadata.chunkIndex", range: { lte: 7 } },
            ],
          },
          limit: 24, // up to 3 sources * 8 chunks = 24 chunks max
          with_payload: true,
        }),
      });
      if (scrollRes.ok) {
        const scrollData = (await scrollRes.json()) as any;
        const points = scrollData.result?.points || [];

        for (const p of points) {
          const docId = p.id;
          const text =
            p.payload?.content ||
            p.payload?.page_content ||
            p.payload?.text ||
            "";

          // Check if this chunk is already retrieved
          const isDup = chunks.some((c) => c.id === docId || c.text === text);
          if (!isDup) {
            chunks.push({
              id: docId,
              text,
              source:
                p.payload?.metadata?.sourceName ||
                p.payload?.metadata?.source ||
                null,
              chunkIndex: p.payload?.metadata?.chunkIndex ?? null,
              bestScore: 0.5,
              rrfScore: 0.001,
              matchedBy: ["metadataPage"],
              metadata: p.payload?.metadata || {},
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
        `${c.metadata?.timestamp ? `, timestamp: ${c.metadata.timestamp}` : ""})\n${c.text}`,
    )
    .join("\n\n");

  // 3. Generate answer using ChatOpenAI
  const model = getLLM(0.2);

  const response = await model.invoke([
    new SystemMessage(RAG_SYSTEM_PROMPT_BASE),
    new HumanMessage(`Context:\n${context}\n\nQuestion: ${query}`),
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

export function formatCitations(content: string, sources: any[]): string {
  if (!sources || sources.length === 0) return content;
  return content.replace(/[\(\[](.*?\d+.*?)[\)\]]/g, (match) => {
    const numbers = match.match(/\d+/g);
    if (!numbers) return match;

    const validLinks = numbers
      .map((numStr) => {
        const citeIndex = parseInt(numStr, 10);
        const matchedSource = sources.find((s) => s.index === citeIndex);
        if (matchedSource) {
          return `[Source ${citeIndex}](#cite-${citeIndex})`;
        }
        return null;
      })
      .filter(Boolean);

    if (validLinks.length > 0) {
      return validLinks.join(", ");
    }
    return match;
  });
}
