import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage extends Document {
  notebookId: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    index: number;
    text: string;
    source: string;
    chunkIndex?: number;
    score?: number;
    rrfScore?: number;
    matchedBy?: string;
    metadata?: any;
  }>;
  queries?: any;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  sources: { type: [Schema.Types.Map], default: [] },
  queries: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
