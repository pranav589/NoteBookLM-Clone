import { Request, Response, NextFunction } from "express";
import { AssemblyAI } from "assemblyai";
import { config } from "../lib/config";

export class TranscribeController {
  public static async transcribe(req: any, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded (field: 'file')" });
      }

      const apiKey = config.assemblyai.apiKey || process.env.ASSEMBLYAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "AssemblyAI API Key is not configured on the backend." });
      }

      const client = new AssemblyAI({ apiKey });

      // Transcribe directly from the memory buffer provided by multer
      const transcript = await client.transcripts.transcribe({
        audio: req.file.buffer,
      });

      if (transcript.status === "error") {
        throw new Error(`AssemblyAI transcription error: ${transcript.error}`);
      }

      return res.status(200).json({ text: (transcript.text || "").trim() });
    } catch (err: any) {
      console.error("Transcription failed:", err);
      return next(err);
    }
  }
}
