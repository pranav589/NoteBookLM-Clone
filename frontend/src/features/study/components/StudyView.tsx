"use client";

import React, { useState } from "react";
import { useStudy } from "../hooks/useStudy";
import { QuizPanel } from "./QuizPanel";
import { FlashcardPanel } from "./FlashcardPanel";
import { BookOpen, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyViewProps {
  notebookId: string;
  hasCompletedSources: boolean;
}

export function StudyView({ notebookId, hasCompletedSources }: StudyViewProps) {
  const [activeTab, setActiveTab] = useState<"quiz" | "flashcard">("quiz");

  const {
    quizzes,
    attempts,
    flashcards,
    dueFlashcards,
    generateQuiz,
    submitQuizAttempt,
    generateFlashcards,
    reviewCard,
    isGeneratingQuiz,
    isSubmittingAttempt,
    isGeneratingFlashcards,
    isReviewingCard,
  } = useStudy(notebookId);

  if (!hasCompletedSources) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
          <HelpCircle className="w-6 h-6" />
        </div>
        <div className="max-w-xs space-y-1.5">
          <h3 className="text-sm font-bold text-foreground">No Source Materials Found</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please upload a PDF document or connect a YouTube link to generate quizzes and study flashcards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Tab select bar */}
      <div className="border-b border-border/40 bg-sidebar px-6 py-2 flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={() => setActiveTab("quiz")}
          className={cn(
            "text-xs px-4 py-2 font-bold rounded-full transition-all cursor-pointer",
            activeTab === "quiz"
              ? "bg-accent/10 text-accent font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Quizzes
        </button>
        <button
          onClick={() => setActiveTab("flashcard")}
          className={cn(
            "text-xs px-4 py-2 font-bold rounded-full transition-all cursor-pointer",
            activeTab === "flashcard"
              ? "bg-accent/10 text-accent font-extrabold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Spaced Repetition Flashcards
        </button>
      </div>

      {/* Tab panel container */}
      <div className="flex-1 flex overflow-hidden bg-background">
        {activeTab === "quiz" ? (
          <QuizPanel
            notebookId={notebookId}
            quizzes={quizzes}
            attempts={attempts}
            generateQuiz={generateQuiz}
            submitQuizAttempt={submitQuizAttempt}
            isGenerating={isGeneratingQuiz}
            isSubmitting={isSubmittingAttempt}
          />
        ) : (
          <FlashcardPanel
            notebookId={notebookId}
            flashcards={flashcards}
            dueFlashcards={dueFlashcards}
            generateFlashcards={generateFlashcards}
            reviewCard={reviewCard}
            isGenerating={isGeneratingFlashcards}
            isReviewing={isReviewingCard}
          />
        )}
      </div>
    </div>
  );
}
export default StudyView;
