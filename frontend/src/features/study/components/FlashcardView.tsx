"use client";

import React from "react";
import { useStudy } from "../hooks/useStudy";
import { FlashcardPanel } from "./FlashcardPanel";
import { HelpCircle } from "lucide-react";

interface FlashcardViewProps {
  notebookId: string;
  notebookName?: string;
  hasCompletedSources: boolean;
}

export function FlashcardView({ notebookId, notebookName, hasCompletedSources }: FlashcardViewProps) {
  const {
    flashcards,
    dueFlashcards,
    generateFlashcards,
    reviewCard,
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
            Please upload a PDF document or connect a YouTube link to generate study flashcards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FlashcardPanel
      notebookId={notebookId}
      notebookName={notebookName}
      flashcards={flashcards}
      dueFlashcards={dueFlashcards}
      generateFlashcards={generateFlashcards}
      reviewCard={reviewCard}
      isGenerating={isGeneratingFlashcards}
      isReviewing={isReviewingCard}
    />
  );
}
export default FlashcardView;
