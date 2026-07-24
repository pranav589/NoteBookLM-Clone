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
      return "bg-red-50 text-red-700 border-red-200";
    case "intermediate":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
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
      <h5 className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
        {title}
      </h5>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ node, edge }) => (
          <button
            key={`${edge.id}-${node.id}`}
            type="button"
            onClick={() => onSelectNode(node)}
            className="text-left px-2.5 py-2 rounded-xl border border-border/80 bg-white hover:border-amber-400 hover:bg-amber-50/40 transition-all cursor-pointer max-w-full sm:max-w-[220px]"
          >
            <span className="text-[11px] font-bold text-stone-800 block truncate">
              {node.label}
            </span>
            <span className="text-[9px] text-amber-700 italic">
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
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-300" aria-hidden />
        </div>

        <div className="px-4 pb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-bold text-stone-850 leading-snug pr-1">
              {node.label}
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wide border px-2 py-0.5",
                  difficultyStyles(node.difficulty),
                )}
              >
                {node.difficulty || "intro"}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[9px] font-bold uppercase bg-stone-50 text-stone-600 border border-stone-200 px-2 py-0.5"
              >
                {node.sourceType}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close concept details"
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 flex-shrink-0 cursor-pointer transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <section className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                What it is
              </h4>
              <p className="text-xs text-stone-700 leading-relaxed font-medium">
                {description}
              </p>
            </section>

            {whyItMatters && (
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Why it matters
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed bg-amber-50/50 border border-amber-100 rounded-xl px-3 py-2.5">
                  {whyItMatters}
                </p>
              </section>
            )}

            {keyPoints.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5" />
                  Key points
                </h4>
                <ul className="space-y-1.5">
                  {keyPoints.map((point, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-stone-700 leading-relaxed flex gap-2 bg-white border border-border/70 rounded-xl px-3 py-2"
                    >
                      <span className="text-amber-600 font-bold shrink-0">
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
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Example
                </h4>
                <p className="text-xs text-stone-600 leading-relaxed italic border border-border/80 rounded-xl px-3 py-2.5 bg-stone-50/60">
                  {node.example}
                </p>
              </section>
            )}
          </div>

          <div className="space-y-4">
            {hasConnections && (
              <section className="space-y-3">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
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
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                Source
              </h4>
              <div className="flex items-center gap-2 text-[11px] bg-stone-50 p-3 rounded-xl border border-border/75">
                {node.sourceType === "youtube" ? (
                  <Video className="w-3.5 h-3.5 text-red-500 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-700 truncate">
                    {node.sourceName}
                  </p>
                  <p className="text-stone-450 text-[10px] mt-0.5">
                    {node.sourceType.toUpperCase()} · {formatLocation(node)}
                  </p>
                </div>
              </div>
            </section>

            {relatedQuestions.length > 1 && (
              <section className="space-y-2">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  Suggested questions
                </h4>
                <div className="flex flex-col gap-1.5">
                  {relatedQuestions.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onAskAboutConcept(q)}
                      className="text-left text-[11px] text-stone-600 hover:text-amber-800 bg-white border border-border/80 hover:border-amber-300 rounded-xl px-2.5 py-2 cursor-pointer transition-colors"
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

      <div className="p-3 border-t border-border flex flex-col sm:flex-row gap-2 flex-shrink-0 bg-stone-50/40">
        <Button
          onClick={() => onViewSource(node)}
          className="flex-1 bg-primary hover:bg-primary/95 text-white text-xs font-bold cursor-pointer h-9"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
          View Source
        </Button>
        <Button
          variant="outline"
          onClick={() => onAskAboutConcept(askQuestion)}
          className="flex-1 text-xs font-bold cursor-pointer h-9 border-amber-250 text-amber-800 hover:bg-amber-50"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
          Ask about this
        </Button>
      </div>
    </aside>
  );
}

export default ConceptDetailPanel;
