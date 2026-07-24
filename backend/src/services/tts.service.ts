import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import path from "path";
import fs from "fs/promises";
import { podcastsDir } from "../middleware/upload.middleware";
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
  ): Promise<string> {
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
    const fileName = `${notebookId}.mp3`;
    const filePath = path.join(podcastsDir, fileName);
    await fs.writeFile(filePath, finalMp3Buffer);

    return `/podcasts/${fileName}`;
  }
}
