import { Embeddings, type EmbeddingsParams } from "@langchain/core/embeddings";
import { config } from "./config";

export class MistralDirectEmbeddings extends Embeddings {
  apiKey: string;
  baseURL: string;
  model: string;

  constructor(fields: EmbeddingsParams & { apiKey?: string; baseURL?: string; model?: string }) {
    super(fields);
    this.apiKey = fields.apiKey || "";
    this.baseURL = fields.baseURL || "https://api.mistral.ai/v1";
    this.model = fields.model || "mistral-embed";
  }

  private async fetchEmbeddingsWithFallback(batch: string[]): Promise<number[][]> {
    // 1. Try primary embeddings
    if (this.apiKey) {
      try {
        const res = await fetch(`${this.baseURL}/embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            input: batch,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as any;
          return data.data.map((item: any) => item.embedding);
        } else {
          console.warn(`Primary embeddings failed with status: ${res.status}. Falling back to OpenRouter.`);
        }
      } catch (error) {
        console.warn(`Primary embeddings request failed. Falling back to OpenRouter. Error:`, error);
      }
    } else {
      console.warn("Primary embeddings API key missing. Falling back to OpenRouter.");
    }

    // 2. Fallback to OpenRouter embeddings
    const fallbackRes = await fetch(`${config.openrouter.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openrouter.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openrouter.embeddingModel,
        input: batch,
      }),
    });

    if (!fallbackRes.ok) {
      throw new Error(`OpenRouter Fallback Embeddings API error: ${fallbackRes.status} ${await fallbackRes.text()}`);
    }

    const data = (await fallbackRes.json()) as any;
    return data.data.map((item: any) => item.embedding);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const batchSize = 32;
    const results: number[][] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const embeddings = await this.fetchEmbeddingsWithFallback(batch);
      results.push(...embeddings);
    }

    return results;
  }

  async embedQuery(document: string): Promise<number[]> {
    const embeddings = await this.fetchEmbeddingsWithFallback([document]);
    return embeddings[0];
  }
}

// Initialize Custom Mistral Embeddings with fallback capability
export const embeddings = new MistralDirectEmbeddings({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
  model: config.openai.embeddingModel,
});

