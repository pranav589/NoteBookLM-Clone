"use client";

import React from "react";
import { Sparkles, Compass, Network, Headphones, BookOpen, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotebookWorkspace } from "./NotebookWorkspaceContext";

export function StudyStudio() {
  const {
    activeSubTab,
    handleTabChange,
    roadmap,
    mindMap,
    podcast,
    isGeneratingRoadmap,
    isGeneratingMindMap,
    isGeneratingPodcast,
    hasCompletedSources,
    handleGenerateRoadmap,
    handleGenerateMindMap,
    handleGeneratePodcast,
  } = useNotebookWorkspace();

  const isRoadmapReady = !!roadmap;
  const isMindMapReady = !!mindMap;
  const isPodcastReady = !!podcast;

  return (
    <aside className="w-80 border-l border-border bg-sidebar flex flex-col shrink-0">
      <div className="border-b border-border bg-sidebar px-4 py-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
            Study Studio
          </h2>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
            AI Cognitive Assets
          </p>
        </div>
        <Badge variant="outline" className="bg-card border-border text-foreground text-[9px] font-bold py-0.5 px-1.5 rounded-full">
          5 Tools
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Concept Roadmap */}
          <div
            onClick={() => handleTabChange("roadmap")}
            className={cn(
              "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
              activeSubTab === "roadmap"
                ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                : "border-border hover:border-foreground/20 hover:shadow-xs"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />

            <div className="space-y-2 pl-1">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                {isGeneratingRoadmap ? (
                  <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                ) : isRoadmapReady ? (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                )}
              </div>

              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                  Roadmap
                </h4>
                <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                  Timeline guide of key concepts.
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
              <Button
                size="sm"
                disabled={isGeneratingRoadmap || !hasCompletedSources}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleGenerateRoadmap();
                }}
                className="text-[8px] h-5.5 px-2 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
              >
                {isRoadmapReady ? "Re-Gen" : "Create"}
              </Button>

              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          {/* Card 2: Interactive Mind Map */}
          <div
            onClick={() => handleTabChange("mindmap")}
            className={cn(
              "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
              activeSubTab === "mindmap"
                ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                : "border-border hover:border-foreground/20 hover:shadow-xs"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />

            <div className="space-y-2 pl-1">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                  <Network className="w-3.5 h-3.5" />
                </div>
                {isGeneratingMindMap ? (
                  <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                ) : isMindMapReady ? (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                )}
              </div>

              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                  Mind Map
                </h4>
                <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                  Interconnect concepts in a graph.
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
              <Button
                size="sm"
                disabled={isGeneratingMindMap || !hasCompletedSources}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleGenerateMindMap();
                }}
                className="text-[8px] h-5.5 px-2 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
              >
                {isMindMapReady ? "Re-Gen" : "Create"}
              </Button>

              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          {/* Card 3: Audio Podcast */}
          <div
            onClick={() => handleTabChange("podcast")}
            className={cn(
              "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
              activeSubTab === "podcast"
                ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                : "border-border hover:border-foreground/20 hover:shadow-xs"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />

            <div className="space-y-2 pl-1">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                {isGeneratingPodcast ? (
                  <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                ) : isPodcastReady ? (
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                ) : (
                  <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                )}
              </div>

              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                  Podcast
                </h4>
                <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                  Synthetic dialogue show.
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
              <Button
                size="sm"
                disabled={isGeneratingPodcast || !hasCompletedSources}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleGeneratePodcast();
                }}
                className="text-[8px] h-5.5 px-2 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
              >
                {isPodcastReady ? "Re-Gen" : "Create"}
              </Button>

              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          {/* Card 4: Quizzes */}
          <div
            onClick={() => handleTabChange("quiz")}
            className={cn(
              "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
              activeSubTab === "quiz"
                ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                : "border-border hover:border-foreground/20 hover:shadow-xs"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />

            <div className="space-y-2 pl-1">
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                  <HelpCircle className="w-3.5 h-3.5" />
                </div>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
              </div>

              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                  Quizzes
                </h4>
                <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                  Test your understanding of concepts.
                </p>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
              <span className="text-[8px] py-1 px-2.5 bg-foreground text-background font-bold uppercase tracking-wider rounded-full">
                Practice
              </span>

              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

          {/* Card 5: Flashcards (col-span-2) */}
          <div
            onClick={() => handleTabChange("flashcard")}
            className={cn(
              "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer col-span-2 flex flex-col justify-between min-h-[130px]",
              activeSubTab === "flashcard"
                ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                : "border-border hover:border-foreground/20 hover:shadow-xs"
            )}
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />

            <div className="space-y-2 pl-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors">
                    Flashcards
                  </h4>
                </div>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
              </div>

              <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                Study with custom spaced repetition (SM-2) cards to maximize memory retention.
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1.5">
              <span className="text-[8px] py-1 px-2.5 bg-foreground text-background font-bold uppercase tracking-wider rounded-full">
                Memorize
              </span>

              <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                Open <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </div>

        </div>
      </ScrollArea>
    </aside>
  );
}
