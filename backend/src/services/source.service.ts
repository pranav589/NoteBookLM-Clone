import mongoose from "mongoose";
import { config } from "../config";
import { ISource, Source } from "../lib/db";
import {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  getCloudinaryResourceType,
} from "../lib/cloudinary";
import { deleteSourceVectors } from "../rag";
import { enqueueIndexingJob } from "../lib/queue";
import { SourceType } from "../types";

export class SourceService {
  public static async getSourcesByNotebookId(
    notebookId: string,
  ): Promise<ISource[]> {
    return Source.find({ notebookId }).sort({ createdAt: -1 });
  }

  public static async getSource(
    notebookId: string,
    sourceId: string,
  ): Promise<ISource> {
    const source = await Source.findOne({ _id: sourceId, notebookId });
    if (!source) {
      throw new Error("Source not found");
    }
    return source;
  }

  public static async createSource(params: {
    notebookId: string;
    userId: string;
    type: SourceType;
    text?: string;
    name?: string;
    description?: string;
    url?: string;
    file?: Express.Multer.File;
  }): Promise<{ source: ISource; jobId: string }> {
    const { notebookId, userId, type, text, name, description, url, file } = params;

    let originalName = name || "";
    let filePath: string | undefined;
    let submittedUrl: string | undefined;
    let cloudinaryId: string | undefined;

    if (
      type === "pdf" ||
      type === "transcript" ||
      type === "image" ||
      type === "video" ||
      (type === "text" && file)
    ) {
      if (!file) {
        throw new Error(`File is required for source type '${type}'`);
      }
      const resourceType = getCloudinaryResourceType(type);
      const uploadRes = await uploadBufferToCloudinary(
        file.buffer,
        "mindly/sources",
        file.originalname,
        resourceType
      );
      filePath = uploadRes.secure_url;
      cloudinaryId = uploadRes.public_id;
      if (!originalName) {
        originalName = file.originalname;
      }
    } else if (type === "text" && text) {
      const title = name || `Pasted Text - ${new Date().toLocaleDateString()}`;
      const textBuffer = Buffer.from(text, "utf-8");
      const uploadRes = await uploadBufferToCloudinary(
        textBuffer,
        "mindly/sources",
        `${title}.txt`,
        "raw"
      );
      filePath = uploadRes.secure_url;
      cloudinaryId = uploadRes.public_id;
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
      description,
      type,
      status: "indexing",
      pathOrUrl: filePath || submittedUrl,
      cloudinaryPublicId: cloudinaryId,
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

    // Clean up Cloudinary file if public ID exists
    if (source.cloudinaryPublicId) {
      try {
        const resourceType = getCloudinaryResourceType(source.type);
        await deleteFromCloudinary(source.cloudinaryPublicId, resourceType);
      } catch (cloudinaryErr) {
        console.error(
          "Warning: Failed to delete file from Cloudinary:",
          source.cloudinaryPublicId,
          cloudinaryErr,
        );
      }
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
      if (qdrantRes.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch from Qdrant: ${qdrantRes.statusText}`);
    }

    const qdrantData = (await qdrantRes.json()) as any;
    return qdrantData.result?.points || [];
  }
}
