import "./env";
import { connectToDatabase, Notebook } from "./lib/db";
import { createApp } from "./app";
import "./workers/rag-worker";

const app = createApp();
const port = Number(process.env.PORT) || 5000;

// Connect to MongoDB first, then start listening to HTTP requests
connectToDatabase()
  .then(async () => {
    // Clean up any stale generating statuses
    try {
      const result = await Notebook.updateMany(
        { $or: [{ roadmapStatus: "generating" }, { podcastStatus: "generating" }] },
        { $set: { roadmapStatus: "idle", podcastStatus: "idle" } }
      );
      if (result.modifiedCount > 0) {
        console.log(
          `⚠️  Cleaned up ${result.modifiedCount} notebook(s) stuck in "generating" state (server restart detected).`
        );
      }
    } catch (cleanupErr) {
      console.error("Cleanup on startup failed:", cleanupErr);
    }

    // Start Express server only after DB is ready
    app.listen(port, () => {
      console.log(`🚀 Express server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize MongoDB connection on startup:", err);
    process.exit(1); // Exit process if database is unavailable on startup
  });

