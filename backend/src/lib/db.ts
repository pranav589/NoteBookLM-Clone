import mongoose, { Schema, Document, Model } from "mongoose";

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/notebooklm";

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log("🔌 Connected successfully to MongoDB via Mongoose");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

// Notebook Interface
export interface INotebook extends Document {
  name: string;
  createdAt: Date;
}

// Source Interface
export interface ISource extends Document {
  notebookId: mongoose.Types.ObjectId;
  name: string;
  type: "pdf" | "text" | "url" | "youtube" | "transcript";
  status: "uploading" | "indexing" | "completed" | "failed";
  error?: string;
  pathOrUrl?: string;
  createdAt: Date;
}

// Notebook Schema
const NotebookSchema = new Schema<INotebook>({
  name: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
});

// Source Schema
const SourceSchema = new Schema<ISource>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["pdf", "text", "url", "youtube", "transcript"],
    required: true,
  },
  status: {
    type: String,
    enum: ["uploading", "indexing", "completed", "failed"],
    default: "indexing",
  },
  error: { type: String },
  pathOrUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Export Models
export const Notebook: Model<INotebook> =
  mongoose.models.Notebook || mongoose.model<INotebook>("Notebook", NotebookSchema);

export const Source: Model<ISource> =
  mongoose.models.Source || mongoose.model<ISource>("Source", SourceSchema);
