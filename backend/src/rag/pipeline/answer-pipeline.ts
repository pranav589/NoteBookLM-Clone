import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getLLM } from "../core/llm";
import { RAG_SYSTEM_PROMPT_BASE } from "../core/prompts";
import { retrieveChunks } from "../retrieval/retriever";

export function formatCitations(content: string, sources: any[]): string {
  if (!sources || sources.length === 0) return content;
  return content.replace(/[\(\[](.*?\d+.*?)[\)\]]/g, (match) => {
    const numbers = match.match(/\d+/g);
    if (!numbers) return match;

    const validLinks = numbers
      .map((numStr) => {
        const citeIndex = parseInt(numStr, 10);
        const matchedSource = sources.find((s) => s.index === citeIndex);
        if (matchedSource) {
          return `[Source ${citeIndex}](#cite-${citeIndex})`;
        }
        return null;
      })
      .filter(Boolean);

    if (validLinks.length > 0) {
      return validLinks.join(", ");
    }
    return match;
  });
}

/**
 * Full RAG workflow using LangChain
 */
export async function answerQuery(query: string, notebookId?: string) {
  // 1. Retrieve the chunks using advanced RRF retrieval
  const { queries, chunks } = await retrieveChunks(query, notebookId);

  if (chunks.length === 0) {
    return {
      query,
      queries,
      answer: "I couldn't find anything relevant in the indexed documents.",
      sources: [],
    };
  }

  // 2. Build context
  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (title: "${c.source}", type: "${c.metadata?.sourceType || "document"}"` +
        `${c.metadata?.pageNumber ? `, page: ${c.metadata.pageNumber}` : ""}` +
        `${c.metadata?.timestamp ? `, timestamp: ${c.metadata.timestamp}` : ""})\n${c.text}`,
    )
    .join("\n\n");

  // 3. Generate answer using ChatOpenAI
  const model = getLLM(0.2);

  const response = await model.invoke([
    new SystemMessage(RAG_SYSTEM_PROMPT_BASE),
    new HumanMessage(`Context:\n${context}\n\nQuestion: ${query}`),
  ]);

  const rawAnswer = (response.content as string).trim();
  const formattedSources = chunks.map((c, i) => ({
    index: i + 1,
    text: c.text,
    source: c.source,
    chunkIndex: c.chunkIndex,
    score: c.bestScore,
    rrfScore: c.rrfScore,
    matchedBy: c.matchedBy,
    metadata: c.metadata ?? {},
  }));

  const answer = formatCitations(rawAnswer, formattedSources);

  return {
    query,
    queries,
    answer,
    sources: formattedSources,
  };
}
