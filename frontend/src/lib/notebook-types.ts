export type SourceType = "pdf" | "text" | "url" | "youtube" | "transcript";

export interface SourceMetadata {
  notebookId: string;
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
  chunkIndex: number;
  pageNumber?: number;
  url?: string;
  timestamp?: number;
}

export interface CitationSource {
  index: number;
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
  rrfScore: number;
  matchedBy: string[];
  metadata: SourceMetadata;
}

export interface Queries {
  original: string;
  rewritten: string;
  stepBack: string;
  hyde: string;
  subQueries: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  queries?: Queries;
  sources?: CitationSource[];
  status?: "pending" | "done" | "failed";
}

export type Message = ChatMessage;

export interface Notebook {
  _id: string;
  name: string;
  roadmap?: Roadmap;
  podcast?: Podcast;
  mindMap?: MindMap;
  roadmapStatus?: "idle" | "generating";
  podcastStatus?: "idle" | "generating";
  mindMapStatus?: "idle" | "generating";
  createdAt: string;
  sourcesCount?: number;
}

export interface SourceDoc {
  _id: string;
  notebookId: string;
  name: string;
  type: SourceType;
  status: "uploading" | "indexing" | "completed" | "failed";
  error?: string;
  pathOrUrl?: string;
  createdAt: string;
}

export interface NotebookDetails {
  notebook: Notebook;
  sources: SourceDoc[];
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

export interface Roadmap {
  title: string;
  description: string;
  nodes: RoadmapNode[];
}

export interface Podcast {
  success: boolean;
  audioUrl: string;
  script: { speaker: string; text: string }[];
}

export type MindMapDifficulty = "intro" | "intermediate" | "advanced";

export interface MindMapNode {
  id: string;
  label: string;
  summary: string;
  description?: string;
  keyPoints?: string[];
  whyItMatters?: string;
  difficulty?: MindMapDifficulty;
  example?: string;
  relatedQuestions?: string[];
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

export interface MindMap {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface QueryJobResult {
  answer: string;
  queries: Queries;
  sources: CitationSource[];
}

export interface QueryJobStatus {
  status: "waiting" | "active" | "completed" | "failed";
  result?: QueryJobResult;
  error?: string;
}
