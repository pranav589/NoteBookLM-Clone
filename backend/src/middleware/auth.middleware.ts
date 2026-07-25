import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Notebook } from "../models/Notebook";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: "Access denied. No session token provided." });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET || "fallback_default_jwt_secret_key_123456";
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired session token." });
  }
};

export const checkNotebookOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const notebookId = req.params.id || req.body.notebookId || req.query.notebookId;

  if (!notebookId) {
    next();
    return;
  }

  if (!mongoose.Types.ObjectId.isValid(notebookId)) {
    res.status(400).json({ error: "Invalid notebook ID" });
    return;
  }

  try {
    const notebook = await Notebook.findById(notebookId);
    if (!notebook) {
      res.status(404).json({ error: "Notebook not found" });
      return;
    }
    if (notebook.userEmail !== req.user?.email) {
      res.status(403).json({ error: "Access denied. You do not own this notebook." });
      return;
    }
    next();
  } catch (error) {
    res.status(500).json({ error: "Database error during ownership verification" });
  }
};
