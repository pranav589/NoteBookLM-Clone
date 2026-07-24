import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

export const uploadDir = path.join(process.cwd(), "uploads");
export const podcastsDir = path.join(process.cwd(), "podcasts");

// Synchronously ensure directories exist on module load
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(podcastsDir)) {
  fs.mkdirSync(podcastsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({ storage });
