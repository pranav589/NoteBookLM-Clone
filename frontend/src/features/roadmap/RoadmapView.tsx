import React from "react";
import { Compass, Loader2, MapPin, Video, FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Roadmap, RoadmapNode } from "../../lib/notebook-types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface RoadmapViewProps {
  roadmap: Roadmap | null;
  isGenerating: boolean;
  onGenerateRoadmap: () => void;
  onRoadmapNodeClick: (node: RoadmapNode) => void;
  hasCompletedSources: boolean;
}

export function RoadmapView({
  roadmap,
  isGenerating,
  onGenerateRoadmap,
  onRoadmapNodeClick,
  hasCompletedSources,
}: RoadmapViewProps) {
  return (
    <ScrollArea className="flex-1 p-6 bg-[#FCFAF6]/40">
      {isGenerating ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-500 animate-spin" />
              <Skeleton className="h-5 w-48 bg-stone-200/70" />
            </div>
            <Skeleton className="h-3 w-80 bg-stone-200/70" />
          </div>
          <div className="relative border-l-2 border-stone-200 ml-4 pl-6 space-y-6.5">
            <div className="relative p-5 border border-border/60 bg-white/50 rounded-2xl space-y-3">
              <div className="absolute -left-[32px] top-4.5 bg-stone-200 rounded-full w-5 h-5 animate-pulse" />
              <Skeleton className="h-4.5 w-1/3 bg-stone-200/70" />
              <Skeleton className="h-3 w-5/6 bg-stone-200/70" />
              <Skeleton className="h-3 w-2/3 bg-stone-200/70" />
            </div>
            <div className="relative p-5 border border-border/60 bg-white/50 rounded-2xl space-y-3">
              <div className="absolute -left-[32px] top-4.5 bg-stone-200 rounded-full w-5 h-5 animate-pulse" />
              <Skeleton className="h-4.5 w-1/4 bg-stone-200/70" />
              <Skeleton className="h-3 w-3/4 bg-stone-200/70" />
              <Skeleton className="h-3 w-1/2 bg-stone-200/70" />
            </div>
          </div>
        </div>
      ) : !roadmap ? (
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="bg-amber-100/50 border border-amber-200/60 p-4 rounded-full w-fit mx-auto">
            <Compass className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-base font-bold text-stone-850">Personalized Concept Study Path</h3>
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
            Synthesize learning checkpoints out of your indexed YouTube video transcriptions, Web documentation, and PDF manuals.
          </p>
          <Button
            disabled={isGenerating || !hasCompletedSources}
            onClick={onGenerateRoadmap}
            className="bg-primary hover:bg-primary/95 text-white font-medium text-xs py-2 px-6 cursor-pointer shadow-sm rounded-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                Structuring concepts...
              </>
            ) : (
              "Generate Concept Roadmap"
            )}
          </Button>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-850 flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" />
                {roadmap.title}
              </h3>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed font-medium">{roadmap.description}</p>
            </div>
            <Button
              disabled={isGenerating || !hasCompletedSources}
              onClick={onGenerateRoadmap}
              variant="outline"
              className="text-[10px] h-7.5 px-3 border-amber-250 text-amber-800 hover:bg-amber-50 shrink-0 font-bold uppercase tracking-wider cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>

          {/* Interactive Timeline Nodes */}
          <div className="relative border-l-2 border-amber-200 ml-4 pl-6 space-y-6.5">
            {roadmap.nodes.map((node, idx) => (
              <div
                key={node.id}
                onClick={() => onRoadmapNodeClick(node)}
                className="relative bg-card hover:bg-white border border-border/80 hover:border-amber-450 p-5 rounded-2xl cursor-pointer transition-all duration-300 shadow-premium hover:shadow-hover hover:-translate-y-0.5 group"
              >
                {/* Glowing Node Dot */}
                <div className="absolute -left-[32px] top-4.5 bg-white border-2 border-primary rounded-full w-5 h-5 flex items-center justify-center ring-4 ring-amber-100 group-hover:bg-primary transition-all duration-300">
                  <span className="text-[9px] font-bold text-primary group-hover:text-white">
                    {idx + 1}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-xs md:text-sm font-bold text-stone-850 group-hover:text-primary transition-colors duration-200">
                    {node.concept}
                  </h4>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50 shrink-0 shadow-sm py-0.5 px-2">
                    <MapPin className="w-2.5 h-2.5 mr-1" />
                    Step {idx + 1}
                  </Badge>
                </div>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed font-semibold">
                  {node.description}
                </p>

                {/* Reason/Prerequisite */}
                <p className="text-[10.5px] text-stone-450 italic mt-3.5 border-t border-stone-100 pt-2.5 leading-relaxed font-medium">
                  <span className="font-bold text-stone-500 not-italic uppercase tracking-wide text-[9px] mr-1">Key Context:</span>
                  {node.reason}
                </p>

                {/* Target Source Link */}
                <div className="mt-4 flex items-center justify-between text-[10px] bg-stone-50/50 p-3 rounded-xl border border-border/75">
                  <div className="flex items-center gap-2 truncate max-w-[240px]">
                    {node.sourceType === "youtube" ? (
                      <Video className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span className="truncate font-bold text-stone-500 text-[10px]">
                      {node.sourceName}
                    </span>
                  </div>
                  <span className="text-primary flex items-center gap-1 text-[9px] font-bold uppercase group-hover:underline">
                    <Play className="w-2.5 h-2.5 fill-primary/10" />
                    {node.sourceType === "youtube"
                      ? `Watch @ ${new Date(node.timestamp * 1000)
                          .toISOString()
                          .substr(14, 5)}`
                      : "View Document Context"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ScrollArea>
  );
}
export default RoadmapView;
