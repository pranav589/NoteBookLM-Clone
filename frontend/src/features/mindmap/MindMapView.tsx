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
      return "border-red-400 bg-red-50/90 hover:border-red-500";
    case "pdf":
      return "border-amber-400 bg-amber-50/90 hover:border-amber-500";
    default:
      return "border-blue-400 bg-blue-50/90 hover:border-blue-500";
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
        "px-4 py-3 rounded-2xl border-2 shadow-premium transition-all duration-200 cursor-pointer min-w-[160px] max-w-[200px]",
        "hover:shadow-hover hover:-translate-y-0.5",
        getNodeColor(data.sourceType),
        (data.selected || data.highlighted) &&
          "ring-2 ring-amber-400 ring-offset-2 -translate-y-0.5 shadow-hover"
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-2 !h-2 !border-0" />
      <div className="text-xs font-bold text-stone-850 leading-snug text-center line-clamp-2">
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-2 !h-2 !border-0" />
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

  useEffect(() => {
    setMounted(true);
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
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#d97706" },
        style: {
          stroke: isConnected ? "#d97706" : "#e7e5e4",
          strokeWidth: isConnected ? 2 : 1,
          opacity: hoveredNodeId && !isConnected ? 0.25 : 1,
        },
        labelStyle: {
          fill: "#78716c",
          fontSize: 10,
          fontWeight: 600,
        },
        labelBgStyle: { fill: "#fffbeb", fillOpacity: 0.9 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    const layouted = shouldUseHierarchical(mindMap)
      ? getHierarchicalLayout(baseNodes, baseEdges)
      : getForceLayout(baseNodes);

    return { flowNodes: layouted, flowEdges: baseEdges };
  }, [mindMap, hoveredNodeId, connectedIds, selectedNode?.id]);

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
      <div className="flex-1 p-6 bg-[#FCFAF6]/40 overflow-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-500 animate-pulse" />
              <Skeleton className="h-5 w-52 bg-stone-200/70" />
            </div>
            <Skeleton className="h-3 w-80 bg-stone-200/70" />
            <p className="text-xs text-stone-500 font-medium flex items-center gap-2 pt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              Extracting concepts and relationships with AI...
            </p>
          </div>
          <div className="relative h-72 rounded-2xl border border-border/60 bg-white/50 overflow-hidden">
            <div className="absolute left-1/4 top-1/4">
              <Skeleton className="h-14 w-36 rounded-2xl bg-stone-200/70" />
            </div>
            <div className="absolute right-1/4 top-1/3">
              <Skeleton className="h-14 w-40 rounded-2xl bg-stone-200/70" />
            </div>
            <div className="absolute left-1/3 bottom-1/4">
              <Skeleton className="h-14 w-32 rounded-2xl bg-stone-200/70" />
            </div>
            <div className="absolute right-1/3 bottom-1/3">
              <Skeleton className="h-14 w-36 rounded-2xl bg-stone-200/70" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mindMap) {
    return (
      <div className="flex-1 p-6 bg-[#FCFAF6]/40 overflow-auto">
        <div className="max-w-md mx-auto text-center py-12 space-y-4">
          <div className="bg-amber-100/50 border border-amber-200/60 p-4 rounded-full w-fit mx-auto">
            <Network className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-base font-bold text-stone-850">Interactive Concept Mind Map</h3>
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
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
            className="bg-primary hover:bg-primary/95 text-white font-medium text-xs py-2 px-6 cursor-pointer shadow-sm rounded-lg"
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
            <p className="text-[10px] text-stone-400 font-medium">
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
          className="absolute inset-0 z-20 bg-stone-900/25 cursor-pointer"
          onClick={() => setSelectedNode(null)}
        />
        <ConceptDetailPanel
          node={selectedNode}
          mindMap={mindMap}
          onClose={() => setSelectedNode(null)}
          onSelectNode={handleSelectConnected}
          onViewSource={handleViewSource}
          onAskAboutConcept={handleAskAboutConcept}
          className="absolute inset-x-0 bottom-0 z-30 h-[min(70vh,560px)] rounded-t-2xl border-t border-x shadow-xl animate-in slide-in-from-bottom-4 duration-200"
        />
      </>
    );

  const mapContent = (
    <div
      className={cn(
        "flex flex-col overflow-hidden bg-[#FCFAF6]/40 min-h-0",
        isFullscreen ? "h-full w-full bg-[#FCFAF6]" : "flex-1"
      )}
    >
      <div className="px-4 md:px-6 py-3 border-b border-border bg-white/90 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-stone-850 flex items-center gap-2">
            <Network className="w-4 h-4 text-primary shrink-0" />
            Concept Mind Map
            <Badge
              variant="secondary"
              className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/50"
            >
              {mindMap.nodes.length} concepts
            </Badge>
          </h3>
          <p className="text-[10px] text-stone-450 mt-0.5 font-medium truncate">
            Click a node to open its teaching card in the bottom drawer
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTextView((v) => !v)}
            aria-label={showTextView ? "Switch to graph view" : "Switch to text view"}
            className="text-[10px] h-8 px-2.5 border-stone-200 text-stone-600 hover:bg-stone-50 font-bold cursor-pointer"
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
            className="hidden sm:inline-flex text-[10px] h-8 px-3 border-amber-250 text-amber-800 hover:bg-amber-50 font-bold uppercase tracking-wider cursor-pointer"
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
            className="text-[10px] h-8 px-2.5 border-stone-200 text-stone-600 hover:bg-stone-50 font-bold cursor-pointer min-w-[44px]"
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
              className="text-[10px] h-8 px-2.5 border-stone-200 text-stone-700 hover:bg-stone-100 font-bold cursor-pointer min-w-[44px]"
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
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                  Concepts
                </h4>
                <ul className="space-y-3">
                  {mindMap.nodes.map((node) => (
                    <li
                      key={node.id}
                      className={cn(
                        "bg-card border rounded-2xl p-4 shadow-premium transition-colors",
                        selectedNode?.id === node.id
                          ? "border-amber-400"
                          : "border-border"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedNode(node)}
                        className="text-left w-full cursor-pointer"
                      >
                        <span className="text-sm font-bold text-stone-850">{node.label}</span>
                        <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                          {node.description || node.summary}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-2 font-medium">
                          Source: {node.sourceName} · {formatLocation(node)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
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
                        className="text-xs text-stone-600 bg-white border border-border/80 rounded-xl px-3 py-2"
                      >
                        <span className="font-bold text-stone-800">{sourceLabel}</span>{" "}
                        <span className="text-amber-700 italic">{edge.label}</span>{" "}
                        <span className="font-bold text-stone-800">{targetLabel}</span>
                        <Badge
                          variant="secondary"
                          className="ml-2 text-[8px] bg-stone-50 text-stone-500 border-stone-200"
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
              className="bg-[#FCFAF6]/60"
              aria-label="Interactive concept mind map"
            >
              <Background color="#e7e5e4" gap={20} size={1} />
              <Controls
                showInteractive={!isMobile}
                className={cn(
                  "!right-4 !left-auto !shadow-md !rounded-xl !border-border !overflow-hidden [&>button]:!w-11 [&>button]:!h-11 [&>button]:!min-w-[44px] [&>button]:!min-h-[44px]",
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
      <div className="fixed inset-0 z-[100] bg-white flex flex-col">
        {mapContent}
      </div>,
      document.body
    );
  }

  return mapContent;
}

export default MindMapView;
