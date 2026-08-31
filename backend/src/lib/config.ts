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
    apiKey: process.env.MISTRAL_API_KEY,
    fallbackApiKey: process.env.MISTRAL_API_KEY_FALLBACK || "",
    baseURL: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
    embeddingModel: process.env.EMBEDDING_MODEL || "mistral-embed",
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1024, // mistral-embed is 1024-dim
    chatModel: process.env.CHAT_MODEL || "mistral-small-latest",
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    fallbackChatModel:
      process.env.OPENROUTER_FALLBACK_CHAT_MODEL || "google/gemma-4-31b-it:free",
    visionChatModel:
      process.env.OPENROUTER_VISION_CHAT_MODEL || "google/gemma-4-31b-it:free",
    embeddingModel:
      process.env.OPENROUTER_EMBEDDING_MODEL ||
      "nvidia/nemotron-3-embed-1b:free",
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
  assemblyai: {
    apiKey: process.env.ASSEMBLYAI_API_KEY || "",
  },
  jina: {
    apiKey: process.env.JINA_API_KEY || "",
    rerankUrl: process.env.JINA_RERANK_URL || "https://api.jina.ai/v1/rerank",
    rerankModel:
      process.env.JINA_RERANK_MODEL || "jina-reranker-v2-base-multilingual",
  },
  useAdvancedRag: process.env.USE_ADVANCED_RAG !== "false",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
};

export const INDEXING_QUEUE = "file-indexing";
export const QUERY_QUEUE = "query";
