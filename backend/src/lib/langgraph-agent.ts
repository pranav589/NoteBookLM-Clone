import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import mongoose from "mongoose";
import { retrieveChunks } from "./rag-helper";
import { config } from "./config";

let checkpointer: MongoDBSaver | null = null;

async function getCheckpointer() {
  if (checkpointer) return checkpointer;
  // Get underlying MongoClient from active mongoose connection
  const client = mongoose.connection.getClient() as any;
  checkpointer = new MongoDBSaver({ client });
  await checkpointer.setup();
  return checkpointer;
}

// Define the core execution node
async function callAgent(state: typeof MessagesAnnotation.State, runConfig?: any) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  const query = lastMessage.content as string;
  const notebookId = runConfig?.configurable?.thread_id;

  // Retrieve chunks from Qdrant matching the workspace (notebookId)
  const { queries, chunks } = await retrieveChunks(query, notebookId);

  // If no chunks found, return default response
  if (chunks.length === 0) {
    const aiMsg = new AIMessage({
      content: "I couldn't find anything relevant in the indexed documents.",
    });
    aiMsg.additional_kwargs = {
      sources: [],
      queries
    };
    return { messages: [aiMsg] };
  }

  // Build grounding context from retrieved document chunks
  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] (title: "${c.source}", type: "${c.metadata?.sourceType || "document"}"` +
        `${c.metadata?.pageNumber ? `, page: ${c.metadata.pageNumber}` : ""}` +
        `${c.metadata?.timestamp ? `, timestamp: ${c.metadata.timestamp}` : ""})\n${c.text}`
    )
    .join("\n\n");

  // Setup LLM
  const model = new ChatOpenAI({
    model: config.openai.chatModel,
    temperature: 0.2,
    configuration: {
      baseURL: config.openai.baseURL,
      apiKey: config.openai.apiKey,
    },
  });

  // Construct system prompt with grounding context
  const systemPrompt =
    "You are a helpful assistant. Answer the user's question using ONLY the provided context. " +
    "You MUST cite the source inside your answer using brackets like [Source 1], [Source 2], etc. " +
    "whenever you state a fact derived from it. Try to place these citations inline at the end of relevant sentences. " +
    "Do not formulate the answer without inline citations. If the answer cannot be found in the context, say: " +
    "'I couldn't find information about this in the uploaded documents.' and do not cite anything. Be concise.\n\n" +
    `Context:\n${context}`;

  // Form message sequence for ChatOpenAI API
  const apiMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(0, -1).map((m: BaseMessage) => ({
      role: m.getType() === "human" ? "user" : "assistant",
      content: m.content as string,
    })),
    { role: "user", content: query },
  ];

  const response = await model.invoke(apiMessages);

  // Package response message with metadata
  const aiResponseMsg = new AIMessage({
    content: response.content as string,
  });

  aiResponseMsg.additional_kwargs = {
    sources: chunks.map((c, i) => ({
      index: i + 1,
      text: c.text,
      source: c.source,
      chunkIndex: c.chunkIndex,
      score: c.bestScore,
      rrfScore: c.rrfScore,
      matchedBy: c.matchedBy,
      metadata: c.metadata ?? {},
    })),
    queries,
  };

  return { messages: [aiResponseMsg] };
}

// Compile state graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callAgent)
  .addEdge("__start__", "agent");

export async function askAgent(query: string, notebookId: string) {
  const saver = await getCheckpointer();
  const graph = workflow.compile({ checkpointer: saver });

  const response = await graph.invoke(
    { messages: [new HumanMessage(query)] },
    { configurable: { thread_id: notebookId } }
  );

  const lastMessage = response.messages[response.messages.length - 1];

  return {
    answer: lastMessage.content as string,
    sources: (lastMessage.additional_kwargs?.sources as any[]) || [],
    queries: lastMessage.additional_kwargs?.queries || {},
  };
}
