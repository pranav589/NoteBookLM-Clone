import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { SourceService } from "../services/source.service";
import { SourceType, SOURCE_TYPES } from "../types";
import { AuthRequest } from "../middleware/auth.middleware";

export class SourcesController {
  public static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: notebookId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const sources = await SourceService.getSourcesByNotebookId(notebookId);
      return res.json(sources);
    } catch (err) {
      return next(err);
    }
  }

  public static async get(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, sourceId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(sourceId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or source ID" });
      }

      const source = await SourceService.getSource(notebookId, sourceId);
      return res.json(source);
    } catch (err: any) {
      if (err.message === "Source not found") {
        return res.status(404).json({ error: err.message });
      }
      return next(err);
    }
  }

  public static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: notebookId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const userId = req.user!.id;
      const { type, text, name, description, url } = req.body;
      if (!type || !SOURCE_TYPES.includes(type as any)) {
        return res.status(400).json({ error: "Invalid or missing 'type' field" });
      }

      const { source, jobId } = await SourceService.createSource({
        notebookId,
        userId,
        type: type as SourceType,
        text,
        name,
        description,
        url,
        file: req.file,
      });

      return res.status(202).json({
        message: "Source created and queued for indexing",
        source,
        jobId,
      });
    } catch (err: any) {
      if (err.message.includes("File is required") || err.message.includes("URL is required")) {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }
  }

  public static async reindex(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, sourceId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(sourceId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or source ID" });
      }

      const userId = req.user!.id;
      const { source, jobId } = await SourceService.reindexSource(notebookId, sourceId, userId);

      return res.status(202).json({
        message: "Source queued for re-indexing",
        source,
        jobId,
      });
    } catch (err: any) {
      if (err.message === "Source not found in this notebook") {
        return res.status(404).json({ error: err.message });
      }
      return next(err);
    }
  }

  public static async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, sourceId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(sourceId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or source ID" });
      }

      await SourceService.deleteSource(notebookId, sourceId);

      return res.json({ message: "Source and all its vectors deleted successfully" });
    } catch (err: any) {
      if (err.message === "Source not found in this notebook") {
        return res.status(404).json({ error: err.message });
      }
      return next(err);
    }
  }
}
