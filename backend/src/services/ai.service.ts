import { ChatOpenAI } from "@langchain/openai";
import { config } from "../config";
import { PodcastTurn, RoadmapResult, MindMapResult, MindMapNode } from "../types";

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

  private static cleanJsonOutput(rawText: string): string {
    let cleanText = rawText.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith("```")) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    // If still not plain JSON, extract the first {...} object via regex
    if (!cleanText.startsWith("{") && !cleanText.startsWith("[")) {
      const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        cleanText = match[1];
      }
    }

    return cleanText;
  }

  public static async generateRoadmap(itemsText: string): Promise<RoadmapResult> {
    const model = this.getModel(0.3);

    const systemPrompt = `You are an expert learning tutor.
Given the following list of indexed document/video fragments, create a personalized step-by-step learning roadmap of concepts found in these sources.
Each learning step (node) MUST pinpoint the specific source, title, and timestamp/page number where it is explained so the student can directly open it to study.

CRITICAL INSTRUCTION FOR TIMESTAMPS:
- For YouTube videos and audio transcripts: You MUST copy the exact "timestamp" integer (in seconds) from the source Item that contains the concept.
- For PDFs: You MUST copy the exact "pageNumber" integer from the source Item that contains the concept.
- Do NOT guess, extrapolate, round, or invent timestamps/pageNumbers. The "timestamp" field in the output JSON for the node MUST match the source Item's location value EXACTLY.

You MUST return the output as a valid JSON object matching this structure with NO extra text, markup blocks, or formatting tags:
{
  "title": "Title of the Learning Roadmap",
  "description": "Brief overview of what the student will learn from these sources.",
  "nodes": [
    {
      "id": "1",
      "concept": "Concept Name",
      "description": "Short explanation of the concept.",
      "sourceName": "Name of the source file or video",
      "sourceType": "youtube" | "pdf" | "url" | "text" | "transcript",
      "url": "the source URL",
      "timestamp": 120, // MUST match the exact timestamp or pageNumber of the source Item
      "reason": "Why this node comes first or why it is important"
    }
  ]
}
Design a clear progression. Aim for exactly 4-6 roadmap steps.`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the indexed source materials:\n\n${itemsText}` },
    ]);

    const rawText = this.cleanJsonOutput(response.content as string);
    return JSON.parse(rawText) as RoadmapResult;
  }

  public static async generatePodcastScript(fullContext: string): Promise<PodcastTurn[]> {
    const model = this.getModel(0.7);

    const systemPrompt = `You are a professional podcast scriptwriter.
Given the following document context, generate a conversational podcast script between two hosts:
- Host A (Male, name: Andrew): Enthusiastic, introduces the topic, asks insightful questions.
- Host B (Female, name: Emma): Analytical, provides details, explains key concepts.
The hosts should discuss and explain the concepts in the provided documents in a friendly, conversational manner.

You MUST return the output as a valid JSON array of dialogue turns, with NO extra markdown tags, notes, or wrapper text:
[
  { "speaker": "Host A", "text": "Hello and welcome to the show! Today we are discussing..." },
  { "speaker": "Host B", "text": "Thanks Andrew! Yes, and what's fascinating is..." }
]
Generate exactly 6-10 dialogue turns explaining the core concepts. Keep descriptions clear and accessible.`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here is the notebook document context:\n\n${fullContext}` },
    ]);

    const rawText = this.cleanJsonOutput(response.content as string);
    return JSON.parse(rawText) as PodcastTurn[];
  }

  public static async generateMindMap(itemsText: string): Promise<MindMapResult> {
    const model = this.getModel(0.3);

    const systemPrompt = `You are an expert knowledge graph builder and educator.

Given indexed document/video fragments, extract 8-15 key concepts and create a mind map showing their relationships. Write in plain language a student can understand quickly.

CRITICAL REQUIREMENTS:
1. Each concept MUST cite the exact source item, including:
   - sourceName: The exact title from the source item
   - sourceType: One of "youtube" | "pdf" | "url" | "text" | "transcript"
   - sourceLocation: For PDFs use pageNumber, for videos use timestamp in seconds
   
2. DO NOT guess or invent locations - copy the exact value from the source item metadata

3. Create meaningful relationships between concepts using these edge types:
   - "prerequisite": Concept A must be understood before concept B
   - "related_to": Concepts share thematic connections
   - "part_of": Concept A is a component of concept B
   - "example_of": Concept A exemplifies concept B
   - "contrasts_with": Concepts present opposing viewpoints

4. For each concept provide teaching-card fields:
   - summary: max 200 characters, 1-2 sentences (shown on the graph)
   - description: 2-4 sentence plain-language explanation
   - keyPoints: 3-5 short bullet strings
   - whyItMatters: one sentence on why a learner should care
   - difficulty: one of "intro" | "intermediate" | "advanced"
   - example: optional concrete example grounded in the sources
   - relatedQuestions: 2-3 natural questions a student could ask about this concept using the notebook sources

5. Return ONLY valid JSON matching this structure with NO markdown code blocks:
{
  "nodes": [
    {
      "id": "1",
      "label": "Concept Name",
      "summary": "Brief 1-2 sentence explanation of the concept.",
      "description": "A clearer 2-4 sentence explanation a beginner can follow.",
      "keyPoints": ["Point one", "Point two", "Point three"],
      "whyItMatters": "Why this concept is useful for understanding the topic.",
      "difficulty": "intro",
      "example": "A concrete example from the sources.",
      "relatedQuestions": ["What is X in simple terms?", "How does X relate to Y?"],
      "sourceId": "source-id-from-item",
      "sourceName": "Exact source title",
      "sourceType": "youtube",
      "sourceLocation": 120
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "builds upon",
      "type": "prerequisite"
    }
  ]
}

Design a coherent graph structure. Aim for 8-15 nodes with 10-20 edges creating a connected graph.`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the indexed source materials:\n\n${itemsText}` },
    ]);

    const rawText = this.cleanJsonOutput(response.content as string);
    const parsed = JSON.parse(rawText) as MindMapResult;

    // Cap at 20 most important concepts for performance
    if (parsed.nodes?.length > 20) {
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
