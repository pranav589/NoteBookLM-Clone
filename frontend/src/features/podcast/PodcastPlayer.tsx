import React from "react";
import { Headphones, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Podcast } from "../../lib/notebook-types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PodcastPlayerProps {
  podcast: Podcast | null;
  isGenerating: boolean;
  onGeneratePodcast: () => void;
  hasCompletedSources: boolean;
}

export function PodcastPlayer({
  podcast,
  isGenerating,
  onGeneratePodcast,
  hasCompletedSources,
}: PodcastPlayerProps) {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      {isGenerating ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-accent animate-spin" />
              <Skeleton className="h-5 w-48 bg-muted" />
            </div>
            <Skeleton className="h-3 w-80 bg-muted" />
          </div>
          
          {/* Audio Player Skeleton */}
          <div className="bg-card border border-border p-4 rounded-[20px] shadow-xs flex flex-col md:flex-row items-center gap-4 animate-pulse">
            <div className="p-3 bg-accent/10 border border-accent/20 text-accent rounded-xl shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex-1 w-full flex items-center gap-3">
              <Skeleton className="h-6 w-10 bg-muted rounded" />
              <div className="h-2 flex-1 bg-muted/50 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 left-0 bg-accent/30 w-1/3 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
              </div>
              <Skeleton className="h-6 w-10 bg-muted rounded" />
            </div>
          </div>

          {/* Dialogue Transcript Skeletons */}
          <div className="space-y-4.5">
            {/* Host A (Andrew) Loader */}
            <div className="flex gap-3.5 items-start flex-row mr-12 animate-pulse">
              <div className="shrink-0">
                <div className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-[10px] font-bold border bg-accent/10 border-accent/20 text-accent shadow-xs">
                  AN
                </div>
              </div>
              <div className="p-4.5 rounded-[20px] border bg-card border-border rounded-tl-none flex-1 space-y-2 shadow-xs">
                <span className="text-[9px] uppercase font-bold tracking-wider block text-accent mb-1.5">
                  Andrew (Host A)
                </span>
                <Skeleton className="h-3 w-5/6 bg-muted" />
                <Skeleton className="h-3 w-2/3 bg-muted" />
              </div>
            </div>

            {/* Host B (Emma) Loader */}
            <div className="flex gap-3.5 items-start flex-row-reverse ml-12 animate-pulse">
              <div className="shrink-0">
                <div className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-[10px] font-bold border bg-muted border-border text-muted-foreground shadow-xs">
                  EM
                </div>
              </div>
              <div className="p-4.5 rounded-[20px] border bg-accent/5 dark:bg-accent/10 border-accent/20 rounded-tr-none flex-1 space-y-2 shadow-xs">
                <span className="text-[9px] uppercase font-bold tracking-wider block text-accent mb-1.5">
                  Emma (Host B)
                </span>
                <Skeleton className="h-3 w-3/4 bg-muted" />
                <Skeleton className="h-3 w-1/2 bg-muted" />
              </div>
            </div>
          </div>
        </div>
      ) : !podcast ? (
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="bg-accent/10 border border-accent/20 p-4 rounded-full w-fit mx-auto">
            <Headphones className="w-10 h-10 text-accent" />
          </div>
          <h3 className="text-base font-bold text-foreground">Interactive AI Podcast Talk Show</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto font-semibold">
            Generate a synthetic talk-show conversation between two hosts (Andrew and Emma) reviewing your workspace documents. Utilises human-like speech.
          </p>
          <Button
            disabled={isGenerating || !hasCompletedSources}
            onClick={onGeneratePodcast}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2 px-6 cursor-pointer shadow-xs rounded-[20px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Compiling host dialogue...
              </>
            ) : (
              "Generate Audio Podcast"
            )}
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Headphones className="w-5 h-5 text-accent" />
                Workspace Talk Show
              </h3>
              <p className="text-xs text-muted-foreground/60 mt-1 font-semibold">
                Dialogue script audio and transcription between Andrew and Emma
              </p>
            </div>
            <Button
              disabled={isGenerating || !hasCompletedSources}
              onClick={onGeneratePodcast}
              variant="outline"
              className="text-[10px] h-7.5 px-3 border-accent/30 text-accent hover:bg-accent/5 shrink-0 font-bold uppercase tracking-wider rounded-full cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                "Regenerate Audio"
              )}
            </Button>
          </div>

          {/* HTML Audio Player */}
          <div className="bg-card border border-border p-4 rounded-[20px] shadow-xs flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-accent/10 border border-accent/20 text-accent rounded-xl shrink-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 w-full">
              <audio src={`${backendBaseUrl}${podcast.audioUrl}`} controls className="w-full" />
            </div>
          </div>

          {/* Dialogue Transcript */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              Dialogue Script Transcript
            </h4>
            <div className="space-y-4.5">
              {podcast.script.map((line, idx) => {
                const isHostA = line.speaker === "Host A";
                return (
                  <div
                    key={idx}
                    className={`flex gap-3.5 items-start ${
                      isHostA ? "flex-row mr-12" : "flex-row-reverse ml-12"
                    }`}
                  >
                    {/* Speaker Initials Badge */}
                    <div className="shrink-0">
                      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                        isHostA
                          ? "bg-accent/15 border-accent/30 text-accent shadow-xs"
                          : "bg-muted border-border text-muted-foreground shadow-xs"
                      }`}>
                        {isHostA ? "AN" : "EM"}
                      </div>
                    </div>

                    {/* Speech box */}
                    <div
                      className={`p-4.5 rounded-[20px] border text-xs leading-relaxed flex-1 shadow-xs transition-all duration-200 hover:shadow-level1 ${
                        isHostA
                          ? "bg-card border-border rounded-tl-none text-foreground"
                          : "bg-accent/5 dark:bg-accent/10 border-accent/20 rounded-tr-none text-foreground"
                      }`}
                    >
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider block mb-1.5 ${
                          isHostA ? "text-accent" : "text-muted-foreground"
                        }`}
                      >
                        {isHostA ? "Andrew (Host A)" : "Emma (Host B)"}
                      </span>
                      <p className="font-semibold text-foreground/90">{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PodcastPlayer;
