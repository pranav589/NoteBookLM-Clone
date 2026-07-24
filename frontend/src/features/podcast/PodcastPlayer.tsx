import React from "react";
import { Headphones, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <ScrollArea className="flex-1 p-6 bg-[#FCFAF6]/40">
      {isGenerating ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-500 animate-spin" />
              <Skeleton className="h-5 w-48 bg-stone-200/70" />
            </div>
            <Skeleton className="h-3 w-80 bg-stone-200/70" />
          </div>
          
          <div className="bg-card border border-border/60 p-4 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-stone-200 animate-pulse shrink-0" />
            <Skeleton className="h-6 w-full bg-stone-200/70" />
          </div>

          <div className="space-y-4.5">
            <div className="flex gap-3.5 items-start flex-row mr-12">
              <div className="w-8.5 h-8.5 rounded-full bg-stone-200 animate-pulse shrink-0" />
              <div className="p-4.5 rounded-2xl bg-white border border-border/80 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/4 bg-stone-200/70" />
                <Skeleton className="h-3 w-5/6 bg-stone-200/70" />
              </div>
            </div>
            <div className="flex gap-3.5 items-start flex-row-reverse ml-12">
              <div className="w-8.5 h-8.5 rounded-full bg-stone-200 animate-pulse shrink-0" />
              <div className="p-4.5 rounded-2xl bg-white border border-border/80 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/4 bg-stone-200/70" />
                <Skeleton className="h-3 w-3/4 bg-stone-200/70" />
              </div>
            </div>
          </div>
        </div>
      ) : !podcast ? (
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="bg-amber-100/50 border border-amber-200/60 p-4 rounded-full w-fit mx-auto">
            <Headphones className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-base font-bold text-stone-850">Interactive AI Podcast Talk Show</h3>
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
            Generate a synthetic talk-show conversation between two hosts (Andrew and Emma) reviewing your workspace documents. Utilises human-like speech.
          </p>
          <Button
            disabled={isGenerating || !hasCompletedSources}
            onClick={onGeneratePodcast}
            className="bg-primary hover:bg-primary/95 text-white font-medium text-xs py-2 px-6 cursor-pointer shadow-sm rounded-lg"
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
              <h3 className="text-base font-bold text-stone-850 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                Workspace Talk Show
              </h3>
              <p className="text-xs text-stone-400 mt-1 font-medium">
                Dialogue script audio and transcription between Andrew and Emma
              </p>
            </div>
            <Button
              disabled={isGenerating || !hasCompletedSources}
              onClick={onGeneratePodcast}
              variant="outline"
              className="text-[10px] h-7.5 px-3 border-amber-250 text-amber-800 hover:bg-amber-50 shrink-0 font-bold uppercase tracking-wider cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                "Regenerate Audio"
              )}
            </Button>
          </div>

          {/* HTML Audio Player */}
          <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="p-3 bg-amber-50 border border-amber-200/60 text-primary rounded-xl shrink-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 w-full">
              <audio src={`${backendBaseUrl}${podcast.audioUrl}`} controls className="w-full" />
            </div>
          </div>

          {/* Dialogue Transcript */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
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
                          ? "bg-amber-100 border-amber-250 text-amber-700 shadow-sm"
                          : "bg-stone-100 border-stone-250 text-stone-700 shadow-sm"
                      }`}>
                        {isHostA ? "AN" : "EM"}
                      </div>
                    </div>

                    {/* Speech box */}
                    <div
                      className={`p-4.5 rounded-2xl border text-xs leading-relaxed flex-1 shadow-premium transition-all duration-200 hover:shadow-hover ${
                        isHostA
                          ? "bg-white border-border rounded-tl-none text-stone-850"
                          : "bg-amber-50/45 border-amber-200/40 rounded-tr-none text-stone-900"
                      }`}
                    >
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider block mb-1.5 ${
                          isHostA ? "text-amber-800" : "text-amber-600"
                        }`}
                      >
                        {isHostA ? "Andrew (Host A)" : "Emma (Host B)"}
                      </span>
                      <p className="font-semibold text-stone-750">{line.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ScrollArea>
  );
}
export default PodcastPlayer;
