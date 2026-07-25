import { Router } from "express";
import mongoose from "mongoose";
import { getGridFSBucket, getFileMetadataFromGridFS } from "../lib/gridfs";

const router = Router();

router.get("/:fileId", async (req, res, next) => {
  try {
    const { fileId } = req.params;

    if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: "Invalid or missing 'fileId'" });
    }

    // Get metadata details first
    const metadata = await getFileMetadataFromGridFS(fileId);
    if (!metadata) {
      return res.status(404).json({ error: "File not found in database media storage." });
    }

    // Set correct MIME headers
    res.setHeader("Content-Type", metadata.metadata?.contentType || metadata.contentType || "application/octet-stream");
    res.setHeader("Content-Length", metadata.length);
    res.setHeader("Accept-Ranges", "bytes");

    // Open download stream and pipe it to standard Express response
    const downloadStream = getGridFSBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
    downloadStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
