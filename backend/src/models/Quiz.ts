import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "short_answer";
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface IQuiz extends Document {
  notebookId: mongoose.Types.ObjectId;
  title: string;
  questions: IQuizQuestion[];
  createdAt: Date;
}

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  id: { type: String, required: true },
  type: { type: String, enum: ["mcq", "true_false", "short_answer"], required: true },
  questionText: { type: String, required: true },
  options: { type: [String], default: undefined },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
});

const QuizSchema = new Schema<IQuiz>({
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  title: { type: String, required: true, trim: true },
  questions: { type: [QuizQuestionSchema], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Quiz: Model<IQuiz> =
  mongoose.models.Quiz || mongoose.model<IQuiz>("Quiz", QuizSchema);
