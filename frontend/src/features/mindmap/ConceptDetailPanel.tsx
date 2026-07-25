"use client";

import React, { useMemo } from "react";
import {
  ExternalLink,
  FileText,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Video,
  X,
  Sparkles,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  MindMap,
  MindMapEdge,
  MindMapNode,
} from "../../lib/notebook-types";

interface ConceptDetailPanelProps {
  node: MindMapNode;
  mindMap: MindMap;
  onClose: () => void;
  onSelectNode: (node: MindMapNode) => void;
  onViewSource: (node: MindMapNode) => void;
  onAskAboutConcept: (question: string) => void;
  className?: string;
}

interface ConnectionItem {
  node: MindMapNode;
  edge: MindMapEdge;
  direction: "incoming" | "outgoing";
}

function formatLocation(node: MindMapNode): string {
  if (node.sourceType === "youtube" || node.sourceType === "transcript") {
    const mins = Math.floor(node.sourceLocation / 60);
    const secs = Math.floor(node.sourceLocation % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  if (node.sourceType === "pdf") {
    return `Page ${node.sourceLocation || 1}`;
  }
  return node.sourceLocation ? `Loc ${node.sourceLocation}` : "Source";
}

function difficultyStyles(difficulty?: string) {
  switch (difficulty) {
    case "advanced":
      return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900";
    case "intermediate":
      return "bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900";
    default:
      return "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900";
  }
}

function groupConnections(node: MindMapNode, mindMap: MindMap) {
  const byId = new Map(mindMap.nodes.map((n) => [n.id, n]));
  const learnBefore: ConnectionItem[] = [];
  const buildsOn: ConnectionItem[] = [];
  const related: ConnectionItem[] = [];
  const contrasts: ConnectionItem[] = [];

  for (const edge of mindMap.edges) {
    const isIncoming = edge.target === node.id;
    const isOutgoing = edge.source === node.id;
    if (!isIncoming && !isOutgoing) continue;

    const otherId = isIncoming ? edge.source : edge.target;
    const other = byId.get(otherId);
    if (!other) continue;

    const item: ConnectionItem = {
      node: other,
      edge,
      direction: isIncoming ? "incoming" : "outgoing",
    };

    if (edge.type === "prerequisite") {
      if (isIncoming) learnBefore.push(item);
      else buildsOn.push(item);
    } else if (edge.type === "part_of" || edge.type === "example_of") {
      buildsOn.push(item);
    } else if (edge.type === "contrasts_with") {
      contrasts.push(item);
    } else {
      related.push(item);
    }
  }

  return { learnBefore, buildsOn, related, contrasts };
}

function ConnectionGroup({
  title,
  items,
  onSelectNode,
}: {
  title: string;
  items: ConnectionItem[];
  onSelectNode: (node: MindMapNode) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <h5 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </h5>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ node, edge }) => (
          <button
            key={`${edge.id}-${node.id}`}
            type="button"
            onClick={() => onSelectNode(node)}
            className="text-left px-2.5 py-2 rounded-[15px] border border-border bg-card hover:border-accent hover:bg-accent/5 transition-all cursor-pointer max-w-full sm:max-w-[220px]"
          >
            <span className="text-[11px] font-bold text-foreground block truncate">
              {node.label}
            </span>
            <span className="text-[9px] text-accent italic">
              {edge.label || edge.type}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ConceptDetailPanel({
  node,
  mindMap,
  onClose,
  onSelectNode,
  onViewSource,
  onAskAboutConcept,
  className,
}: ConceptDetailPanelProps) {
  const description = node.description?.trim() || node.summary;
  const keyPoints = node.keyPoints?.filter(Boolean) || [];
  const whyItMatters = node.whyItMatters?.trim();
  const relatedQuestions = node.relatedQuestions?.filter(Boolean) || [];
  const askQuestion =
    relatedQuestions[0] || `Explain "${node.label}" simply based on my sources`;

  const connections = useMemo(
    () => groupConnections(node, mindMap),
    [node, mindMap],
  );
  const hasConnections =
    connections.learnBefore.length +
      connections.buildsOn.length +
      connections.related.length +
      connections.contrasts.length >
    0;

  return (
    <aside
      className={cn(
        "flex flex-col bg-card border-border shadow-sm overflow-hidden",
        className,
      )}
      aria-label={`Concept details for ${node.label}`}
      role="dialog"
      aria-modal="true"
    >
      <header className="sticky top-0 z-20 flex-shrink-0 bg-card/95 backdrop-blur-sm supports-backdrop-filter:bg-card/90 border-b border-border">
        {/* Padding for right drawer top alignment */}
        <div className="pt-3.5" />

        <div className="px-4 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-bold text-foreground leading-snug pr-1">
              {node.label}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full",
                  difficultyStyles(node.difficulty),
                )}
              >
                {node.difficulty || "intro"}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[9px] font-bold bg-muted/50 text-muted-foreground border border-border px-2 py-0.5 rounded-full"
              >
                {node.sourceType}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close concept details"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-foreground/5 flex-shrink-0 cursor-pointer transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                What it is
              </h4>
              <p className="text-xs text-foreground leading-relaxed font-semibold">
                {description}
              </p>
            </section>

            {whyItMatters && (
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  Why it matters
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed bg-accent/5 border border-accent/20 rounded-[15px] px-3.5 py-2.5 font-medium">
                  {whyItMatters}
                </p>
              </section>
            )}

            {keyPoints.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  Key points
                </h4>
                <ul className="space-y-1.5">
                  {keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-foreground leading-relaxed flex gap-2 bg-card border border-border rounded-[15px] px-3.5 py-2 font-semibold"
                    >
                      <span className="text-accent font-bold shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {node.example?.trim() && (
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Example
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed italic border border-border rounded-[15px] px-3.5 py-2.5 bg-muted/20 font-medium">
                  {node.example}
                </p>
              </section>
            )}
          </div>

          <div className="space-y-4">
            {hasConnections && (
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Connected concepts
                </h4>
                <ConnectionGroup
                  title="Learn before"
                  items={connections.learnBefore}
                  onSelectNode={onSelectNode}
                />
                <ConnectionGroup
                  title="Builds on / part of"
                  items={connections.buildsOn}
                  onSelectNode={onSelectNode}
                />
                <ConnectionGroup
                  title="Related"
                  items={connections.related}
                  onSelectNode={onSelectNode}
                />
                <ConnectionGroup
                  title="Contrasts with"
                  items={connections.contrasts}
                  onSelectNode={onSelectNode}
                />
              </section>
            )}

            <section className="space-y-2">
              <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">
                Source
              </h4>
              <div className="flex items-center gap-2 text-[11px] bg-muted/20 p-3 rounded-[15px] border border-border">
                {node.sourceType === "youtube" ? (
                  <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground truncate">
                    {node.sourceName}
                  </p>
                  <p className="text-muted-foreground/60 text-[10px] mt-0.5 font-bold">
                    {node.sourceType.toUpperCase()} · {formatLocation(node)}
                  </p>
                </div>
              </div>
            </section>

            {relatedQuestions.length > 1 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-accent uppercase tracking-wider">
                  Suggested questions
                </h4>
                <div className="flex flex-col gap-1.5">
                  {relatedQuestions.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskAboutConcept(q)}
                      className="text-left text-[11px] text-muted-foreground hover:text-foreground bg-card border border-border hover:border-accent rounded-[15px] px-3.5 py-2 cursor-pointer transition-colors font-semibold"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border flex flex-col sm:flex-row gap-2 flex-shrink-0 bg-sidebar">
        <Button
          onClick={() => onViewSource(node)}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold cursor-pointer h-9 rounded-full"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          View Source
        </Button>
        <Button
          variant="outline"
          onClick={() => onAskAboutConcept(askQuestion)}
          className="flex-1 text-xs font-bold cursor-pointer h-9 border-accent text-accent hover:bg-accent/5 rounded-full"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
          Ask about this
        </Button>
      </div>
    </aside>
  );
}

export default ConceptDetailPanel;
