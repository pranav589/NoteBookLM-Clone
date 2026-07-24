import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import multer from "multer";
import mongoose from "mongoose";
import { connectToDatabase, Notebook, Source } from "./lib/db";
import { enqueueIndexingJob, enqueueQueryJob, indexingQueue, queryQueue } from "./lib/queue";
import { answerQuery, deleteNotebookVectors, deleteSourceVectors } from "./lib/rag-helper";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { ChatOpenAI } from "@langchain/openai";
import { config } from "./lib/config";
import "./workers/rag-worker";

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const uploadDir = path.join(process.cwd(), "uploads");
const podcastsDir = path.join(process.cwd(), "podcasts");

// Ensure required directories exist on startup
Promise.all([
  fs.mkdir(uploadDir, { recursive: true }),
  fs.mkdir(podcastsDir, { recursive: true }),
]).catch(console.error);

// Static paths
app.use("/podcasts", express.static(podcastsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Helper to convert readable stream to Buffer for TTS
function streamToBuffer(readableStream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on("data", (data: any) => {
      chunks.push(data);
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", (err: any) => {
      reject(err);
    });
  });
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// 1. Direct file indexing (legacy route)
app.post("/api/index", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded (field: 'file')" });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }

    const job = await enqueueIndexingJob({
      sourceId: "legacy-direct-upload",
      notebookId: "legacy-direct-upload",
      type: "pdf",
      filePath: req.file.path,
      name: req.file.originalname,
    });

    return res.status(202).json({
      message: "File uploaded and queued for indexing",
      jobId: job.id,
      file: {
        originalName: req.file.originalname,
        storedAs: req.file.filename,
        size: req.file.size,
      },
    });
  } catch (err: any) {
    console.error("Index API error:", err);
    return res.status(500).json({ error: "Failed to queue file for indexing" });
  }
});

// 2. Queue query search
app.post("/api/query", async (req, res) => {
  try {
    const { query, notebookId } = req.body;

    if (typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Body must include a non-empty 'query' string" });
    }

    if (typeof notebookId !== "string" || notebookId.trim().length === 0) {
      return res.status(400).json({ error: "Body must include a non-empty 'notebookId' string" });
    }

    const job = await enqueueQueryJob({
      query: query.trim(),
      notebookId: notebookId.trim(),
    });

    return res.status(202).json({
      message: "Query queued",
      jobId: job.id,
      poll: `/api/jobs/${job.id}`,
    });
  } catch (err: any) {
    console.error("Query API error:", err);
    return res.status(500).json({ error: "Failed to queue query" });
  }
});

// 3. Poll BullMQ job status
app.get("/api/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;

    let job = await queryQueue.getJob(id);
    let queueType = "query";

    if (!job) {
      job = await indexingQueue.getJob(id);
      queueType = "indexing";
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({
        jobId: job.id,
        queue: queueType,
        status: state,
        result: job.returnvalue,
      });
    }

    if (state === "failed") {
      return res.json({
        jobId: job.id,
        queue: queueType,
        status: state,
        error: job.failedReason,
      });
    }

    return res.json({
      jobId: job.id,
      queue: queueType,
      status: state,
    });
  } catch (err: any) {
    console.error("Job status polling error:", err);
    return res.status(500).json({ error: "Failed to poll job status" });
  }
});

// 4. Notebooks management (Fetch list, create new)
app.get("/api/notebooks", async (req, res) => {
  try {
    await connectToDatabase();
    const notebooks = await Notebook.find({}).sort({ createdAt: -1 });
    return res.json(notebooks);
  } catch (err: any) {
    console.error("Failed to fetch notebooks:", err);
    return res.status(500).json({ error: "Failed to fetch notebooks" });
  }
});

app.post("/api/notebooks", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    await connectToDatabase();
    const notebook = new Notebook({
      name: name.trim(),
    });
    await notebook.save();

    return res.status(201).json(notebook);
  } catch (err: any) {
    console.error("Failed to create notebook:", err);
    return res.status(500).json({ error: "Failed to create notebook" });
  }
});

// 5. Notebook details & deletion
app.get("/api/notebooks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notebook ID" });
    }

    await connectToDatabase();
    const notebook = await Notebook.findById(id);

    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    const sources = await Source.find({ notebookId: id }).sort({ createdAt: -1 });

    return res.json({
      notebook,
      sources,
    });
  } catch (err: any) {
    console.error("Failed to fetch notebook details:", err);
    return res.status(500).json({ error: "Failed to fetch notebook details" });
  }
});

