import { StateSchema, StateGraph, ReducedValue } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { getLLM } from "../core/llm";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import mongoose from "mongoose";
import { z } from "zod";
import { retrieveChunks } from "../retrieval/retriever";
import { formatCitations } from "./answer-pipeline";
import { config } from "../../lib/config";
import { getRagSystemPrompt } from "../core/prompts";
import { analyzeQuery } from "../graders/query-router";
import { webSearchOrGenerate } from "../web-search/tavily";
import { gradeResponse, gradeUtility } from "../graders/utility-grader";
import { gradeHallucination } from "../graders/hallucination-grader";

// Define message reducer helper
function reduceMessages(current: BaseMessage[], next: BaseMessage[] | BaseMessage): BaseMessage[] {
  const newMessages = Array.isArray(next) ? next : [next];
  return [...current, ...newMessages];
}

// Define the custom state schema using StateSchema
export const AgentStateSchema = new StateSchema({
  messages: new ReducedValue(
    z.array(z.custom<BaseMessage>()).default(() => []),
    {
      inputSchema: z.union([z.custom<BaseMessage>(), z.array(z.custom<BaseMessage>())]),
      reducer: reduceMessages,
    }
  ),
  needRag: z.boolean().default(false),
  directAnswer: z.string().default(""),
  directSatisfies: z.boolean().default(false),
  sources: z.array(z.any()).default(() => []),
  queries: z.any().default(() => ({})),
  retrievedChunks: z.array(z.any()).default(() => []),
  retrievalTries: z.number().default(0),
  isSupported: z.boolean().default(true),
  isUseful: z.boolean().default(true),
  generationTries: z.number().default(0),
});

export type AgentState = typeof AgentStateSchema.State;

let checkpointer: MongoDBSaver | null = null;

async function getCheckpointer() {
  if (checkpointer) return checkpointer;
  const client = mongoose.connection.getClient() as any;
  checkpointer = new MongoDBSaver({ client });
  await checkpointer.setup();
  return checkpointer;
}

// Node 1: Query Analyzer
async function analyzeQueryNode(state: AgentState) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;

  const result = await analyzeQuery(query);
  return {
    needRag: result.need_rag,
  };
}

// Node 2: Direct Generation / Web Search
async function directGenNode(state: AgentState) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;

  const result = await webSearchOrGenerate(query);
  return {
    directAnswer: result.answer,
    sources: result.sources,
  };
}

// Node 3: Grade Direct Answer
async function gradeDirectNode(state: AgentState) {
  const { messages, directAnswer, sources } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;

  const result = await gradeResponse(query, directAnswer);

  // Package the answer as a standard AI message to be appended to messages state.
  // This triggers graph termination and formats nicely for UI response.
  const aiMsg = new AIMessage({
    content: directAnswer,
  });
  aiMsg.additional_kwargs = {
    sources,
    queries: {},
  };

  return {
    directSatisfies: result.satisfies,
    messages: [aiMsg],
  };
}

