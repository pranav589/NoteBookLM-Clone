
import { Worker } from "bullmq";
import { connection } from "../lib/queue";
import { INDEXING_QUEUE, QUERY_QUEUE, config } from "../lib/config";
import { connectToDatabase, Source, ChatMessage, Notification } from "../lib/db";
import { indexSource, answerQuery, askAgent } from "../rag";
import { sseManager } from "../lib/sse-manager";

console.log("Worker starting...");

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
    
    const { sourceId, notebookId, userId, type, filePath, url, name } = job.data;
    
    try {
      // Set status to indexing in case it wasn't set yet
      await Source.findByIdAndUpdate(sourceId, { status: "indexing" });

      // Notify frontend indexing started
      const startNotif = await Notification.create({
        notebookId,
        type: "progress",
        title: "Indexing Document",
        message: `Reading and extracting segments for "${name}"...`,
        isRead: false,
      });

      await sseManager.publish(notebookId, {
        type: "indexing:start",
        sourceId,
        sourceName: name,
        dbNotificationId: startNotif._id,
      });

      const result = await indexSource({
        sourceId,
        notebookId,
        userId: userId || "unknown",
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

      // Clean up start progress notification from DB
      await Notification.findByIdAndDelete(startNotif._id);

      // Create permanent complete notification
      const completeNotif = await Notification.create({
        notebookId,
        type: "success",
        title: "Ingestion Success",
        message: `Successfully indexed "${name}" into ${result.chunks} chunk vectors.`,
        isRead: false,
      });

      // Notify frontend indexing complete
      await sseManager.publish(notebookId, {
        type: "indexing:complete",
        sourceId,
        sourceName: name,
        chunks: result.chunks,
        dbNotificationId: completeNotif._id,
      });

      return result;
    } catch (err: any) {
      console.error(`Error indexing source in job ${job.id}:`, err);
      
      const errMsg = err.message || "Unknown error during ingestion";
      // Save indexing error in database
      await Source.findByIdAndUpdate(sourceId, {
        status: "failed",
        error: errMsg,
      });

      // Clean up start progress notification if defined
      try {
        const { sourceId } = job.data;
        await Notification.findOneAndDelete({ notebookId, type: "progress", title: "Indexing Document" });
      } catch (cleanErr) {
        console.error("Failed to clean progress notification:", cleanErr);
      }

      // Create failure notification
      const failNotif = await Notification.create({
        notebookId,
        type: "error",
        title: "Ingestion Failed",
        message: `Failed to index "${name}": ${errMsg}`,
        isRead: false,
      });

      // Notify frontend indexing failed
      await sseManager.publish(notebookId, {
        type: "indexing:failed",
        sourceId,
        sourceName: name,
        error: errMsg,
        dbNotificationId: failNotif._id,
      });

      throw err;
    }
  },
  {
    connection,
    concurrency: 2,
    stalledInterval: 300000, // 5 minutes (reduces poll frequency for stalled jobs)
    drainDelay: 10,          // 10 seconds (delay before polling again on empty queue)
  }
);

// Query Worker
const queryWorker = new Worker(
  QUERY_QUEUE,
  async (job) => {
    console.log(`🔎 Query job ${job.id}: ${JSON.stringify(job.data.query)} inside Notebook: ${job.data.notebookId}`);
    try {
      await connectToDatabase();
      const result = config.useAdvancedRag
        ? await askAgent(job.data.query, job.data.notebookId)
        : await answerQuery(job.data.query, job.data.notebookId);
      
      // Save User Question to DB
      await ChatMessage.create({
        notebookId: job.data.notebookId,
        role: "user",
        content: job.data.query,
      });

      // Save Assistant Answer to DB
      await ChatMessage.create({
        notebookId: job.data.notebookId,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        queries: result.queries,
      });

      console.log(`   → Answered and stored query in DB. Chunks used: ${result.sources?.length}`);

      // Publish query completion via SSE with content and sources for instant UI updates
      console.log(`⚡ [BACKEND] Publishing query:complete at: ${new Date().toISOString()}`);
      await sseManager.publish(job.data.notebookId, {
        type: "query:complete",
        clientMessageId: job.data.clientMessageId,
        messageId: Math.random().toString(), // Add a unique ID for rendering key
        content: result.answer,
        sources: result.sources,
        queries: result.queries,
      });

      return result;
    } catch (err: any) {
      console.error(`Error running query in job ${job.id}:`, err);
      
      // Publish query failure via SSE
      try {
        await sseManager.publish(job.data.notebookId, {
          type: "query:failed",
          clientMessageId: job.data.clientMessageId,
          error: err.message || "Failed to process query",
        });
      } catch (sseErr) {
        console.error("Failed to notify query failure over SSE:", sseErr);
      }

      throw err;
    }
  },
  {
    connection,
    concurrency: 4,
    stalledInterval: 300000,
    drainDelay: 10,
  }
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
