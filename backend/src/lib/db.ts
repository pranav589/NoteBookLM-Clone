import mongoose from "mongoose";

let connectionPromise: Promise<void> | null = null;

export async function connectToDatabase() {
  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notebooklm";

  connectionPromise = (async () => {
    try {
      await mongoose.connect(uri);
      console.log("🔌 Connected successfully to MongoDB via Mongoose");
    } catch (error) {
      connectionPromise = null;
      console.error("❌ MongoDB connection error:", error);
      throw error;
    }
  })();

  return connectionPromise;
}

// Re-export models and interfaces from the central models directory
export * from "../models";
