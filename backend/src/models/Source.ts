import mongoose, { Schema, Document, Model } from "mongoose";
import { SourceType, SOURCE_TYPES } from "../types";

export interface ISource extends Document {
  notebookId: mongoose.Types.ObjectId;
  name: string;
  type: SourceType;
  status: "uploading" | "indexing" | "completed" | "failed";
  error?: string;
  pathOrUrl?: string;
  createdAt: Date;
}

const SourceSchema = new Schema<ISource>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: [...SOURCE_TYPES],
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

export const Source: Model<ISource> =
  mongoose.models.Source || mongoose.model<ISource>("Source", SourceSchema);
