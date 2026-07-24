import { Worker } from "bullmq";
import { connection } from "../lib/queue";
import { INDEXING_QUEUE, QUERY_QUEUE } from "../lib/config";
import { connectToDatabase, Source } from "../lib/db";
import { indexSource, answerQuery } from "../lib/rag-helper";

console.log("👷 Starting RAG background workers...");

// Initialize DB connection for the worker process
connectToDatabase().catch((err) => {
  console.error("Worker failed to connect to MongoDB on startup:", err);
});

// Indexing Worker
const indexingWorker = new Worker(
  INDEXING_QUEUE,
  async (job) => {
    console.log(`📥 Ingesting source job ${job.id}: ${job.data.name} [Type: ${job.data.type}]`);
    await connectToDatabase();
    
    const { sourceId, notebookId, type, filePath, url, name } = job.data;
    
    try {
      // Set status to indexing in case it wasn't set yet
      await Source.findByIdAndUpdate(sourceId, { status: "indexing" });

      const result = await indexSource({
        sourceId,
        notebookId,
        type,
        filePath,
        url,
        name,
      });

      console.log(`   → Successfully indexed: ${result.chunks} chunk(s)`);
      
      // Update status in database
      await Source.findByIdAndUpdate(sourceId, {
        status: "completed",
        error: null,
      });

      return result;
    } catch (err: any) {
      console.error(`Error indexing source in job ${job.id}:`, err);
      
      // Save indexing error in database
      await Source.findByIdAndUpdate(sourceId, {
        status: "failed",
        error: err.message || "Unknown error during ingestion",
      });

      throw err;
    }
  },
  { connection, concurrency: 2 }
);

// Query Worker
const queryWorker = new Worker(
  QUERY_QUEUE,
  async (job) => {
    console.log(`🔎 Query job ${job.id}: ${JSON.stringify(job.data.query)} inside Notebook: ${job.data.notebookId}`);
    try {
      const result = await answerQuery(job.data.query, job.data.notebookId);
      console.log(`   → Answered query. Chunks used: ${result.sources?.length}`);
      return result;
    } catch (err: any) {
      console.error(`Error running query in job ${job.id}:`, err);
      throw err;
    }
  },
  { connection, concurrency: 4 }
);

for (const [name, worker] of [
  ["indexing", indexingWorker],
  ["query", queryWorker],
] as const) {
  worker.on("completed", (job) => console.log(`✅ [${name}] job ${job.id} completed`));
  worker.on("failed", (job, err) =>
    console.error(`❌ [${name}] job ${job?.id} failed:`, err.message)
  );
}

console.log("👷 Workers are online & waiting for jobs. Press Ctrl+C to stop.");