app.delete("/api/notebooks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notebook ID" });
    }

    await connectToDatabase();
    const notebook = await Notebook.findById(id);

    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    // 1. Delete all vectors associated with this notebook in Qdrant
    try {
      await deleteNotebookVectors(id);
    } catch (vectorErr) {
      console.error("Warning: Failed to delete Qdrant vectors for notebook:", id, vectorErr);
    }

    // 2. Delete all sources in MongoDB for this notebook
    await Source.deleteMany({ notebookId: id });

    // 3. Delete the notebook itself in MongoDB
    await Notebook.findByIdAndDelete(id);

    return res.json({ message: "Notebook and all associated sources deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete notebook:", err);
    return res.status(500).json({ error: "Failed to delete notebook" });
  }
});

// 6. Source management (list & add)
app.get("/api/notebooks/:id/sources", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid notebook ID" });
    }

    await connectToDatabase();
    const sources = await Source.find({ notebookId: id }).sort({ createdAt: -1 });

    return res.json(sources);
  } catch (err: any) {
    console.error("Failed to fetch sources:", err);
    return res.status(500).json({ error: "Failed to fetch sources" });
  }
});

app.post("/api/notebooks/:id/sources", upload.single("file"), async (req, res) => {
  try {
    const { id: notebookId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notebookId)) {
      return res.status(400).json({ error: "Invalid notebook ID" });
    }

    await connectToDatabase();
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    const { type, text, name, url } = req.body;

    if (!type || !["pdf", "text", "url", "youtube", "transcript"].includes(type)) {
      return res.status(400).json({ error: "Invalid or missing 'type' field" });
    }

    let originalName = "";
    let filePath: string | undefined;
    let submittedUrl: string | undefined;

    if (type === "pdf" || type === "transcript" || (type === "text" && req.file)) {
      if (!req.file) {
        return res.status(400).json({ error: `File is required for type '${type}'` });
      }
      filePath = req.file.path;
      originalName = req.file.originalname;
    } else if (type === "text" && text) {
      const title = name || `Pasted Text - ${new Date().toLocaleDateString()}`;
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}.txt`;
      filePath = path.join(uploadDir, uniqueName);
      await fs.writeFile(filePath, text, "utf-8");
      originalName = title;
    } else if (type === "url" || type === "youtube") {
      if (!url || url.trim().length === 0) {
        return res.status(400).json({ error: `URL is required for type '${type}'` });
      }
      submittedUrl = url.trim();
      originalName = name || submittedUrl;
    } else {
      return res.status(400).json({ error: "Invalid parameters supplied" });
    }

    // Save metadata using Mongoose
    const source = new Source({
      notebookId: new mongoose.Types.ObjectId(notebookId),
      name: originalName,
      type,
      status: "indexing",
      pathOrUrl: filePath || submittedUrl,
    });
    await source.save();

    // Enqueue the job for parsing and vector embedding in background worker
    const job = await enqueueIndexingJob({
      sourceId: source._id.toString(),
      notebookId,
      type,
      filePath,
      url: submittedUrl,
      name: originalName,
    });

    return res.status(202).json({
      message: "Source created and queued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err: any) {
    console.error("Failed to add source:", err);
    return res.status(500).json({ error: "Failed to add source" });
  }
});

// 7. Re-index and delete individual source
app.post("/api/notebooks/:id/sources/:sourceId", async (req, res) => {
  try {
    const { id: notebookId, sourceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notebookId) || !mongoose.Types.ObjectId.isValid(sourceId)) {
      return res.status(400).json({ error: "Invalid notebook or source ID" });
    }

    await connectToDatabase();
    const source = await Source.findOne({ _id: sourceId, notebookId });

    if (!source) {
      return res.status(404).json({ error: "Source not found in this notebook" });
    }

    // 1. Delete existing vectors in Qdrant to prevent duplicates
    try {
      await deleteSourceVectors(sourceId);
    } catch (vectorErr) {
      console.error("Warning: Failed to delete Qdrant vectors for re-indexing:", sourceId, vectorErr);
    }

    // 2. Update status to indexing
    source.status = "indexing";
    source.error = undefined;
    await source.save();

    // 3. Re-enqueue indexing job
    const isUrlBased = source.type === "url" || source.type === "youtube";
    const job = await enqueueIndexingJob({
      sourceId,
      notebookId,
      type: source.type,
      filePath: isUrlBased ? undefined : source.pathOrUrl,
      url: isUrlBased ? source.pathOrUrl : undefined,
      name: source.name,
    });

    return res.status(202).json({
      message: "Source queued for re-indexing",
      source,
      jobId: job.id,
    });
  } catch (err: any) {
    console.error("Failed to re-index source:", err);
    return res.status(500).json({ error: "Failed to re-index source" });
  }
});

app.delete("/api/notebooks/:id/sources/:sourceId", async (req, res) => {
  try {
    const { id: notebookId, sourceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(notebookId) || !mongoose.Types.ObjectId.isValid(sourceId)) {
      return res.status(400).json({ error: "Invalid notebook or source ID" });
    }

    await connectToDatabase();
    const source = await Source.findOne({ _id: sourceId, notebookId });

    if (!source) {
      return res.status(404).json({ error: "Source not found in this notebook" });
    }

    // 1. Delete associated vectors in Qdrant
    try {
      await deleteSourceVectors(sourceId);
    } catch (vectorErr) {
      console.error("Warning: Failed to delete Qdrant vectors for source:", sourceId, vectorErr);
    }

    // 2. Delete the source from MongoDB
    await Source.findByIdAndDelete(sourceId);

    return res.json({ message: "Source and all its vectors deleted successfully" });
  } catch (err: any) {
    console.error("Failed to delete source:", err);
    return res.status(500).json({ error: "Failed to delete source" });
  }
});

// 8. Generate learning roadmap
app.post("/api/roadmap", async (req, res) => {
  try {
    const { notebookId } = req.body;

    if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
      return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
    }

    await connectToDatabase();
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    // Fetch chunks specifically matching youtube or transcript types in this notebook
    const scrollUrl = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/scroll`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.qdrant.apiKey) {
      headers["api-key"] = config.qdrant.apiKey;
    }
    const qdrantRes = await fetch(scrollUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.notebookId",
              match: { value: notebookId },
            },
            {
              key: "metadata.sourceType",
              match: { value: "youtube" },
            },
          ],
        },
        limit: 100,
        with_payload: true,
      }),
    });

    if (!qdrantRes.ok) {
      throw new Error(`Failed to fetch from Qdrant: ${qdrantRes.statusText}`);
    }

    const qdrantData = (await qdrantRes.json()) as any;
    const points = qdrantData.result?.points || [];

    // Fallback: search for all documents if no youtube transcripts exist specifically
    let combinedData = [...points];
    if (combinedData.length === 0) {
      const fallbackRes = await fetch(scrollUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          filter: {
            must: [
              {
                key: "metadata.notebookId",
                match: { value: notebookId },
              },
            ],
          },
          limit: 100,
          with_payload: true,
        }),
      });
      if (fallbackRes.ok) {
        const data = (await fallbackRes.json()) as any;
        combinedData = data.result?.points || [];
      }
    }

    if (combinedData.length === 0) {
      return res.status(400).json({
        error: "No indexed materials found. Please upload documents or YouTube video links to generate a roadmap.",
      });
    }

    // Map content details
    const sourcesInfo = combinedData.map((p: any) => ({
      text: p.payload?.page_content || p.payload?.text || "",
      sourceName: p.payload?.metadata?.sourceName || "Document",
      sourceType: p.payload?.metadata?.sourceType || "pdf",
      url: p.payload?.metadata?.url || "",
      timestamp: p.payload?.metadata?.timestamp ?? 0,
    }));

    // Compile into compact context for the LLM
    const itemsText = sourcesInfo
      .map(
        (info, idx) =>
          `[Item ${idx + 1}] (title: "${info.sourceName}", type: "${info.sourceType}", timestamp: ${info.timestamp}s, url: "${info.url}")\nContent excerpt: ${info.text.slice(0, 300)}...`
      )
      .join("\n\n")
      .slice(0, 15000);

    const model = new ChatOpenAI({
      model: config.openai.chatModel,
      temperature: 0.3,
      configuration: {
        baseURL: config.openai.baseURL,
        apiKey: config.openai.apiKey,
      },
    });

    const systemPrompt = `You are an expert learning tutor.
Given the following list of indexed document/video fragments, create a personalized step-by-step learning roadmap of concepts found in these sources.
Each learning step (node) MUST pinpoint the specific source, title, and timestamp/URL where it is explained so the student can directly open it to study.

You MUST return the output as a valid JSON object matching this structure with NO extra text or formatting tags:
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
      "timestamp": 120, // Start timestamp in seconds if it is a video (number) or page number if PDF
      "reason": "Why this node comes first or why it is important"
    }
  ]
}
Design a clear progression. Aim for exactly 4-6 roadmap steps.`;

    const response = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the indexed source materials:\n\n${itemsText}` },
    ]);

    let rawText = (response.content as string).trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.slice(7);
    } else if (rawText.startsWith("```")) {
      rawText = rawText.slice(3);
    }
    if (rawText.endsWith("```")) {
      rawText = rawText.slice(0, -3);
    }
    rawText = rawText.trim();

    let roadmap = {};
    try {
      roadmap = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("Failed to parse roadmap JSON:", rawText, parseErr);
      roadmap = {
        title: `Learning Roadmap for ${notebook.name}`,
        description: "A customized study path constructed from your learning materials.",
        nodes: [
          {
            id: "1",
            concept: "Introduction to Material",
            description: "Core definitions and foundational elements described in documents.",
            sourceName: sourcesInfo[0]?.sourceName || "Document",
            sourceType: sourcesInfo[0]?.sourceType || "pdf",
            url: sourcesInfo[0]?.url || "",
            timestamp: sourcesInfo[0]?.timestamp ?? 0,
            reason: "Provides general context for the rest of the syllabus.",
          },
        ],
      };
    }

    return res.json(roadmap);
  } catch (err: any) {
    console.error("Failed to generate learning roadmap API:", err);
    return res.status(500).json({ error: "Failed to generate roadmap" });
  }
});

