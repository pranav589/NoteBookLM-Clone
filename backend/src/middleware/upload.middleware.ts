import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { AuthRequest } from "./auth.middleware";

export const uploadDir = path.join(process.cwd(), "uploads");
export const podcastsDir = path.join(process.cwd(), "podcasts");

// Ensure base directories exist on module load
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(podcastsDir)) {
  fs.mkdirSync(podcastsDir, { recursive: true });
}

/**
 * Returns the user-specific upload directory: uploads/{userId}/
 * Creates the directory if it doesn't exist.
 */
export function getUserUploadDir(userId: string): string {
  const dir = path.join(uploadDir, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

const storage = multer.memoryStorage();

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  }
});
