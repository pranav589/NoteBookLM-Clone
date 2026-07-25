"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MindMap, MindMapNode } from "../../lib/notebook-types";
import { formatLocation } from "./MindMapUtils";

interface MindMapTextViewProps {
  mindMap: MindMap;
  selectedNode: MindMapNode | null;
  setSelectedNode: (node: MindMapNode | null) => void;
}

export function MindMapTextView({
  mindMap,
  selectedNode,
  setSelectedNode,
}: MindMapTextViewProps) {
  return (
    <div
      role="region"
      aria-label="Mind map text view"
      className="flex-1 overflow-auto p-6"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <section>
          <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
            Concepts
          </h4>
          <ul className="space-y-3">
            {mindMap.nodes.map((node) => (
              <li
                key={node.id}
                className={cn(
                  "bg-card border rounded-[20px] p-4 shadow-xs transition-colors",
                  selectedNode?.id === node.id
                    ? "border-accent"
                    : "border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className="text-left w-full cursor-pointer"
                >
                  <span className="text-sm font-bold text-foreground">{node.label}</span>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-semibold">
                    {node.description || node.summary}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 font-bold">
                    Source: {node.sourceName} · {formatLocation(node)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-3">
            Relationships
          </h4>
          <ul className="space-y-2">
            {mindMap.edges.map((edge) => {
              const sourceLabel =
                mindMap.nodes.find((n) => n.id === edge.source)?.label || edge.source;
              const targetLabel =
                mindMap.nodes.find((n) => n.id === edge.target)?.label || edge.target;
              return (
                <li
                  key={edge.id}
                  className="text-xs text-muted-foreground bg-card border border-border rounded-[15px] px-3.5 py-2 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-foreground">{sourceLabel}</span>{" "}
                    <span className="text-accent italic font-semibold">{edge.label}</span>{" "}
                    <span className="font-bold text-foreground">{targetLabel}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[8px] bg-muted text-muted-foreground border-border rounded-full py-0 px-2"
                  >
                    {edge.type}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default MindMapTextView;
