"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  RefreshCw, 
  Download, 
  CheckCircle,
  HelpCircle,
  Check,
  Zap,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";

interface FlashcardPanelProps {
  notebookId: string;
  notebookName?: string;
  flashcards: any[];
  dueFlashcards: any[];
  generateFlashcards: () => Promise<any>;
  reviewCard: (params: { cardId: string; rating: number }) => Promise<any>;
  isGenerating: boolean;
  isReviewing: boolean;
}

export function FlashcardPanel({
  notebookId,
  notebookName = "Notebook",
  flashcards,
  dueFlashcards,
  generateFlashcards,
  reviewCard,
  isGenerating,
  isReviewing,
}: FlashcardPanelProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyAll, setStudyAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeDeck = studyAll ? flashcards : dueFlashcards;
  const currentCard = activeDeck[currentIdx];

  const handleReveal = () => {
    setIsFlipped(true);
  };

  const handleRating = async (rating: number) => {
    if (!currentCard) return;

    try {
      await reviewCard({
        cardId: currentCard._id,
        rating,
      });

      // Slide to next card
      setIsFlipped(false);
      // Wait for flip back animation before showing next content
      setTimeout(() => {
        if (currentIdx < activeDeck.length - 1) {
          setCurrentIdx((prev) => prev + 1);
        } else {
          // Finished deck
          setCurrentIdx(0);
        }
      }, 200);
    } catch (err) {
      alert("Failed to submit card review");
    }
  };

  const handleGenerate = async () => {
    try {
      await generateFlashcards();
      setCurrentIdx(0);
      setIsFlipped(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportAnki = async () => {
    if (flashcards.length === 0) return;
    setIsExporting(true);

    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      
      const response = await axios.get(`${BACKEND_URL}/api/flashcards/export`, {
        params: { notebookId },
        responseType: "blob",
        withCredentials: true
      });

      const blob = new Blob([response.data], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${notebookName.replace(/[^a-z0-9]/gi, "_")}_flashcards.apkg`;
      link.click();
    } catch (err) {
      alert("Anki export failed. Make sure you have flashcards generated.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
      {/* Top action header: Stats & Deck controls */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">Flashcards Deck</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-bold">
              Spaced Repetition (Anki SM-2)
            </p>
          </div>
          
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="bg-card border-border/80 text-foreground text-[10px] font-bold py-0.5 px-2.5 rounded-full">
              Total: {flashcards.length}
            </Badge>
            <Badge className="bg-accent/15 border-accent/20 text-accent text-[10px] font-bold py-0.5 px-2.5 rounded-full">
              Due: {dueFlashcards.length}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {flashcards.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAnki}
              disabled={isExporting}
              className="text-[11px] font-bold rounded-full h-8 flex items-center gap-1 bg-card hover:bg-muted/10 cursor-pointer transition-all border-border"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? "Exporting..." : "Export Anki Deck"}
            </Button>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="sm"
            className="text-[11px] font-bold rounded-full h-8 bg-foreground text-background hover:bg-foreground/90 transition-all flex items-center gap-1 cursor-pointer shadow-level1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {flashcards.length > 0 ? "Add More Cards" : "Generate Deck"}
          </Button>
        </div>
      </div>

      {/* Main card viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              <Zap className="w-5 h-5 text-accent absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <div className="text-center">
              <h4 className="text-xs font-bold text-foreground">Creating Flashcards Deck</h4>
              <p className="text-[10px] text-muted-foreground mt-1">Extracting core facts and definitions from sources...</p>
            </div>
          </div>
        ) : activeDeck.length === 0 ? (
          /* EMPTY STATE (All caught up or No Cards) */
          <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Check className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">You are all caught up! 🎉</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {flashcards.length > 0 
                  ? "You have reviewed all due cards in this deck. Come back tomorrow or choose study all."
                  : "No flashcards generated for this notebook yet. Generate a deck to get started."}
              </p>
            </div>
            {flashcards.length > 0 && !studyAll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStudyAll(true);
                  setCurrentIdx(0);
                }}
                className="text-[11px] font-bold rounded-full h-8 border-border"
              >
                Study All Cards Anyway
              </Button>
            )}
          </div>
        ) : currentCard ? (
          /* ACTIVE FLASHCARD ENGINE WITH 3D FLIP */
          <div className="w-full max-w-md flex flex-col items-center space-y-8">
            
            {/* Card wrapper specifying perspective */}
            <div className="w-full h-64 [perspective:1000px] cursor-pointer" onClick={handleReveal}>
              <div 
                className={cn(
                  "w-full h-full relative transition-transform duration-500 [transform-style:preserve-3d]",
                  isFlipped && "[transform:rotateY(180deg)]"
                )}
              >
                {/* Front Side */}
                <div className="absolute inset-0 bg-card border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-level1 [backface-visibility:hidden]">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-accent">Question</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Card {currentIdx + 1} of {activeDeck.length}</span>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-sm font-bold text-foreground text-center leading-relaxed">
                      {currentCard.front}
                    </p>
                  </div>

                  <div className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest animate-pulse border-t border-border/20 pt-3">
                    Click card to reveal answer
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 bg-card border border-border/80 rounded-3xl p-6 flex flex-col justify-between shadow-level2 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-500">Explanation</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">Card {currentIdx + 1} of {activeDeck.length}</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center py-4">
                    <p className="text-xs font-semibold text-foreground text-center leading-relaxed">
                      {currentCard.back}
                    </p>
                  </div>

                  <div className="text-center text-[10px] text-emerald-500 font-bold uppercase tracking-widest border-t border-border/20 pt-3">
                    Grade your active recall
                  </div>
                </div>
              </div>
            </div>

            {/* Controls panel */}
            <div className="w-full flex justify-center min-h-[40px]">
              {!isFlipped ? (
                <Button
                  onClick={handleReveal}
                  className="text-xs h-9 px-6 bg-foreground text-background font-bold rounded-full cursor-pointer hover:bg-foreground/90 transition-all shadow-level1 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reveal Answer
                </Button>
              ) : (
                /* SM-2 grading buttons */
                <div className="w-full grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <button
                    onClick={() => handleRating(1)}
                    disabled={isReviewing}
                    className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all"
                  >
                    Again
                  </button>
                  <button
                    onClick={() => handleRating(2)}
                    disabled={isReviewing}
                    className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all"
                  >
                    Hard
                  </button>
                  <button
                    onClick={() => handleRating(3)}
                    disabled={isReviewing}
                    className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => handleRating(4)}
                    disabled={isReviewing}
                    className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 font-bold text-[10px] uppercase tracking-wider text-center cursor-pointer transition-all"
                  >
                    Easy
                  </button>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
