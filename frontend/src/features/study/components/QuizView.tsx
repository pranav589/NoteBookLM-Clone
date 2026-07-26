"use client";

import React from "react";
import { useStudy } from "../hooks/useStudy";
import { QuizPanel } from "./QuizPanel";
import { HelpCircle } from "lucide-react";

interface QuizViewProps {
  notebookId: string;
  hasCompletedSources: boolean;
}

export function QuizView({ notebookId, hasCompletedSources }: QuizViewProps) {
  const {
    quizzes,
    attempts,
    generateQuiz,
    submitQuizAttempt,
    isGeneratingQuiz,
    isSubmittingAttempt,
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
            Please upload a PDF document or connect a YouTube link to generate quizzes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <QuizPanel
      notebookId={notebookId}
      quizzes={quizzes}
      attempts={attempts}
      generateQuiz={generateQuiz}
      submitQuizAttempt={submitQuizAttempt}
      isGenerating={isGeneratingQuiz}
      isSubmitting={isSubmittingAttempt}
    />
  );
}
export default QuizView;
