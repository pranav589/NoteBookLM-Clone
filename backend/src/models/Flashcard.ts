import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFlashcard extends Document {
  notebookId: mongoose.Types.ObjectId;
  userEmail: string;
  front: string;
  back: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewDate: Date;
  createdAt: Date;
}

const FlashcardSchema = new Schema<IFlashcard>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  userEmail: { type: String, required: true, index: true },
  front: { type: String, required: true, trim: true },
  back: { type: String, required: true, trim: true },
  easeFactor: { type: Number, default: 2.5 },
  interval: { type: Number, default: 0 }, // in days
  repetitions: { type: Number, default: 0 },
  nextReviewDate: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
});

export const Flashcard: Model<IFlashcard> =
  mongoose.models.Flashcard || mongoose.model<IFlashcard>("Flashcard", FlashcardSchema);
