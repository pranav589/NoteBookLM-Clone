export const SOURCE_TYPES = ["pdf", "text", "url", "youtube", "transcript", "image", "video"] as const;
export type SourceType = typeof SOURCE_TYPES[number];

export interface IndexingJobPayload {
  sourceId: string;
  notebookId: string;
  type: SourceType;
  filePath?: string;
  url?: string;
  name: string;
}

export interface QueryJobPayload {
  query: string;
  notebookId: string;
}

export interface RoadmapNode {
  id: string;
  concept: string;
  description: string;
  sourceName: string;
  sourceType: SourceType;
  url: string;
  timestamp: number;
  reason: string;
}

export interface RoadmapResult {
  title: string;
  description: string;
  nodes: RoadmapNode[];
}

export interface PodcastTurn {
  speaker: string;
  text: string;
}

export interface PodcastResult {
  success: boolean;
  audioUrl: string;
  script: PodcastTurn[];
}

export type MindMapDifficulty = "intro" | "intermediate" | "advanced";

export interface MindMapNode {
  id: string;
  label: string;
  summary: string;
  description: string;
  keyPoints: string[];
  whyItMatters: string;
  difficulty: MindMapDifficulty;
  example?: string;
  relatedQuestions: string[];
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  sourceLocation: number;
}

export interface MindMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "prerequisite" | "related_to" | "part_of" | "example_of" | "contrasts_with";
}

export interface MindMapResult {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}