// Node 4: Grounded RAG Agent (Fallback)
async function callAgent(state: AgentState, runConfig?: any) {
  const { messages, retrievedChunks } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;
  const notebookId = runConfig?.configurable?.thread_id;

  let activeChunks = retrievedChunks;
  let queries = state.queries || {};

  // If retrievedChunks are not yet populated and this is the first attempt, run initial local RAG retrieval
  if (state.retrievalTries === 0 && (!activeChunks || activeChunks.length === 0)) {
    const retrievalResult = await retrieveChunks(query, notebookId);
    activeChunks = retrievalResult.chunks;
    queries = retrievalResult.queries;
  }

  // Evaluate candidate relevance
  const chunks = activeChunks;

  if (chunks.length === 0) {
    console.log(`[Self-RAG] Try ${state.retrievalTries + 1}: No relevant chunks retained.`);
    // Return empty list so we branch to web search fallback
    return { retrievedChunks: [], queries };
  }

  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (title: "${c.source}", type: "${c.metadata?.sourceType || "document"}"` +
        `${c.metadata?.pageNumber ? `, page: ${c.metadata.pageNumber}` : ""}` +
        `${c.metadata?.timestamp ? `, timestamp: ${c.metadata.timestamp}` : ""})\n${c.text}`
    )
    .join("\n\n");

  const model = getLLM(0.2);
  const apiMessages: BaseMessage[] = [
    new SystemMessage(getRagSystemPrompt(context)),
    ...messages.slice(0, -1),
    new HumanMessage(query),
  ];

  const response = await model.invoke(apiMessages);

  const aiResponseMsg = new AIMessage({
    content: response.content as string,
  });

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

  aiResponseMsg.additional_kwargs = {
    sources: formattedSources,
    queries,
  };

  return {
    messages: [aiResponseMsg],
    sources: formattedSources,
    queries,
    generationTries: state.generationTries + 1,
  };
}

// Node 5: Tavily Web Search Fallback
async function webSearchFallbackNode(state: AgentState) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;

  console.log(`[Self-RAG] Try ${state.retrievalTries + 1}: Querying Tavily Web Search fallback...`);
  const result = await webSearchOrGenerate(query);
  const webChunks = result.sources.map((src, i) => ({
    id: `web_${state.retrievalTries}_${i}`,
    text: src.text,
    source: src.source,
    chunkIndex: i,
    bestScore: 0.8,
    rrfScore: 0.1,
    matchedBy: ["web_search_fallback"],
    metadata: src.metadata ?? {},
  }));

  return {
    retrievedChunks: webChunks,
    retrievalTries: state.retrievalTries + 1,
  };
}

// Node 6: Exit Fallback Node
async function exitFallbackNode(state: AgentState) {
  console.log("[Self-RAG] Executing exit fallback node.");
  const aiMsg = new AIMessage({
    content: "I couldn't find any relevant information in either your documents or web search to answer your question.",
  });
  aiMsg.additional_kwargs = {
    sources: [],
    queries: {},
  };
  return {
    messages: [aiMsg],
  };
}

// Node 7: Parallel Grounding (ISSUP) & Utility (ISUSE) Grader
async function gradeAnswerNode(state: AgentState) {
  const { messages, sources } = state;
  const lastMessage = messages[messages.length - 1];
  const answer = lastMessage.content as string;
  const lastHumanMessage = [...messages].reverse().find((m) => m instanceof HumanMessage);
  const query = lastHumanMessage ? (lastHumanMessage.content as string) : "";

  console.log("[Self-RAG] Running grounding and utility grading in parallel...");
  const [grounded, useful] = await Promise.all([
    gradeHallucination(answer, sources),
    gradeUtility(query, answer),
  ]);

  return {
    isSupported: grounded,
    isUseful: useful,
  };
}

// Routing logic after analysis
function routeAfterAnalysis(state: AgentState) {
  if (state.needRag) {
    console.log("[Self-RAG] Routing to: Grounded RAG Agent");
    return "rag_agent";
  } else {
    console.log("[Self-RAG] Routing to: Direct Generation & Web Search");
    return "direct_gen";
  }
}

// Routing logic after retrieval attempts
function routeAfterRetrieval(state: AgentState) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage instanceof AIMessage) {
    console.log("[Self-RAG] Answer generated. Routing to reflective grading node.");
    return "grade_answer";
  }

  if (state.retrievalTries < 2) {
    console.log(`[Self-RAG] No relevant chunks found. Routing to Tavily Web Search fallback (Try ${state.retrievalTries + 1}).`);
    return "web_search";
  } else {
    console.log("[Self-RAG] Max retrieval attempts reached. Exiting with default message.");
    return "exit_fallback";
  }
}

// Routing logic after generation and grading
function routeAfterGeneration(state: AgentState) {
  const { isSupported, isUseful, generationTries } = state;

  if (isSupported && isUseful) {
    console.log("[Self-RAG] Grounding (ISSUP) and Utility (ISUSE) graded GOOD. Terminating.");
    return "__end__";
  }

  if (generationTries < 2) {
    console.log(`[Self-RAG] Grounding/Utility graded BAD. Retrying generation (Try ${generationTries + 1} of 2).`);
    return "rag_agent";
  } else {
    console.log("[Self-RAG] Max generation retries reached. Returning best available answer.");
    return "__end__";
  }
}

// Build the workflow graph
const workflow = new StateGraph(AgentStateSchema)
  .addNode("analyze_query", analyzeQueryNode)
  .addNode("direct_gen", directGenNode)
  .addNode("grade_direct", gradeDirectNode)
  .addNode("rag_agent", callAgent)
  .addNode("web_search", webSearchFallbackNode)
  .addNode("exit_fallback", exitFallbackNode)
  .addNode("grade_answer", gradeAnswerNode)
  .addEdge("__start__", "analyze_query")
  // Branch from analyze_query to either RAG or Direct Gen
  .addConditionalEdges("analyze_query", routeAfterAnalysis, {
    rag_agent: "rag_agent",
    direct_gen: "direct_gen",
  })
  // Link Direct Gen to the response grader
  .addEdge("direct_gen", "grade_direct")
  // Link Grader to end
  .addEdge("grade_direct", "__end__")
  // Conditional Edge after RAG agent retrieval/generation node
  .addConditionalEdges("rag_agent", routeAfterRetrieval, {
    grade_answer: "grade_answer",
    web_search: "web_search",
    exit_fallback: "exit_fallback",
  })
  // Link web_search back to RAG agent to grade/use new chunks
  .addEdge("web_search", "rag_agent")
  // Link exit_fallback to end
  .addEdge("exit_fallback", "__end__")
  // Conditional Edge after utility grading
  .addConditionalEdges("grade_answer", routeAfterGeneration, {
    __end__: "__end__",
    rag_agent: "rag_agent",
  });

let compiledGraph: any = null;

async function getCompiledGraph() {
  if (compiledGraph) return compiledGraph;
  const saver = await getCheckpointer();
  compiledGraph = workflow.compile({ checkpointer: saver });
  return compiledGraph;
}

export async function askAgent(query: string, notebookId: string) {
  const graph = await getCompiledGraph();

  const response = await graph.invoke(
    {
      messages: [new HumanMessage(query)],
      retrievalTries: 0,
      retrievedChunks: [],
      generationTries: 0,
      isSupported: true,
      isUseful: true,
    },
    { configurable: { thread_id: notebookId } }
  );

  const lastMessage = response.messages[response.messages.length - 1];
  const sources = (lastMessage.additional_kwargs?.sources as any[]) || [];
  const answer = formatCitations(lastMessage.content as string, sources);

  return {
    answer,
    sources,
    queries: lastMessage.additional_kwargs?.queries || {},
  };
}