// 9. Generate audio podcast
app.post("/api/podcast", async (req, res) => {
  try {
    const { notebookId } = req.body;

    if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
      return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
    }

    await connectToDatabase();
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) {
      return res.status(404).json({ error: "Notebook not found" });
    }

    // Fetch text chunks from Qdrant REST API
    const scrollUrl = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/scroll`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.qdrant.apiKey) {
      headers["api-key"] = config.qdrant.apiKey;
    }
    const qdrantRes = await fetch(scrollUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: {
          must: [
            {
              key: "metadata.notebookId",
              match: { value: notebookId },
            },
          ],
        },
        limit: 100, // retrieve first 100 chunks
        with_payload: true,
      }),
    });

    if (!qdrantRes.ok) {
      throw new Error(`Failed to fetch context from Qdrant: ${qdrantRes.statusText}`);
    }

    const qdrantData = (await qdrantRes.json()) as any;
    const points = qdrantData.result?.points || [];

    if (points.length === 0) {
      return res.status(400).json({
        error: "No ingested content found in this notebook. Please upload some sources first.",
      });
    }

    // Compile the text content
    const textChunks = points.map((p: any) => p.payload?.page_content || p.payload?.text || "");
    const fullContext = textChunks.join("\n\n").slice(0, 15000); // limit to 15k characters

    const model = new ChatOpenAI({
      model: config.openai.chatModel,
      temperature: 0.7,
      configuration: {
        baseURL: config.openai.baseURL,
        apiKey: config.openai.apiKey,
      },
    });

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

    let rawScriptText = (response.content as string).trim();

    if (rawScriptText.startsWith("```json")) {
      rawScriptText = rawScriptText.slice(7);
    } else if (rawScriptText.startsWith("```")) {
      rawScriptText = rawScriptText.slice(3);
    }
    if (rawScriptText.endsWith("```")) {
      rawScriptText = rawScriptText.slice(0, -3);
    }
    rawScriptText = rawScriptText.trim();

    let script: { speaker: string; text: string }[] = [];
    try {
      script = JSON.parse(rawScriptText);
    } catch (parseErr) {
      console.error("Failed to parse script JSON from model output:", rawScriptText, parseErr);
      script = [
        { speaker: "Host A", text: "Welcome back! Today we are exploring the files inside our notebook." },
        { speaker: "Host B", text: "That's right, Andrew. The documents outline critical research and data that we'll dive into today." },
      ];
    }

    // Generate TTS audio for each dialogue turn
    const audioBuffers: Buffer[] = [];

    for (const turn of script) {
      const tts = new MsEdgeTTS();
      const voice = turn.speaker === "Host A" ? "en-US-AndrewNeural" : "en-US-EmmaNeural";

      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      try {
        const { audioStream } = tts.toStream(turn.text);
        const buffer = await streamToBuffer(audioStream);
        audioBuffers.push(buffer);
      } catch (ttsErr) {
        console.error(`Edge TTS failed for speaker ${turn.speaker}:`, ttsErr);
      }
    }

    if (audioBuffers.length === 0) {
      return res.status(500).json({ error: "Failed to generate audio podcast" });
    }

    // Stitch MP3 audio streams together
    const finalMp3Buffer = Buffer.concat(audioBuffers);
    const fileName = `${notebookId}.mp3`;
    const filePath = path.join(podcastsDir, fileName);
    await fs.writeFile(filePath, finalMp3Buffer);

    return res.json({
      success: true,
      audioUrl: `/podcasts/${fileName}`,
      script,
    });
  } catch (err: any) {
    console.error("Failed to generate podcast API:", err);
    return res.status(500).json({ error: "Failed to generate podcast" });
  }
});

// -------------------------------------------------------------
// SERVER INITIALIZATION
// -------------------------------------------------------------
connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Express server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize server: MongoDB connection error", err);
    process.exit(1);
  });
