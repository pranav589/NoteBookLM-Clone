import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { getLLM } from "../core/llm";
import { QUERY_REWRITING_SYSTEM_PROMPT, HYDE_SYSTEM_PROMPT } from "../core/prompts";

// Zod schema for query rewriting output
const queryRewritingSchema = z.object({
  stepBack: z
    .string()
    .describe(
      "A broader, higher-level 'step-back' question whose answer gives useful background for the original query.",
    ),
  rewritten: z
    .string()
    .describe(
      "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent.",
    ),
  subQueries: z
    .array(z.string())
    .describe(
      "Exactly 3 focused sub-questions the original query can be decomposed into.",
    ),
});

/**
 * Rewrite a user's query into several variants using ChatOpenAI structured output:
 */
export async function queryRewriting(query: string) {
  const model = getLLM(0.2);

  const structuredModel = model.withStructuredOutput(queryRewritingSchema);

  try {
    const result = await structuredModel.invoke([
      new SystemMessage(QUERY_REWRITING_SYSTEM_PROMPT),
      new HumanMessage(query),
    ], {
      signal: AbortSignal.timeout(10000),
    });

    return {
      stepBack: result.stepBack || "",
      rewritten: result.rewritten || query,
      subQueries: result.subQueries || [],
    };
  } catch (error) {
    console.error("Query rewriting failed:", error);
    return {
      stepBack: "",
      rewritten: query,
      subQueries: [],
    };
  }
}

/**
 * HyDE (Hypothetical Document Embeddings): generates a hypothetical document excerpt
 */
export async function hydeDocument(query: string): Promise<string> {
  const model = getLLM(0.3);

  const response = await model.invoke([
    new SystemMessage(HYDE_SYSTEM_PROMPT),
    new HumanMessage(query),
  ], {
    signal: AbortSignal.timeout(10000),
  });

  return (response.content as string).trim() || "";
}
