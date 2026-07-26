import { Router } from "express";
import { StudyController } from "../controllers/study.controller";

const router = Router();

// Quizzes Routes
router.post("/quizzes/generate", StudyController.generateQuiz);
router.get("/quizzes", StudyController.getQuizzes);
router.get("/quizzes/:id", StudyController.getQuiz);
router.post("/quizzes/:id/attempts", StudyController.submitAttempt);
router.get("/quizzes/:id/attempts", StudyController.getQuizAttempts);

// Flashcards Routes
router.post("/flashcards/generate", StudyController.generateFlashcards);
router.get("/flashcards", StudyController.getFlashcards);
router.get("/flashcards/due", StudyController.getDueFlashcards);
router.post("/flashcards/:id/review", StudyController.reviewFlashcard);
router.get("/flashcards/export", StudyController.exportAnki);

export default router;
