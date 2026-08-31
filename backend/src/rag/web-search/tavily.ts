import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import axios from "axios";
import { getLLM } from "../core/llm";
import { DIRECT_GEN_SYSTEM_PROMPT, getDirectGenWebSystemPrompt } from "../core/prompts";

/**
 * Perform a web search using Tavily API if key is present
 */
export async function searchWeb(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.log("[Self-RAG] TAVILY_API_KEY not configured. Skipping web search.");
    return "";
  }

  try {
    console.log(`[Self-RAG] Performing Tavily search for: "${query}"`);
    const response = await axios.post("https://api.tavily.com/search", {
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: false,
    }, { timeout: 8000 });

    const results = response.data?.results || [];
    if (results.length === 0) return "";

    return results
      .map((r: any, index: number) => `[Web Source ${index + 1}] (url: ${r.url}, title: "${r.title}")\nContent: ${r.content}`)
      .join("\n\n");
  } catch (err) {
    console.error("[Self-RAG] Tavily search request failed:", err);
    return "";
  }
}

/**
 * 2. Direct Generation / Web Search Node
 */
export async function webSearchOrGenerate(query: string): Promise<{ answer: string; sources: any[] }> {
  try {
    const webContext = await searchWeb(query);
    const llm = getLLM(0.5);

    const systemPrompt = webContext
      ? getDirectGenWebSystemPrompt(webContext)
      : DIRECT_GEN_SYSTEM_PROMPT;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(query),
    ];

    const response = await llm.invoke(messages, {
      signal: AbortSignal.timeout(12000),
    });
    const answer = response.content as string;

    // Parse web sources if context was used
    const sources: any[] = [];
    if (webContext) {
      const match = webContext.match(/\[Web Source \d+\].*?url: (https?:\/\/[^\s,)]+)/g);
      if (match) {
        match.forEach((item, index) => {
          const urlMatch = item.match(/url: (https?:\/\/[^\s,)]+)/);
          const titleMatch = item.match(/title: "([^"]+)"/);
          if (urlMatch) {
            sources.push({
              index: index + 1,
              source: titleMatch ? titleMatch[1] : "Web Page",
              text: `Search result from web: ${urlMatch[1]}`,
              metadata: {
                sourceType: "url",
                url: urlMatch[1],
              },
            });
          }
        });
      }
    }

    return { answer, sources };
  } catch (error) {
    console.error("[Self-RAG] Error during direct generation:", error);
    return { answer: "I encountered an error trying to process this request directly.", sources: [] };
  }
}
