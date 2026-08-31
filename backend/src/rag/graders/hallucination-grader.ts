import { z } from "zod";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLLM } from "../core/llm";
import { HALLUCINATION_GRADER_SYSTEM_PROMPT } from "../core/prompts";

const hallucinationSchema = z.object({
  grounded: z.boolean().describe("Set to true if all facts/claims in the generated answer are fully and directly grounded in the provided document passages. Set to false if the answer introduces new claims or details not mentioned in the passages (hallucination)."),
  reason: z.string().describe("Explanation for the grounding grade."),
});

/**
 * 4. Grounding (ISSUP) Grader: checks if the answer has hallucinations.
 */
export async function gradeHallucination(
  answer: string,
  chunks: any[]
): Promise<boolean> {
  if (chunks.length === 0) return true;

  try {
    const llm = getLLM(0.0);
    const structuredLlm = llm.withStructuredOutput(hallucinationSchema);

    const systemPrompt = HALLUCINATION_GRADER_SYSTEM_PROMPT;

    const promptContent = `Generated Answer: "${answer}"

Provided source passages:
${chunks.map((c, idx) => `[Source ${idx}] ${c.text}`).join("\n\n")}`;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(promptContent),
    ];

    const result = await structuredLlm.invoke(messages, {
      signal: AbortSignal.timeout(15000),
    });

    console.log(`[Self-RAG] ISSUP Grader -> Grounded? ${result.grounded} (${result.reason})`);
    return !!result.grounded;
  } catch (error: any) {
    console.error("[Self-RAG] Grounding evaluation failed, defaulting to true:", error.message);
    return true;
  }
}
