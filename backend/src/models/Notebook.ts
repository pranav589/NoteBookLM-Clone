import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotebook extends Document {
  name: string;
  roadmap?: any;
  podcast?: any;
  mindMap?: any;
  roadmapStatus?: "idle" | "generating";
  podcastStatus?: "idle" | "generating";
  mindMapStatus?: "idle" | "generating";
  createdAt: Date;
}

const NotebookSchema = new Schema<INotebook>({
  name: { type: String, required: true, trim: true },
  roadmap: { type: Schema.Types.Mixed, default: null },
  podcast: { type: Schema.Types.Mixed, default: null },
  mindMap: { type: Schema.Types.Mixed, default: null },
  roadmapStatus: { type: String, enum: ["idle", "generating"], default: "idle" },
  podcastStatus: { type: String, enum: ["idle", "generating"], default: "idle" },
  mindMapStatus: { type: String, enum: ["idle", "generating"], default: "idle" },
  createdAt: { type: Date, default: Date.now },
});

export const Notebook: Model<INotebook> =
  mongoose.models.Notebook || mongoose.model<INotebook>("Notebook", NotebookSchema);
