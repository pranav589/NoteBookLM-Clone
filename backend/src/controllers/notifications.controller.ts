import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Notification } from "../lib/db";
import { sseManager } from "../lib/sse-manager";

export class NotificationsController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: notebookId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(notebookId)) {
        return res.status(400).json({ error: "Invalid notebook ID" });
      }

      const notifications = await Notification.find({
        notebookId: new mongoose.Types.ObjectId(notebookId),
      }).sort({ createdAt: -1 });

      return res.json(notifications);
    } catch (err) {
      return next(err);
    }
  }

  public static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, notificationId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(notificationId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or notification ID" });
      }

      await Notification.findOneAndUpdate(
        { _id: notificationId, notebookId },
        { isRead: true }
      );

      // Trigger SSE notification list reload event so all clients refresh their state
      await sseManager.publish(notebookId, {
        type: "notifications:updated",
      });

      return res.json({ success: true });
    } catch (err) {
      return next(err);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: notebookId, notificationId } = req.params;
      if (
        !mongoose.Types.ObjectId.isValid(notebookId) ||
        !mongoose.Types.ObjectId.isValid(notificationId)
      ) {
        return res.status(400).json({ error: "Invalid notebook or notification ID" });
      }

      await Notification.findOneAndDelete({ _id: notificationId, notebookId });

      // Trigger SSE event
      await sseManager.publish(notebookId, {
        type: "notifications:updated",
      });

      return res.json({ success: true });
    } catch (err) {
      return next(err);
    }
  }
}
