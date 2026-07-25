import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Source, ISource } from "../lib/db";
import { enqueueIndexingJob } from "../lib/queue";
import { deleteSourceVectors } from "../lib/rag-helper";
import { config } from "../config";
import { uploadDir } from "../middleware/upload.middleware";
import { SourceType } from "../types";

export class SourceService {
  public static async getSourcesByNotebookId(
    notebookId: string,
  ): Promise<ISource[]> {
    return Source.find({ notebookId }).sort({ createdAt: -1 });
  }

  public static async createSource(params: {
    notebookId: string;
    userId: string;
    type: SourceType;
    text?: string;
    name?: string;
    url?: string;
    file?: Express.Multer.File;
  }): Promise<{ source: ISource; jobId: string }> {
    const { notebookId, userId, type, text, name, url, file } = params;

    let originalName = "";
    let filePath: string | undefined;
    let submittedUrl: string | undefined;

    if (type === "pdf" || type === "transcript" || (type === "text" && file)) {
      if (!file) {
        throw new Error(`File is required for source type '${type}'`);
      }
      filePath = file.path;
      originalName = file.originalname;
    } else if (type === "text" && text) {
      const title = name || `Pasted Text - ${new Date().toLocaleDateString()}`;
      const uniqueName = `${Date.now()}-${crypto.randomUUID()}.txt`;
      // Store text files under user-specific dir
      const userDir = path.join(uploadDir, userId);
      //@ts-ignore
      if (!fs.existsSync(userDir)) await fs.mkdir(userDir, { recursive: true });
      filePath = path.join(userDir, uniqueName);
      await fs.writeFile(filePath, text, "utf-8");
      originalName = title;
    } else if (type === "url" || type === "youtube") {
      if (!url || url.trim().length === 0) {
        throw new Error(`URL is required for source type '${type}'`);
      }
      submittedUrl = url.trim();
      originalName = name || submittedUrl;
    } else {
      throw new Error("Invalid parameters supplied for source creation");
    }

    const source = new Source({
      notebookId: new mongoose.Types.ObjectId(notebookId),
      name: originalName,
      type,
      status: "indexing",
      pathOrUrl: filePath || submittedUrl,
    });
    await source.save();

    const job = await enqueueIndexingJob({
      sourceId: source._id.toString(),
      notebookId,
      userId,
      type,
      filePath,
      url: submittedUrl,
      name: originalName,
    });

    return { source, jobId: job.id as string };
  }

  public static async reindexSource(
    notebookId: string,
    sourceId: string,
    userId: string,
  ): Promise<{ source: ISource; jobId: string }> {
    const source = await Source.findOne({ _id: sourceId, notebookId });

    if (!source) {
      throw new Error("Source not found in this notebook");
    }

    try {
      await deleteSourceVectors(sourceId);
    } catch (vectorErr) {
      console.error(
        "Warning: Failed to delete Qdrant vectors for re-indexing:",
        sourceId,
        vectorErr,
      );
    }

    source.status = "indexing";
    source.error = undefined;
    await source.save();

    const isUrlBased = source.type === "url" || source.type === "youtube";
    const job = await enqueueIndexingJob({
      sourceId,
      notebookId,
      userId,
      type: source.type,
      filePath: isUrlBased ? undefined : source.pathOrUrl,
      url: isUrlBased ? source.pathOrUrl : undefined,
      name: source.name,
    });

    return { source, jobId: job.id as string };
  }

  public static async deleteSource(
    notebookId: string,
    sourceId: string,
  ): Promise<void> {
    const source = await Source.findOne({ _id: sourceId, notebookId });

    if (!source) {
      throw new Error("Source not found in this notebook");
    }

    try {
      await deleteSourceVectors(sourceId);
    } catch (vectorErr) {
      console.error(
        "Warning: Failed to delete Qdrant vectors for source:",
        sourceId,
        vectorErr,
      );
    }

    await Source.findByIdAndDelete(sourceId);
  }

  public static async fetchQdrantPoints(
    notebookId: string,
    sourceTypeFilter?: string,
  ): Promise<any[]> {
    const scrollUrl = `${config.qdrant.url}/collections/${config.qdrant.collection}/points/scroll`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.qdrant.apiKey) {
      headers["api-key"] = config.qdrant.apiKey;
    }

    const filterMust: any[] = [
      {
        key: "metadata.notebookId",
        match: { value: notebookId },
      },
    ];

    if (sourceTypeFilter) {
      filterMust.push({
        key: "metadata.sourceType",
        match: { value: sourceTypeFilter },
      });
    }

    const qdrantRes = await fetch(scrollUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: { must: filterMust },
        limit: 100,
        with_payload: true,
      }),
    });

    if (!qdrantRes.ok) {
      throw new Error(`Failed to fetch from Qdrant: ${qdrantRes.statusText}`);
    }

    const qdrantData = (await qdrantRes.json()) as any;
    return qdrantData.result?.points || [];
  }
}
