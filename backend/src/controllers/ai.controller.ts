import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Notebook, Notification, ChatMessage } from "../lib/db";
import { enqueueIndexingJob, enqueueQueryJob } from "../lib/queue";
import { SourceService } from "../services/source.service";
import { AIService } from "../services/ai.service";
import { TTSService } from "../services/tts.service";
import { sseManager } from "../lib/sse-manager";
import { askAgent } from "../rag";

export class AIController {
  // Legacy direct file indexing endpoint
  public static async indexLegacy(req: any, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded (field: 'file')" });
      }

      if (req.file.mimetype !== "application/pdf") {
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }

      const userId = req.user?.id || "legacy-user";

      const job = await enqueueIndexingJob({
        sourceId: "legacy-direct-upload",
        notebookId: "legacy-direct-upload",
        userId,
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
    } catch (err) {
      return next(err);
    }
  }

  // Process search query asynchronously via BullMQ and return a job ID
  public static async query(req: Request, res: Response, next: NextFunction) {
    try {
      const { query, notebookId, clientMessageId } = req.body;

      if (typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Body must include a non-empty 'query' string" });
      }

      if (typeof notebookId !== "string" || notebookId.trim().length === 0) {
        return res.status(400).json({ error: "Body must include a non-empty 'notebookId' string" });
      }

      if (typeof clientMessageId !== "string" || clientMessageId.trim().length === 0) {
        return res.status(400).json({ error: "Body must include a non-empty 'clientMessageId' string" });
      }

      // Enqueue the query job for worker execution
      const job = await enqueueQueryJob({
        query: query.trim(),
        notebookId: notebookId.trim(),
        clientMessageId: clientMessageId.trim(),
      });

      return res.status(202).json({
        message: "Query queued successfully",
        jobId: job.id,
      });
    } catch (err) {
      return next(err);
    }
  }

  // Generate learning roadmap
  public static async roadmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { notebookId } = req.body;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      // Fetch chunks specifically matching youtube or transcript types in this notebook
      let points = await SourceService.fetchQdrantPoints(notebookId, "youtube");

      // Fallback: search for all documents if no youtube transcripts exist specifically
      if (points.length === 0) {
        points = await SourceService.fetchQdrantPoints(notebookId);
      }

      if (points.length === 0) {
        return res.status(400).json({
          error:
            "No indexed materials found. Please upload documents or YouTube video links to generate a roadmap.",
        });
      }

      // Mark notebook as generating roadmap (survives page refresh)
      await Notebook.findByIdAndUpdate(notebookId, { roadmapStatus: "generating" });

      // Return immediate response with 202 Accepted status
      res.status(202).json({ message: "Roadmap generation initiated" });

      // Run generation in the background with SSE updates
      (async () => {
        const startNotif = await Notification.create({
          notebookId,
          type: "progress",
          title: "Building Concept Syllabus",
          message: "Preparing study materials and extracting knowledge segments...",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "roadmap:progress",
          message: "Preparing study materials and extracting knowledge segments...",
          dbNotificationId: startNotif._id,
        });

        // Map content details
        const sourcesInfo = points.map((p: any) => ({
          text: p.payload?.content || p.payload?.page_content || p.payload?.text || "",
          sourceName: p.payload?.metadata?.sourceName || "Document",
          sourceType: p.payload?.metadata?.sourceType || "pdf",
          url: p.payload?.metadata?.url || "",
          timestamp: p.payload?.metadata?.timestamp ?? p.payload?.metadata?.pageNumber ?? 0,
        }));

        // Compile into compact context for the LLM
        const itemsText = sourcesInfo
          .map((info, idx) => {
            const locInfo = info.sourceType === "pdf"
              ? `pageNumber: ${info.timestamp}`
              : `timestamp: ${info.timestamp} seconds`;

            return `[Item ${idx + 1}] (title: "${info.sourceName}", type: "${
              info.sourceType
            }", ${locInfo}, url: "${info.url}")\nContent excerpt: ${info.text.slice(
              0,
              350
            )}...`;
          })
          .join("\n\n")
          .slice(0, 15000);

        await Notification.findByIdAndUpdate(startNotif._id, {
          message: "Synthesizing structured learning nodes with the AI agent...",
        });

        await sseManager.publish(notebookId, {
          type: "roadmap:progress",
          message: "Synthesizing structured learning nodes with the AI agent...",
          dbNotificationId: startNotif._id,
        });

        let roadmapResult = {};
        try {
          roadmapResult = await AIService.generateRoadmap(itemsText);
        } catch (parseErr) {
          console.error("Failed to generate roadmap JSON. Using fallback logic:", parseErr);
          roadmapResult = {
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

        const updatedNotebook = await Notebook.findById(notebookId);
        if (updatedNotebook) {
          updatedNotebook.roadmap = roadmapResult;
          updatedNotebook.roadmapStatus = "idle";
          await updatedNotebook.save();
        }

        // Clean up start progress notification
        await Notification.findByIdAndDelete(startNotif._id);

        // Create permanent success notification
        const completeNotif = await Notification.create({
          notebookId,
          type: "success",
          title: "Roadmap Syllabus Generated",
          message: "Your concept timeline syllabus and sources maps are ready!",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "roadmap:complete",
          roadmap: roadmapResult,
          dbNotificationId: completeNotif._id,
        });
      })().catch(async (err) => {
        console.error("Error generating roadmap asynchronously:", err);
        
        try {
          await Notification.findOneAndDelete({ notebookId, type: "progress", title: "Building Concept Syllabus" });
        } catch (cleanErr) {
          console.error(cleanErr);
        }

        // Clear generating status on failure
        try { await Notebook.findByIdAndUpdate(notebookId, { roadmapStatus: "idle" }); } catch (_) {}

        const failNotif = await Notification.create({
          notebookId,
          type: "error",
          title: "Roadmap Synthesis Failed",
          message: err.message || "Failed to generate roadmap",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "roadmap:failed",
          error: err.message || "Failed to generate roadmap",
          dbNotificationId: failNotif._id,
        });
      });
    } catch (err) {
      return next(err);
    }
  }

