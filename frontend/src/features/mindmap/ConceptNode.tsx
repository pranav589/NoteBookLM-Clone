"use client";

import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import type { SourceType } from "../../lib/notebook-types";
import { getNodeColor } from "./MindMapUtils";

interface ConceptNodeData {
  label: string;
  summary: string;
  sourceType: SourceType;
  sourceName: string;
  highlighted: boolean;
  selected: boolean;
}

export const ConceptNode = React.memo(function ConceptNode({
  data,
}: NodeProps<ConceptNodeData>) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Concept: ${data.label}. ${data.summary}. From ${data.sourceName}.`}
      className={cn(
        "px-4 py-3 rounded-[20px] border-2 shadow-xs transition-all duration-200 cursor-pointer min-w-[160px] max-w-[200px]",
        "hover:shadow-level1 hover:-translate-y-0.5",
        getNodeColor(data.sourceType),
        (data.selected || data.highlighted) &&
          "ring-2 ring-accent ring-offset-2 dark:ring-offset-stone-900 -translate-y-0.5 shadow-level1"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2 !border-0" />
      <div className="text-xs font-bold text-foreground leading-snug text-center line-clamp-2">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2 !border-0" />
    </div>
  );
});

export default ConceptNode;
