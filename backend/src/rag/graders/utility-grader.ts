import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLLM } from "../core/llm";
import { UTILITY_GRADER_SYSTEM_PROMPT, RESPONSE_GRADER_SYSTEM_PROMPT } from "../core/prompts";

// JSON schema for grading response
const gradeSchema = z.object({
  satisfies: z.boolean().describe("Set to true if the response directly, fully, and accurately answers the user's query. Set to false if it is incomplete, mentions it does not know, asks for documents, or is irrelevant."),
  reason: z.string().describe("Reasoning for the grade."),
});

const utilitySchema = z.object({
  useful: z.boolean().describe("Set to true if the generated answer directly, fully, and successfully answers the user's query. Set to false if it is irrelevant, evades the question, or does not provide a helpful answer."),
  reason: z.string().describe("Explanation for the utility grade."),
});

/**
 * 3. Response Grader: Check if response satisfies user question
 */
export async function gradeResponse(query: string, response: string): Promise<{ satisfies: boolean; reason: string }> {
  try {
    const llm = getLLM(0.0);
    const structuredLlm = llm.withStructuredOutput(gradeSchema);

    const systemPrompt = RESPONSE_GRADER_SYSTEM_PROMPT;

    const prompt = `Query: ${query}\n\nGenerated Response: ${response}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ];

    const result = await structuredLlm.invoke(messages, {
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[Self-RAG] Direct Gen Grading -> Satisfies? ${result.satisfies} (${result.reason})`);
    return {
      satisfies: !!result.satisfies,
      reason: result.reason || "",
    };
  } catch (error) {
    console.error("[Self-RAG] Error grading response, defaulting to false:", error);
    return { satisfies: false, reason: "Error fallback" };
  }
}

/**
 * 5. Utility (ISUSE) Grader: checks if the answer is useful for the query.
 */
export async function gradeUtility(
  query: string,
  answer: string
): Promise<boolean> {
  try {
    const llm = getLLM(0.0);
    const structuredLlm = llm.withStructuredOutput(utilitySchema);

    const systemPrompt = UTILITY_GRADER_SYSTEM_PROMPT;

    const prompt = `User Query: "${query}"\n\nGenerated Answer: "${answer}"`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(prompt),
    ];

    const result = await structuredLlm.invoke(messages, {
      signal: AbortSignal.timeout(15000),
    });

    console.log(`[Self-RAG] ISUSE Grader -> Useful? ${result.useful} (${result.reason})`);
    return !!result.useful;
  } catch (error: any) {
    console.error("[Self-RAG] Utility evaluation failed, defaulting to true:", error.message);
    return true;
  }
}
