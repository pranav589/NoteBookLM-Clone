import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLLM } from "../core/llm";
import { RELEVANCE_GRADER_SYSTEM_PROMPT } from "../core/prompts";

// JSON schema for relevance grading
const relevanceSchema = z.object({
  relevance: z.array(
    z.object({
      index: z.number(),
      relevant: z.boolean().describe("Set to true if this passage contains details relevant to answering the query. Set to false if it is completely irrelevant, duplicate noise, or does not contain useful information."),
    })
  ).describe("Array of relevance decisions for each passage."),
});

/**
 * Graded Relevance Filtering: checks each chunk against query and discards irrelevant ones.
 */
export async function filterRelevantChunks(
  query: string,
  chunks: any[]
): Promise<any[]> {
  if (chunks.length === 0) return [];

  try {
    const llm = getLLM(0.0);
    const structuredLlm = llm.withStructuredOutput(relevanceSchema);

    const systemPrompt = RELEVANCE_GRADER_SYSTEM_PROMPT;

    const promptContent = `Query: "${query}"

Passages to evaluate:
${chunks.map((c, idx) => `[Passage ${idx}] Source: "${c.source}"\nContent: ${c.text}`).join("\n\n")}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(promptContent),
    ];

    const result = await structuredLlm.invoke(messages, {
      signal: AbortSignal.timeout(15000),
    });

    if (result && Array.isArray(result.relevance)) {
      const relevanceMap = new Map<number, boolean>();
      result.relevance.forEach((item: any) => {
        relevanceMap.set(item.index, !!item.relevant);
      });

      const filtered = chunks.filter((c, idx) => {
        const isRelevant = relevanceMap.has(idx) ? relevanceMap.get(idx) : true;
        if (!isRelevant) {
          console.log(`[Self-RAG] Discarding irrelevant chunk from "${c.source}"`);
        }
        return isRelevant;
      });

      console.log(`[Self-RAG] Retained ${filtered.length} of ${chunks.length} chunks after relevance grading.`);
      return filtered;
    }
  } catch (error: any) {
    console.error("[Self-RAG] Relevance evaluation failed or timed out:", error.message);
  }

  // Fallback: return all chunks if evaluation fails
  return chunks;
}
