import dagre from "dagre";
import { type Node, type Edge } from "reactflow";
import type { MindMap, MindMapNode, SourceType } from "../../lib/notebook-types";

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 72;

export function getNodeColor(sourceType: SourceType) {
  switch (sourceType) {
    case "youtube":
      return "border-red-400 dark:border-red-900 bg-red-50/90 dark:bg-red-950/20 text-foreground hover:border-red-500";
    case "pdf":
      return "border-amber-400 dark:border-amber-900 bg-amber-50/90 dark:bg-amber-950/20 text-foreground hover:border-accent";
    default:
      return "border-blue-400 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/20 text-foreground hover:border-blue-500";
  }
}

export function shouldUseHierarchical(mindMap: MindMap): boolean {
  if (mindMap.nodes.length <= 10) return true;
  const hierarchicalTypes = new Set(["prerequisite", "part_of"]);
  const hierarchicalCount = mindMap.edges.filter((e) => hierarchicalTypes.has(e.type)).length;
  return hierarchicalCount >= mindMap.edges.length / 2;
}

export function getHierarchicalLayout(nodes: Node[], edges: Edge[], direction = "TB") {
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

export function getForceLayout(nodes: Node[]) {
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

export function formatLocation(node: MindMapNode): string {
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
