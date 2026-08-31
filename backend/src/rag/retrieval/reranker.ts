import { config } from "../../lib/config";

/**
 * Reranks document chunks against the user query using Jina Reranker API.
 * Falls back to original RRF order if API key is not present or query fails.
 */
export async function rerankChunks(
  query: string,
  chunks: any[],
  topN = 7
): Promise<any[]> {
  if (chunks.length === 0) return [];

  // Limit how many chunks we send to the reranker (e.g. 20 chunks max to keep it fast and fit context)
  const candidates = chunks.slice(0, 20);
  const apiKey = config.jina.apiKey || process.env.JINA_API_KEY;

  if (apiKey) {
    try {
      console.log(`[Self-RAG] Reranking ${candidates.length} chunks with Jina API...`);
      const response = await fetch(config.jina.rerankUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.jina.rerankModel,
          query,
          documents: candidates.map((c) => c.text),
          top_n: topN,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data && Array.isArray(data.results)) {
          const results = data.results;
          console.log(`[Self-RAG] Jina reranked success. Returning top ${results.length} chunks.`);
          return results.map((r: any) => ({
            ...candidates[r.index],
            bestScore: r.relevance_score,
            matchedBy: [...(candidates[r.index].matchedBy || []), "jina_rerank"],
          }));
        }
      } else {
        console.warn(`[Self-RAG] Jina Rerank API returned status: ${response.status}`);
      }
    } catch (err: any) {
      console.warn(`[Self-RAG] Jina rerank failed, falling back to RRF order:`, err.message);
    }
  } else {
    console.log("[Self-RAG] JINA_API_KEY not configured. Skipping Jina reranking, using RRF order.");
  }

  // Fallback: return top-N by RRF score
  return candidates.slice(0, topN);
}
