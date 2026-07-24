
export const config = {
  port: Number(process.env.PORT) || 8000,
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
  },
  qdrant: {
    url: process.env.QDRANT_URL || "http://127.0.0.1:6333",
    apiKey: process.env.QDRANT_API_KEY || "",
    collection: process.env.QDRANT_COLLECTION || "documents",
  },
  openai: {
    apiKey: process.env.MISTRAL_API_KEY ,
    baseURL: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
    embeddingModel: process.env.EMBEDDING_MODEL || "mistral-embed",
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1024, // mistral-embed is 1024-dim
    chatModel: process.env.CHAT_MODEL || "mistral-medium-latest",
  },
  chunking: {
    chunkSize: Number(process.env.CHUNK_SIZE) || 1000,
    chunkOverlap: Number(process.env.CHUNK_OVERLAP) || 200,
  },
  retrieval: {
    topK: Number(process.env.RETRIEVAL_TOP_K) || 4, // per-query candidates
    rrfK: Number(process.env.RRF_K) || 60, // RRF constant
    finalK: Number(process.env.RETRIEVAL_FINAL_K) || 5, // final docs
  },
};

export const INDEXING_QUEUE = "file-indexing";
export const QUERY_QUEUE = "query";
