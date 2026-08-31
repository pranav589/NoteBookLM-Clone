import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import mongoose from "mongoose";
import { Notebook } from "../lib/db";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../lib/cloudinary";
import { PodcastTurn } from "../types";

function streamToBuffer(readableStream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    readableStream.on("data", (data: any) => {
      chunks.push(data);
    });
    readableStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on("error", (err: any) => {
      reject(err);
    });
  });
}

export class TTSService {
  public static async generatePodcastAudio(
    notebookId: string,
    script: PodcastTurn[]
  ): Promise<{ audioUrl: string; cloudinaryPublicId: string }> {
    const audioBuffers: Buffer[] = [];

    for (const turn of script) {
      const tts = new MsEdgeTTS();
      const voice =
        turn.speaker === "Host A" ? "en-US-AndrewNeural" : "en-US-EmmaNeural";

      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      try {
        const { audioStream } = tts.toStream(turn.text);
        const buffer = await streamToBuffer(audioStream);
        audioBuffers.push(buffer);
      } catch (ttsErr) {
        console.error(`Edge TTS failed for speaker ${turn.speaker}:`, ttsErr);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error("Failed to generate any audio buffers via TTS");
    }

    const finalMp3Buffer = Buffer.concat(audioBuffers);

    // Clean up previous podcast audio file if exists to prevent orphaned files
    try {
      const notebook = await Notebook.findById(notebookId);
      if (notebook?.podcast?.cloudinaryPublicId) {
        await deleteFromCloudinary(notebook.podcast.cloudinaryPublicId, "video");
      }
    } catch (cleanupErr) {
      console.error("Warning: Failed to clean up previous podcast:", cleanupErr);
    }

    // Upload new podcast audio to Cloudinary
    const uploadRes = await uploadBufferToCloudinary(
      finalMp3Buffer,
      "mindly/podcasts",
      `podcast-${notebookId}.mp3`,
      "video"
    );

    return {
      audioUrl: uploadRes.secure_url,
      cloudinaryPublicId: uploadRes.public_id,
    };
  }
}
