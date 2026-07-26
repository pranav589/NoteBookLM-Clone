import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Quiz, QuizAttempt, Flashcard, Notebook } from "../lib/db";
import { SourceService } from "../services/source.service";
import { AIService } from "../services/ai.service";
import { AnkiService } from "../services/anki.service";
import { calculateSM2 } from "../lib/sm2";

export class StudyController {
  // ── QUIZZES ────────────────────────────────────────────────────────────────
  
  public static async generateQuiz(req: any, res: Response, next: NextFunction) {
    try {
      const { notebookId } = req.body;
      const userEmail = req.user?.email;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      // Fetch chunks from Qdrant
      const points = await SourceService.fetchQdrantPoints(notebookId);
      if (points.length === 0) {
        return res.status(400).json({
          error: "No source materials found. Please upload documents first.",
        });
      }

      // Compile content context
      const textChunks = points.map((p: any) => p.payload?.content || p.payload?.page_content || p.payload?.text || "");
      const itemsText = textChunks.join("\n\n").slice(0, 15000);

      // Generate structured quiz
      const generated = await AIService.generateQuiz(itemsText);

      // Save to Database
      const quiz = await Quiz.create({
        notebookId,
        title: generated.title || `Quiz on ${notebook.name}`,
        questions: generated.questions,
      });

      return res.status(201).json(quiz);
    } catch (err) {
      return next(err);
    }
  }

  public static async getQuizzes(req: Request, res: Response, next: NextFunction) {
    try {
      const notebookId = req.query.notebookId as string;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const quizzes = await Quiz.find({ notebookId }).sort({ createdAt: -1 });
      return res.status(200).json(quizzes);
    } catch (err) {
      return next(err);
    }
  }

  public static async getQuiz(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid quiz ID" });
      }

      const quiz = await Quiz.findById(id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      return res.status(200).json(quiz);
    } catch (err) {
      return next(err);
    }
  }

  public static async submitAttempt(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { answers } = req.body; // array of { questionId, userAnswer }
      const userEmail = req.user?.email;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid quiz ID" });
      }

      const quiz = await Quiz.findById(id);
      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (!Array.isArray(answers)) {
        return res.status(400).json({ error: "'answers' must be an array" });
      }

      let score = 0;
      const gradedAnswers = quiz.questions.map((q) => {
        const submission = answers.find((ans: any) => ans.questionId === q.id);
        const userAnswer = submission ? String(submission.userAnswer).trim() : "";
        
        let isCorrect = false;
        if (q.type === "mcq" || q.type === "true_false") {
          isCorrect = q.correctAnswer.toLowerCase() === userAnswer.toLowerCase();
        } else {
          // Short answer: correct if not empty (we provide explanation in frontend for self-check)
          isCorrect = userAnswer.length > 0;
        }

        if (isCorrect) score++;

        return {
          questionId: q.id,
          userAnswer,
          isCorrect,
        };
      });

      const attempt = await QuizAttempt.create({
        quizId: quiz._id,
        notebookId: quiz.notebookId,
        userEmail,
        score,
        totalQuestions: quiz.questions.length,
        answers: gradedAnswers,
      });

      return res.status(201).json(attempt);
    } catch (err) {
      return next(err);
    }
  }

  public static async getQuizAttempts(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // quiz ID or "all" to get stats
      const notebookId = req.query.notebookId as string;

      if (id === "all") {
        if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
          return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
        }
        const attempts = await QuizAttempt.find({ notebookId, userEmail: req.user?.email })
          .sort({ createdAt: -1 });
        return res.status(200).json(attempts);
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid quiz ID" });
      }

      const attempts = await QuizAttempt.find({ quizId: id, userEmail: req.user?.email })
        .sort({ createdAt: -1 });
      return res.status(200).json(attempts);
    } catch (err) {
      return next(err);
    }
  }

  // ── FLASHCARDS ─────────────────────────────────────────────────────────────

  public static async generateFlashcards(req: any, res: Response, next: NextFunction) {
    try {
      const { notebookId } = req.body;
      const userEmail = req.user?.email;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      const points = await SourceService.fetchQdrantPoints(notebookId);
      if (points.length === 0) {
        return res.status(400).json({
          error: "No source materials found. Please upload documents first.",
        });
      }

      const textChunks = points.map((p: any) => p.payload?.content || p.payload?.page_content || p.payload?.text || "");
      const itemsText = textChunks.join("\n\n").slice(0, 15000);

      const generated = await AIService.generateFlashcards(itemsText);

      // Create new cards in DB
      const createdCards = [];
      for (const card of generated.cards) {
        const fc = await Flashcard.create({
          notebookId,
          userEmail,
          front: card.front,
          back: card.back,
        });
        createdCards.push(fc);
      }

      return res.status(201).json(createdCards);
    } catch (err) {
      return next(err);
    }
  }

  public static async getFlashcards(req: any, res: Response, next: NextFunction) {
    try {
      const notebookId = req.query.notebookId as string;
      const userEmail = req.user?.email;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const cards = await Flashcard.find({ notebookId, userEmail }).sort({ createdAt: -1 });
      return res.status(200).json(cards);
    } catch (err) {
      return next(err);
    }
  }

  public static async getDueFlashcards(req: any, res: Response, next: NextFunction) {
    try {
      const notebookId = req.query.notebookId as string;
      const userEmail = req.user?.email;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const cards = await Flashcard.find({
        notebookId,
        userEmail,
        nextReviewDate: { $lte: new Date() },
      });

      return res.status(200).json(cards);
    } catch (err) {
      return next(err);
    }
  }

  public static async reviewFlashcard(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rating } = req.body; // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
      const userEmail = req.user?.email;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid card ID" });
      }

      const card = await Flashcard.findOne({ _id: id, userEmail });
      if (!card) {
        return res.status(404).json({ error: "Flashcard not found" });
      }

      if (!rating || rating < 1 || rating > 4) {
        return res.status(400).json({ error: "Rating must be between 1 and 4" });
      }

      const calculated = calculateSM2(
        rating,
        card.easeFactor,
        card.interval,
        card.repetitions
      );

      card.easeFactor = calculated.easeFactor;
      card.interval = calculated.interval;
      card.repetitions = calculated.repetitions;
      card.nextReviewDate = calculated.nextReviewDate;

      await card.save();
      return res.status(200).json(card);
    } catch (err) {
      return next(err);
    }
  }

  public static async exportAnki(req: any, res: Response, next: NextFunction) {
    try {
      const notebookId = req.query.notebookId as string;
      const userEmail = req.user?.email;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      const cards = await Flashcard.find({ notebookId, userEmail });
      if (cards.length === 0) {
        return res.status(400).json({ error: "No flashcards found to export" });
      }

      const buffer = await AnkiService.exportDeck(notebook.name, cards);

      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${notebook.name.replace(/[^a-z0-9]/gi, "_")}_flashcards.apkg"`);
      return res.send(buffer);
    } catch (err) {
      return next(err);
    }
  }
}
