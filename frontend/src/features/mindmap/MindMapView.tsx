"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeTypes,
} from "reactflow";
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
import { cn } from "@/lib/utils";
import type { MindMap, MindMapNode, SourceType } from "../../lib/notebook-types";
import { ConceptDetailPanel } from "./ConceptDetailPanel";
import { ConceptNode } from "./ConceptNode";
import { MindMapSkeleton } from "./MindMapSkeleton";
import { MindMapEmpty } from "./MindMapEmpty";
import { MindMapTextView } from "./MindMapTextView";
import {
  shouldUseHierarchical,
  getHierarchicalLayout,
  getForceLayout,
} from "./MindMapUtils";

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

const nodeTypes: NodeTypes = { concept: ConceptNode };

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
    return <MindMapSkeleton isDark={isDark} />;
  }

  if (!mindMap) {
    return (
      <MindMapEmpty
        isGenerating={isGenerating}
        onGenerateMindMap={onGenerateMindMap}
        hasCompletedSources={hasCompletedSources}
      />
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
          <MindMapTextView
            mindMap={mindMap}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
          />
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
