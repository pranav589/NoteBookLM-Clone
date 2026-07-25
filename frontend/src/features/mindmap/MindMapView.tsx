"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "reactflow";
import dagre from "dagre";
import { createPortal } from "react-dom";
import {
  Loader2,
  Network,
  List,
  GitBranch,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MindMap, MindMapNode, SourceType } from "../../lib/notebook-types";
import { ConceptDetailPanel } from "./ConceptDetailPanel";

interface MindMapViewProps {
  mindMap: MindMap | null;
  isGenerating: boolean;
  onGenerateMindMap: () => void;
  onNodeClick: (node: MindMapNode) => void;
  onAskAboutConcept: (question: string) => void;
  hasCompletedSources: boolean;
}

interface ConceptNodeData {
  label: string;
  summary: string;
  sourceType: SourceType;
  sourceName: string;
  highlighted: boolean;
  selected: boolean;
}

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

function getNodeColor(sourceType: SourceType) {
  switch (sourceType) {
    case "youtube":
      return "border-red-400 dark:border-red-900 bg-red-50/90 dark:bg-red-950/20 text-foreground hover:border-red-500";
    case "pdf":
      return "border-amber-400 dark:border-amber-900 bg-amber-50/90 dark:bg-amber-950/20 text-foreground hover:border-accent";
    default:
      return "border-blue-400 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/20 text-foreground hover:border-blue-500";
  }
}