  // Generate audio podcast
  public static async podcast(req: Request, res: Response, next: NextFunction) {
    try {
      const { notebookId } = req.body;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      // Fetch text chunks from Qdrant REST API
      const points = await SourceService.fetchQdrantPoints(notebookId);

      if (points.length === 0) {
        return res.status(400).json({
          error: "No ingested content found in this notebook. Please upload some sources first.",
        });
      }

      // Mark notebook as generating podcast (survives page refresh)
      await Notebook.findByIdAndUpdate(notebookId, { podcastStatus: "generating" });

      // Return immediate response with 202 Accepted status
      res.status(202).json({ message: "Podcast generation initiated" });

      // Run generation in the background with SSE updates
      (async () => {
        const startNotif = await Notification.create({
          notebookId,
          type: "progress",
          title: "Synthesizing Audio Podcast",
          message: "Analyzing materials and drafting discussion script...",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "podcast:progress",
          message: "Analyzing materials and drafting discussion script...",
          dbNotificationId: startNotif._id,
        });

        // Compile the text content
        const textChunks = points.map((p: any) => p.payload?.content || p.payload?.page_content || p.payload?.text || "");
        const fullContext = textChunks.join("\n\n").slice(0, 15000); // limit to 15k characters

        let script: { speaker: string; text: string }[] = [];
        try {
          script = await AIService.generatePodcastScript(fullContext);
        } catch (parseErr) {
          console.error("Failed to generate script JSON. Using fallback script:", parseErr);
          script = [
            {
              speaker: "Host A",
              text: "Welcome back! Today we are exploring the files inside our notebook.",
            },
            {
              speaker: "Host B",
              text:
                "That's right, Andrew. The documents outline critical research and data that we'll dive into today.",
            },
          ];
        }

        await Notification.findByIdAndUpdate(startNotif._id, {
          message: "Synthesizing conversational audio podcast voices (this can take 30-60 seconds)...",
        });

        await sseManager.publish(notebookId, {
          type: "podcast:progress",
          message: "Synthesizing conversational audio podcast voices (this can take 30-60 seconds)...",
          dbNotificationId: startNotif._id,
        });

        const podcastResult = await TTSService.generatePodcastAudio(notebookId, script);

        const updatedNotebook = await Notebook.findById(notebookId);
        if (updatedNotebook) {
          updatedNotebook.podcast = {
            audioUrl: podcastResult.audioUrl,
            cloudinaryPublicId: podcastResult.cloudinaryPublicId,
            script,
          };
          updatedNotebook.podcastStatus = "idle";
          await updatedNotebook.save();
        }

        // Clean up start progress notification
        await Notification.findByIdAndDelete(startNotif._id);

        // Create permanent success notification
        const completeNotif = await Notification.create({
          notebookId,
          type: "success",
          title: "Audio Podcast Dialog Synthesized",
          message: "Your host discussion script and audio dialogue files are ready!",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "podcast:complete",
          audioUrl: podcastResult.audioUrl,
          script,
          dbNotificationId: completeNotif._id,
        });
      })().catch(async (err) => {
        console.error("Error generating podcast asynchronously:", err);
        
        try {
          await Notification.findOneAndDelete({ notebookId, type: "progress", title: "Synthesizing Audio Podcast" });
        } catch (cleanErr) {
          console.error(cleanErr);
        }

        // Clear generating status on failure
        try { await Notebook.findByIdAndUpdate(notebookId, { podcastStatus: "idle" }); } catch (_) {}

        const failNotif = await Notification.create({
          notebookId,
          type: "error",
          title: "Podcast Audio Synthesis Failed",
          message: err.message || "Failed to generate podcast audio",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "podcast:failed",
          error: err.message || "Failed to generate podcast audio",
          dbNotificationId: failNotif._id,
        });
      });
    } catch (err) {
      return next(err);
    }
  }

  // Generate interactive mind map
  public static async mindmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { notebookId } = req.body;

      if (!notebookId || !mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid or missing 'notebookId'" });
      }

      const notebook = await Notebook.findById(notebookId);
      if (!notebook) {
        return res.status(404).json({ error: "Notebook not found" });
      }

