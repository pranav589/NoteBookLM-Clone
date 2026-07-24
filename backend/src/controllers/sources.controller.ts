import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { SourceService } from "../services/source.service";
import { SourceType } from "../types";

export class SourcesController {
  public static async list(req: Request, res: Response, next: NextFunction) {
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

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: notebookId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const { type, text, name, url } = req.body;
      if (!type || !["pdf", "text", "url", "youtube", "transcript"].includes(type)) {
        return res.status(400).json({ error: "Invalid or missing 'type' field" });
      }

      const { source, jobId } = await SourceService.createSource({
        notebookId,
        type: type as SourceType,
        text,
        name,
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

  public static async reindex(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, sourceId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(sourceId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or source ID" });
      }

      const { source, jobId } = await SourceService.reindexSource(notebookId, sourceId);

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

  public static async delete(req: Request, res: Response, next: NextFunction) {
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
