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

  async embedDocuments(documents: string[]): Promise<number[][]> {
    const batchSize = 32;
    const results: number[][] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
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

      if (!res.ok) {
        throw new Error(`Mistral API error: ${res.status} ${await res.text()}`);
      }

      const data = (await res.json()) as any;
      const embeddings = data.data.map((item: any) => item.embedding);
      results.push(...embeddings);
    }

    return results;
  }

  async embedQuery(document: string): Promise<number[]> {
    const res = await fetch(`${this.baseURL}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: [document],
      }),
    });

    if (!res.ok) {
      throw new Error(`Mistral API error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as any;
    return data.data[0].embedding;
  }
}

// Initialize Custom Mistral Embeddings
export const embeddings = new MistralDirectEmbeddings({
  apiKey: config.openai.apiKey,
  baseURL: config.openai.baseURL,
  model: config.openai.embeddingModel,
});