      // Fetch indexed content from Qdrant
      const points = await SourceService.fetchQdrantPoints(notebookId);

      if (points.length === 0) {
        return res.status(400).json({
          error: "No indexed materials found. Please upload documents or add sources first.",
        });
      }

      // Mark notebook as generating mind map (survives page refresh)
      await Notebook.findByIdAndUpdate(notebookId, { mindMapStatus: "generating" });

      // Return immediate response with 202 Accepted status
      res.status(202).json({ message: "Mind map generation initiated" });

      // Run generation in the background with SSE updates
      (async () => {
        const startNotif = await Notification.create({
          notebookId,
          type: "progress",
          title: "Building Concept Mind Map",
          message: "Retrieving and analyzing source materials...",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "mindmap:progress",
          message: "Retrieving and analyzing source materials...",
          dbNotificationId: startNotif._id,
        });

        // Map content details including sourceId
        const sourcesInfo = points.map((p: any) => ({
          text: p.payload?.content || p.payload?.page_content || p.payload?.text || "",
          sourceId: p.payload?.metadata?.sourceId || "",
          sourceName: p.payload?.metadata?.sourceName || "Document",
          sourceType: p.payload?.metadata?.sourceType || "text",
          timestamp: p.payload?.metadata?.timestamp,
          pageNumber: p.payload?.metadata?.pageNumber,
        }));

        // Compile into compact context for the LLM
        const itemsText = sourcesInfo
          .map((info, idx) => {
            const locInfo = info.sourceType === "pdf"
              ? `pageNumber: ${info.pageNumber || 0}`
              : `timestamp: ${info.timestamp || 0} seconds`;

            return `[Item ${idx + 1}] (title: "${info.sourceName}", type: "${
              info.sourceType
            }", ${locInfo}, sourceId: "${info.sourceId}")\nContent excerpt: ${info.text.slice(
              0,
              400
            )}...`;
          })
          .join("\n\n")
          .slice(0, 15000);

        await Notification.findByIdAndUpdate(startNotif._id, {
          message: "Extracting concepts and relationships with AI...",
        });

        await sseManager.publish(notebookId, {
          type: "mindmap:progress",
          message: "Extracting concepts and relationships with AI...",
          dbNotificationId: startNotif._id,
        });

        let mindMapResult;
        try {
          mindMapResult = await AIService.generateMindMap(itemsText);
        } catch (parseErr) {
          console.error("Failed to generate mind map JSON. Using fallback:", parseErr);
          
          // Fallback: Create basic graph from first 3 sources
          mindMapResult = {
            nodes: sourcesInfo.slice(0, 3).map((src, idx) => ({
              id: String(idx + 1),
              label: src.sourceName || "Concept",
              summary: "Generated from basic source extraction due to parsing error.",
              description:
                "Generated from basic source extraction. Regenerate the mind map for a fuller teaching explanation of this concept.",
              keyPoints: [
                "This concept was extracted from your indexed source materials.",
                "Regenerate to get key points, examples, and related questions.",
              ],
              whyItMatters: "It appears as a core topic in your uploaded sources.",
              difficulty: "intro" as const,
              relatedQuestions: [
                `Explain "${src.sourceName || "this concept"}" simply based on my sources`,
                `What should I learn before studying "${src.sourceName || "this topic"}"?`,
              ],
              sourceId: src.sourceId || "",
              sourceName: src.sourceName || "Document",
              sourceType: src.sourceType || "text",
              sourceLocation: src.timestamp ?? src.pageNumber ?? 0,
            })),
            edges: [],
          };
        }

        const updatedNotebook = await Notebook.findById(notebookId);
        if (updatedNotebook) {
          updatedNotebook.mindMap = mindMapResult;
          updatedNotebook.mindMapStatus = "idle";
          await updatedNotebook.save();
        }

        // Clean up start progress notification
        await Notification.findByIdAndDelete(startNotif._id);

        // Create permanent success notification
        const completeNotif = await Notification.create({
          notebookId,
          type: "success",
          title: "Mind Map Generated",
          message: "Your interactive concept map is ready to explore!",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "mindmap:complete",
          mindMap: mindMapResult,
          dbNotificationId: completeNotif._id,
        });
      })().catch(async (err) => {
        console.error("Error generating mind map asynchronously:", err);
        
        try {
          await Notification.findOneAndDelete({ notebookId, type: "progress", title: "Building Concept Mind Map" });
        } catch (cleanErr) {
          console.error(cleanErr);
        }

        // Clear generating status on failure
        try { await Notebook.findByIdAndUpdate(notebookId, { mindMapStatus: "idle" }); } catch (_) {}

        const failNotif = await Notification.create({
          notebookId,
          type: "error",
          title: "Mind Map Generation Failed",
          message: err.message || "Failed to generate mind map. Try regenerating or check source content.",
          isRead: false,
        });

        await sseManager.publish(notebookId, {
          type: "mindmap:failed",
          error: err.message || "Failed to generate mind map",
          dbNotificationId: failNotif._id,
        });
      });
    } catch (err) {
      return next(err);
    }
  }
}
