import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { config } from "../config";
import { PodcastTurn, RoadmapResult, MindMapResult, MindMapNode } from "../types";
import {
  ROADMAP_SYSTEM_PROMPT,
  PODCAST_SYSTEM_PROMPT,
  MINDMAP_SYSTEM_PROMPT,
} from "../lib/prompts";

// ── ZOD SCHEMAS FOR STRUCTURED OUTPUT ────────────────────────────────────────

const roadmapResultSchema = z.object({
  title: z.string().describe("Title of the Learning Roadmap"),
  description: z.string().describe("Brief overview of what the student will learn from these sources."),
  nodes: z.array(
    z.object({
      id: z.string().describe("Unique node identifier"),
      concept: z.string().describe("Concept Name"),
      description: z.string().describe("Short explanation of the concept."),
      sourceName: z.string().describe("Name of the source file or video"),
      sourceType: z.enum(["youtube", "pdf", "url", "text", "transcript"]).describe("Source type"),
      url: z.string().describe("Source URL"),
      timestamp: z.number().describe("Exact timestamp or pageNumber of the source Item"),
      reason: z.string().describe("Why this node comes first or why it is important")
    })
  )
});

const podcastScriptSchema = z.object({
  turns: z.array(
    z.object({
      speaker: z.enum(["Host A", "Host B"]).describe("Host speaker name (Host A/Andrew or Host B/Emma)"),
      text: z.string().describe("Dialogue text spoken by the host")
    })
  ).describe("Array of dialogue turns explaining the core concepts")
});

const mindMapResultSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string().describe("Unique node identifier"),
      label: z.string().describe("Concept Name"),
      summary: z.string().describe("Brief 1-2 sentence explanation of the concept."),
      description: z.string().describe("A clearer 2-4 sentence explanation a beginner can follow."),
      keyPoints: z.array(z.string()).describe("List of key points"),
      whyItMatters: z.string().describe("Why this concept is useful for understanding the topic."),
      difficulty: z.enum(["intro", "intermediate", "advanced"]).describe("Difficulty level"),
      example: z.string().optional().describe("Concrete example from sources"),
      relatedQuestions: z.array(z.string()).describe("Natural questions a student could ask"),
      sourceId: z.string().describe("Source ID from item"),
      sourceName: z.string().describe("Exact source title"),
      sourceType: z.enum(["youtube", "pdf", "url", "text", "transcript"]).describe("Source type"),
      sourceLocation: z.number().describe("Source location (timestamp or pageNumber)")
    })
  ),
  edges: z.array(
    z.object({
      id: z.string().describe("Unique edge identifier"),
      source: z.string().describe("Source node ID"),
      target: z.string().describe("Target node ID"),
      label: z.string().describe("Relationship label"),
      type: z.enum(["prerequisite", "related_to", "part_of", "example_of", "contrasts_with"]).describe("Edge type")
    })
  )
});

export class AIService {
  private static getModel(temperature: number): ChatOpenAI {
    return new ChatOpenAI({
      model: config.openai.chatModel,
      temperature,
      configuration: {
        baseURL: config.openai.baseURL,
        apiKey: config.openai.apiKey,
      },
    });
  }

  public static async generateRoadmap(itemsText: string): Promise<RoadmapResult> {
    const model = this.getModel(0.3);
    const structuredModel = model.withStructuredOutput(roadmapResultSchema);

    const response = await structuredModel.invoke([
      new SystemMessage(ROADMAP_SYSTEM_PROMPT),
      new HumanMessage(`Here are the indexed source materials:\n\n${itemsText}`),
    ]);

    return response as RoadmapResult;
  }

  public static async generatePodcastScript(fullContext: string): Promise<PodcastTurn[]> {
    const model = this.getModel(0.7);
    const structuredModel = model.withStructuredOutput(podcastScriptSchema);

    const response = await structuredModel.invoke([
      new SystemMessage(PODCAST_SYSTEM_PROMPT),
      new HumanMessage(`Here is the notebook document context:\n\n${fullContext}`),
    ]);

    return response.turns as PodcastTurn[];
  }

  public static async generateMindMap(itemsText: string): Promise<MindMapResult> {
    const model = this.getModel(0.3);
    const structuredModel = model.withStructuredOutput(mindMapResultSchema);

    const response = await structuredModel.invoke([
      new SystemMessage(MINDMAP_SYSTEM_PROMPT),
      new HumanMessage(`Here are the indexed source materials:\n\n${itemsText}`),
    ]);

    const parsed = response as MindMapResult;

    // Cap at 20 most important concepts for performance
    if (parsed.nodes && parsed.nodes.length > 20) {
      const keptIds = new Set(parsed.nodes.slice(0, 20).map((n) => n.id));
      parsed.nodes = parsed.nodes.slice(0, 20);
      parsed.edges = (parsed.edges || []).filter(
        (e) => keptIds.has(e.source) && keptIds.has(e.target)
      );
    }

    return {
      nodes: (parsed.nodes || []).map((node) => this.normalizeMindMapNode(node)),
      edges: parsed.edges || [],
    };
  }

  private static normalizeMindMapNode(node: Partial<MindMapNode> & { id?: string; label?: string }): MindMapNode {
    const summary = (node.summary || "").trim() || "Concept extracted from your sources.";
    const difficulty =
      node.difficulty === "intro" || node.difficulty === "intermediate" || node.difficulty === "advanced"
        ? node.difficulty
        : "intro";

    return {
      id: String(node.id || ""),
      label: (node.label || "Concept").trim(),
      summary: summary.slice(0, 200),
      description: (node.description || summary).trim(),
      keyPoints: Array.isArray(node.keyPoints)
        ? node.keyPoints.map((p) => String(p).trim()).filter(Boolean).slice(0, 5)
        : [],
      whyItMatters: (node.whyItMatters || "").trim(),
      difficulty,
      example: node.example ? String(node.example).trim() : undefined,
      relatedQuestions: Array.isArray(node.relatedQuestions)
        ? node.relatedQuestions.map((q) => String(q).trim()).filter(Boolean).slice(0, 3)
        : [],
      sourceId: String(node.sourceId || ""),
      sourceName: String(node.sourceName || "Document"),
      sourceType: (node.sourceType as MindMapNode["sourceType"]) || "text",
      sourceLocation: typeof node.sourceLocation === "number" ? node.sourceLocation : 0,
    };
  }
}
