import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { NotebookService } from "../services/notebook.service";
import { ChatMessage } from "../lib/db";
import { sseManager } from "../lib/sse-manager";

export class NotebooksController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const notebooks = await NotebookService.listNotebooks();
      return res.json(notebooks);
    } catch (err) {
      return next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }

      const notebook = await NotebookService.createNotebook(name);
      return res.status(201).json(notebook);
    } catch (err) {
      return next(err);
    }
  }

  public static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const details = await NotebookService.getNotebookDetails(id);
      return res.json(details);
    } catch (err: any) {
      if (err.message === "Notebook not found") {
        return res.status(404).json({ error: err.message });
      }
      return next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      await NotebookService.deleteNotebook(id);
      return res.json({
        message: "Notebook and all associated sources deleted successfully",
      });
    } catch (err: any) {
      if (err.message === "Notebook not found") {
        return res.status(404).json({ error: err.message });
      }
      return next(err);
    }
  }

  public static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const messages = await ChatMessage.find({ notebookId: new mongoose.Types.ObjectId(id) })
        .sort({ createdAt: 1 });

      return res.json(messages);
    } catch (err) {
      return next(err);
    }
  }

  public static async sse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      sseManager.register(id, res);

      req.on("close", () => {
        sseManager.unregister(id, res);
      });
    } catch (err) {
      return next(err);
    }
  }
}
