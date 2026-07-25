"use client";

import React from "react";
import { Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MindMapEmptyProps {
  isGenerating: boolean;
  onGenerateMindMap: () => void;
  hasCompletedSources: boolean;
}

export function MindMapEmpty({
  isGenerating,
  onGenerateMindMap,
  hasCompletedSources,
}: MindMapEmptyProps) {
  return (
    <div className="flex-1 p-6 bg-background overflow-auto">
      <div className="max-w-md mx-auto text-center py-12 space-y-4">
        <div className="bg-accent/10 border border-accent/20 p-4 rounded-full w-fit mx-auto">
          <Network className="w-10 h-10 text-accent" />
        </div>
        <h3 className="text-base font-bold text-foreground">Interactive Concept Mind Map</h3>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto font-semibold">
          Visualize how concepts interconnect across your PDFs, videos, and documents as an
          interactive knowledge graph.
        </p>
        <Button
          disabled={isGenerating || !hasCompletedSources}
          onClick={onGenerateMindMap}
          aria-label="Generate mind map from notebook sources"
          title={
            !hasCompletedSources
              ? "Wait for source indexing to complete"
              : "Generate Mind Map"
          }
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2 px-6 cursor-pointer shadow-xs rounded-[20px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              Building graph...
            </>
          ) : (
            "Generate Mind Map"
          )}
        </Button>
        {!hasCompletedSources && (
          <p className="text-[10px] text-muted-foreground/60 font-semibold">
            Upload and wait for source indexing to complete first.
          </p>
        )}
      </div>
    </div>
  );
}

export default MindMapEmpty;