const ConceptNode = React.memo(function ConceptNode({
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

const nodeTypes: NodeTypes = { concept: ConceptNode };

function shouldUseHierarchical(mindMap: MindMap): boolean {
  if (mindMap.nodes.length <= 10) return true;
  const hierarchicalTypes = new Set(["prerequisite", "part_of"]);
  const hierarchicalCount = mindMap.edges.filter((e) => hierarchicalTypes.has(e.type)).length;
  return hierarchicalCount >= mindMap.edges.length / 2;
}

function getHierarchicalLayout(nodes: Node[], edges: Edge[], direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

function getForceLayout(nodes: Node[]) {
  const count = nodes.length;
  const radius = Math.max(220, count * 28);
  const cx = 400;
  const cy = 300;

  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      ...node,
      position: {
        x: cx + radius * Math.cos(angle) - NODE_WIDTH / 2,
        y: cy + radius * Math.sin(angle) - NODE_HEIGHT / 2,
      },
    };
  });
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

export function MindMapView({
  mindMap,
  isGenerating,
  onGenerateMindMap,
  onNodeClick,
  onAskAboutConcept,
  hasCompletedSources,
}: MindMapViewProps) {
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showTextView, setShowTextView] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== "undefined") {
      setIsDark(document.documentElement.classList.contains("dark"));
      const observer = new MutationObserver(() => {
        setIsDark(document.documentElement.classList.contains("dark"));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => observer.disconnect();
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedNode) {
        setSelectedNode(null);
        return;
      }
      if (isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNode, isFullscreen]);

  // Clear selection when mind map is regenerated/cleared
  useEffect(() => {
    if (!mindMap) {
      setSelectedNode(null);
      return;
    }
    if (selectedNode && !mindMap.nodes.some((n) => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [mindMap, selectedNode]);

  const connectedIds = useMemo(() => {
    if (!mindMap || !hoveredNodeId) return new Set<string>();
    const ids = new Set<string>([hoveredNodeId]);
    mindMap.edges.forEach((edge) => {
      if (edge.source === hoveredNodeId) ids.add(edge.target);
      if (edge.target === hoveredNodeId) ids.add(edge.source);
    });
    return ids;
  }, [mindMap, hoveredNodeId]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!mindMap) return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };

    const selectedId = selectedNode?.id;

    const baseNodes: Node<ConceptNodeData>[] = mindMap.nodes.map((n) => ({
      id: n.id,
      type: "concept",
      position: { x: 0, y: 0 },
      selected: n.id === selectedId,
      data: {
        label: n.label,
        summary: n.summary,
        sourceType: n.sourceType,
        sourceName: n.sourceName,
        highlighted: connectedIds.has(n.id),
        selected: n.id === selectedId,
      },
    }));

    const baseEdges: Edge[] = mindMap.edges.map((e) => {
      const isConnected =
        !hoveredNodeId || e.source === hoveredNodeId || e.target === hoveredNodeId;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: "smoothstep",
        animated: hoveredNodeId ? isConnected : false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isConnected ? "#CF4500" : (isDark ? "rgba(243, 240, 238, 0.28)" : "#d1cdc7"),
        },
        style: {
          stroke: isConnected ? "#CF4500" : (isDark ? "rgba(243, 240, 238, 0.18)" : "#e7e5e4"),
          strokeWidth: isConnected ? 2 : 1,
          opacity: hoveredNodeId && !isConnected ? 0.25 : 1,
        },
        labelStyle: {
          fill: isDark ? "#A19E9A" : "#78716c",
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: { fill: isDark ? "#20201f" : "#fffbeb", fillOpacity: 0.9 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    const layouted = shouldUseHierarchical(mindMap)
      ? getHierarchicalLayout(baseNodes, baseEdges)
      : getForceLayout(baseNodes);

    return { flowNodes: layouted, flowEdges: baseEdges };
  }, [mindMap, hoveredNodeId, connectedIds, selectedNode?.id, isDark]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const data = mindMap?.nodes.find((n) => n.id === node.id);
      if (data) setSelectedNode(data);
    },
    [mindMap]
  );

  const handleSelectConnected = useCallback((node: MindMapNode) => {
    setSelectedNode(node);
  }, []);

  const handleViewSource = useCallback(
    (node: MindMapNode) => {
      setIsFullscreen(false);
      onNodeClick(node);
    },
    [onNodeClick]
  );

  const handleAskAboutConcept = useCallback(
    (question: string) => {
      setIsFullscreen(false);
      onAskAboutConcept(question);
    },
    [onAskAboutConcept]
  );

  if (isGenerating) {
    return (
      <div className="flex-1 p-6 bg-background overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-accent animate-pulse" />
              <Skeleton className="h-5 w-52 bg-muted" />
            </div>
            <Skeleton className="h-3 w-80 bg-muted" />
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              Extracting concepts and relationships with AI...
            </p>
          </div>

          {/* Interactive ReactFlow Simulation Viewport */}
          <div
            className="relative w-full h-[380px] rounded-[20px] border border-border bg-card overflow-hidden shadow-xs"
            style={{
              backgroundImage: isDark
                ? "radial-gradient(#2e2e2e 1.5px, transparent 1.5px)"
                : "radial-gradient(#e7e5e4 1.5px, transparent 1.5px)",
              backgroundSize: "16px 16px",
            }}
          >
            {/* SVG Connecting Edges */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 2 L 10 5 L 0 8 z" fill="#CF4500" />
                </marker>
              </defs>
              {/* Dotted paths simulating animated edges */}
              <path
                d="M 400 128 L 400 194 L 220 194 L 220 260"
                stroke="#CF4500"
                strokeWidth="2"
                strokeDasharray="4 4"
                fill="none"
                markerEnd="url(#arrow)"
                className="opacity-70"
              />
              <path
                d="M 400 128 L 400 194 L 580 194 L 580 260"
                stroke="#CF4500"
                strokeWidth="2"
                strokeDasharray="4 4"
                fill="none"
                markerEnd="url(#arrow)"
                className="opacity-70"
              />
            </svg>

            {/* Parent Concept Node Skeleton */}
            <div className="absolute left-[calc(50%-80px)] top-[60px] w-[160px] h-[68px] bg-blue-500/10 dark:bg-blue-950/20 border-2 border-blue-300 dark:border-blue-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
              {/* Node handles */}
              <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
              <Skeleton className="h-3.5 w-5/6 bg-muted-foreground/30" />
              <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
            </div>

            {/* Child Concept Node Skeleton 1 (YouTube) */}
            <div className="absolute left-[calc(27.5%-80px)] top-[260px] w-[160px] h-[68px] bg-red-500/10 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
              <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
              <Skeleton className="h-3.5 w-3/4 bg-muted-foreground/30" />
              <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
            </div>

            {/* Child Concept Node Skeleton 2 (PDF) */}
            <div className="absolute left-[calc(72.5%-80px)] top-[260px] w-[160px] h-[68px] bg-amber-500/10 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-900 rounded-[20px] p-4 flex flex-col justify-center items-center shadow-xs animate-pulse z-10">
              <div className="absolute -top-1 w-2 h-2 rounded-full bg-accent" />
              <Skeleton className="h-3.5 w-4/5 bg-muted-foreground/30" />
              <div className="absolute -bottom-1 w-2 h-2 rounded-full bg-accent" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mindMap) {
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

  const detailDrawer =
    selectedNode && (
      <>
        <button
          type="button"
          aria-label="Dismiss concept details"
          className="absolute inset-0 z-20 bg-black/45 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setSelectedNode(null)}
        />
        <ConceptDetailPanel
          node={selectedNode}
          mindMap={mindMap}
          onClose={() => setSelectedNode(null)}
          onSelectNode={handleSelectConnected}
          onViewSource={handleViewSource}
          onAskAboutConcept={handleAskAboutConcept}
          className="absolute right-0 top-0 bottom-0 z-30 w-full max-w-[460px] border-l border-border shadow-level2 bg-card animate-in slide-in-from-right duration-300 rounded-l-[32px] h-full overflow-hidden"
        />
      </>
    );

  const mapContent = (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-background min-h-0",
        isFullscreen ? "h-full w-full bg-background" : "flex-1"
      )}
    >
      <div className="px-4 md:px-6 py-3 border-b border-border bg-card flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Network className="w-4 h-4 text-accent shrink-0" />
            Concept Mind Map
            <Badge
              variant="secondary"
              className="text-[9px] font-bold bg-accent/10 dark:bg-accent/20 text-accent border border-accent/20 rounded-full"
            >
              {mindMap.nodes.length} concepts
            </Badge>
          </h3>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-semibold truncate">
            Click a node to open its teaching card in the bottom drawer
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTextView((v) => !v)}
            aria-label={showTextView ? "Switch to graph view" : "Switch to text view"}
            className="text-[10px] h-8 px-2.5 border-border text-foreground hover:bg-foreground/5 font-bold rounded-full cursor-pointer"
          >
            {showTextView ? (
              <>
                <GitBranch className="w-3 h-3 mr-1.5" />
                Graph
              </>
            ) : (
              <>
                <List className="w-3 h-3 mr-1.5" />
                Text
              </>
            )}
          </Button>
          <Button
            disabled={isGenerating || !hasCompletedSources}
            onClick={onGenerateMindMap}
            variant="outline"
            aria-label="Regenerate mind map"
            className="hidden sm:inline-flex text-[10px] h-8 px-3 border-accent/30 text-accent hover:bg-accent/5 font-bold uppercase tracking-wider rounded-full cursor-pointer"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen((v) => !v)}
            aria-label={isFullscreen ? "Exit fullscreen mind map" : "Enlarge mind map to full screen"}
            className="text-[10px] h-8 px-2.5 border-border text-foreground hover:bg-foreground/5 font-bold rounded-full cursor-pointer min-w-[44px]"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Exit</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Enlarge</span>
              </>
            )}
          </Button>
          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
              aria-label="Close fullscreen mind map"
              className="text-[10px] h-8 px-2.5 border-border text-foreground hover:bg-foreground/5 font-bold rounded-full cursor-pointer min-w-[44px]"
            >
              <X className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Close</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {showTextView ? (
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
        ) : (
          <div className="flex-1 min-h-0 relative">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              onNodeClick={handleNodeClick}
              onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
              onNodeMouseLeave={() => setHoveredNodeId(null)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={1.5}
              nodesDraggable={!isMobile}
              panOnScroll={isMobile}
              panOnDrag
              zoomOnPinch
              onlyRenderVisibleElements
              proOptions={{ hideAttribution: true }}
              className="bg-background"
              aria-label="Interactive concept mind map"
            >
              <Background color={isDark ? "#2e2e2e" : "#e7e5e4"} gap={20} size={1} />
              <Controls
                showInteractive={!isMobile}
                className={cn(
                  "!right-4 !left-auto !shadow-level1 !rounded-[20px] !border-border !bg-card !overflow-hidden [&>button]:!w-10 [&>button]:!h-10 [&>button]:!border-border [&>button]:!text-foreground [&>button]:!bg-card [&>button]:hover:!bg-foreground/5 [&>button]:!min-w-[40px] [&>button]:!min-h-[40px]",
                  selectedNode ? "!bottom-[min(72vh,580px)] sm:!bottom-72" : "!bottom-4"
                )}
              />
            </ReactFlow>
          </div>
        )}

        {detailDrawer}
      </div>
    </div>
  );

  if (isFullscreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        {mapContent}
      </div>,
      document.body
    );
  }

  return mapContent;
}

export default MindMapView;
