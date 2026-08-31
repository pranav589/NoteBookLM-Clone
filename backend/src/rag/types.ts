import { SourceType } from "../types";

export interface RankedChunk {
  id: string;
  text: string;
  source: string | null;
  chunkIndex: number | null;
  bestScore: number;
  rrfScore: number;
  matchedBy: string[];
  metadata: Record<string, any>;
}

export interface RetrievalResult {
  queries: {
    original: string;
    rewritten: string;
    stepBack: string;
    hyde: string;
    subQueries: string[];
  };
  chunks: RankedChunk[];
}
