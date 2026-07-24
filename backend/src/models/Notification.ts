import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  notebookId: mongoose.Types.ObjectId;
  type: "info" | "success" | "warning" | "error" | "progress";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  type: {
    type: String,
    enum: ["info", "success", "warning", "error", "progress"],
    required: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true },
});

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);
