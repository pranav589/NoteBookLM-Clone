import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "@langchain/core/documents";
import { HumanMessage } from "@langchain/core/messages";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { promises as fs } from "fs";
import mongoose from "mongoose";
import { config } from "../../lib/config";
import { getVisionLLM } from "../core/llm";
import { embeddings } from "../core/embeddings";
import { downloadFileFromCloudinary } from "../../lib/cloudinary";
import { fetchYoutubeTranscript, parseVtt, scrapeWebsite } from "./parsers";
import { ensurePayloadIndexes } from "../vector-store/qdrant";
import { SourceType } from "../../types";
import { AssemblyAI } from "assemblyai";

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
  type: SourceType;
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
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const buffer = await downloadFileFromCloudinary(filePath);
      const blob = new Blob([new Uint8Array(buffer)]);
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
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const buffer = await downloadFileFromCloudinary(filePath);
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
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      buffer = await downloadFileFromCloudinary(filePath);
    } else {
      buffer = await fs.readFile(filePath);
    }

    const base64Image = buffer.toString("base64");
    const llm = getVisionLLM();
    
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
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const buffer = await downloadFileFromCloudinary(filePath);
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
  } else if (type === "video") {
    if (!filePath) throw new Error("Missing filePath for Video source");
    const apiKey = config.assemblyai.apiKey || process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      throw new Error("AssemblyAI API Key is not configured on the backend.");
    }
    const client = new AssemblyAI({ apiKey });
    console.log(`[Video Indexer] Transcribing video from url: ${filePath}`);
    const transcript = await client.transcripts.transcribe({
      audio: filePath,
    });
    if (transcript.status === "error") {
      throw new Error(`AssemblyAI video transcription failed: ${transcript.error}`);
    }
    const rawText = transcript.text || "";
    if (!rawText.trim()) {
      throw new Error("No text transcribed from the video.");
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
          sourceType: "video",
          chunkIndex: i,
        },
      });
    });
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
