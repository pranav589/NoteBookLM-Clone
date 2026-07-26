import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface IQuizAttempt extends Document {
  quizId: mongoose.Types.ObjectId;
  notebookId: mongoose.Types.ObjectId;
  userEmail: string;
  score: number;
  totalQuestions: number;
  answers: IUserAnswer[];
  createdAt: Date;
}

const UserAnswerSchema = new Schema<IUserAnswer>({
  questionId: { type: String, required: true },
  userAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
});

const QuizAttemptSchema = new Schema<IQuizAttempt>({
  quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
  notebookId: { type: Schema.Types.ObjectId, ref: "Notebook", required: true, index: true },
  userEmail: { type: String, required: true, index: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  answers: { type: [UserAnswerSchema], required: true },
  createdAt: { type: Date, default: Date.now },
});

export const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>("QuizAttempt", QuizAttemptSchema);
