import React from "react";
import { Compass, Loader2, MapPin, Video, FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex-1 overflow-y-auto p-6 bg-background">
      {isGenerating ? (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-accent animate-spin" />
              <Skeleton className="h-5 w-48 bg-muted" />
            </div>
            <Skeleton className="h-3 w-80 bg-muted" />
          </div>
          <div className="relative border-l-2 border-border ml-4 pl-6 space-y-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="relative p-5 border border-border bg-card rounded-[20px] space-y-4"
              >
                {/* Glowing Node Dot */}
                <div className="absolute -left-[32px] top-4.5 bg-muted border-2 border-border rounded-full w-5 h-5 ring-4 ring-stone-200/30 dark:ring-stone-800/30 animate-pulse" />

                {/* Top Row: Concept & Step Badge */}
                <div className="flex justify-between items-start gap-4">
                  <Skeleton className="h-4.5 w-1/3 bg-muted" />
                  <Skeleton className="h-5 w-16 bg-muted rounded-full" />
                </div>

                {/* Description paragraphs */}
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-5/6 bg-muted" />
                  <Skeleton className="h-3 w-2/3 bg-muted" />
                </div>

                {/* Reason/Key Context */}
                <div className="mt-3.5 border-t border-border pt-2.5 space-y-1.5">
                  <Skeleton className="h-3.5 w-24 bg-muted" />
                  <Skeleton className="h-3.5 w-5/6 bg-muted" />
                </div>

                {/* Target Source Link Shape */}
                <div className="mt-4 flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 w-1/2">
                    <Skeleton className="h-3.5 w-3.5 rounded bg-muted" />
                    <Skeleton className="h-3 w-32 bg-muted" />
                  </div>
                  <Skeleton className="h-3.5 w-20 bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !roadmap ? (
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="bg-accent/10 border border-accent/20 p-4 rounded-full w-fit mx-auto">
            <Compass className="w-10 h-10 text-accent" />
          </div>
          <h3 className="text-base font-bold text-foreground">Concept Study Path</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto font-semibold">
            Synthesize learning checkpoints out of your indexed YouTube video transcriptions, Web documentation, and PDF manuals.
          </p>
          <Button
            disabled={isGenerating || !hasCompletedSources}
            onClick={onGenerateRoadmap}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2 px-6 cursor-pointer shadow-xs rounded-[20px]"
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
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Compass className="w-5 h-5 text-accent" />
                {roadmap.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-semibold">{roadmap.description}</p>
            </div>
            <Button
              disabled={isGenerating || !hasCompletedSources}
              onClick={onGenerateRoadmap}
              variant="outline"
              className="text-[10px] h-7.5 px-3 border-accent/30 text-accent hover:bg-accent/5 shrink-0 font-bold uppercase tracking-wider rounded-full cursor-pointer"
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
          <div className="relative border-l-2 border-accent/20 ml-4 pl-6 space-y-6">
            {roadmap.nodes.map((node, idx) => (
              <div
                key={node.id}
                onClick={() => onRoadmapNodeClick(node)}
                className="relative bg-card hover:bg-white dark:hover:bg-stone-850 border border-border hover:border-accent p-5 rounded-[20px] cursor-pointer transition-all duration-250 shadow-xs hover:shadow-level1 hover:-translate-y-0.5 group animate-in fade-in duration-200"
              >
                {/* Glowing Node Dot */}
                <div className="absolute -left-[32px] top-4.5 bg-white dark:bg-stone-900 border-2 border-accent rounded-full w-5 h-5 flex items-center justify-center ring-4 ring-accent/15 group-hover:bg-accent transition-all duration-300">
                  <span className="text-[9px] font-bold text-accent group-hover:text-white">
                    {idx + 1}
                  </span>
                </div>

                <div className="flex justify-between items-start gap-4">
                  <h4 className="text-xs md:text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-200">
                    {node.concept}
                  </h4>
                  <Badge variant="secondary" className="text-[9px] font-bold bg-accent/10 dark:bg-accent/20 text-accent border border-accent/20 py-0.5 px-2.5 rounded-full shadow-xs">
                    <MapPin className="w-2.5 h-2.5 mr-1" />
                    Step {idx + 1}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed font-semibold">
                  {node.description}
                </p>

                {/* Reason/Prerequisite */}
                <p className="text-[10.5px] text-muted-foreground/80 italic mt-3.5 border-t border-border pt-2.5 leading-relaxed font-medium">
                  <span className="font-bold text-muted-foreground not-italic uppercase tracking-wide text-[9px] mr-1">Key Context:</span>
                  {node.reason}
                </p>

                {/* Target Source Link */}
                <div className="mt-4 flex items-center justify-between text-[10px] bg-muted/20 dark:bg-stone-850/50 p-3 rounded-[15px] border border-border">
                  <div className="flex items-center gap-2 truncate max-w-[240px]">
                    {node.sourceType === "youtube" ? (
                      <Video className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-accent" />
                    )}
                    <span className="truncate font-bold text-muted-foreground text-[10px]">
                      {node.sourceName}
                    </span>
                  </div>
                  <span className="text-accent flex items-center gap-1 text-[9px] font-bold uppercase group-hover:underline">
                    <Play className="w-2.5 h-2.5 fill-accent/10" />
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
    </div>
  );
}
export default RoadmapView;
