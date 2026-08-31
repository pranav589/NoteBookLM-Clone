import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { YoutubeTranscript } from "youtube-transcript";

/**
 * Extract the 11-character video ID from any YouTube URL.
 */
export function getYoutubeVideoId(url: string): string | null {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Fetch and extract text blocks from a website using LangChain's CheerioWebBaseLoader.
 */
export async function scrapeWebsite(url: string): Promise<string> {
  try {
    console.log(`[Parser] Fetching URL via Jina Reader: ${url}`);
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      }
    });

    if (res.ok) {
      const markdownContent = await res.text();
      // Verify we got actual content and not a bot challenge error page
      if (
        markdownContent.trim().length > 0 && 
        !markdownContent.includes("Enable JavaScript and cookies to continue") &&
        !markdownContent.includes("cloudflare")
      ) {
        console.log(`[Parser] Successfully retrieved Markdown via Jina Reader for ${url}`);
        return markdownContent;
      }
    }
    console.warn(`[Parser] Jina Reader returned invalid content for ${url}. Trying Cheerio fallback.`);
  } catch (err: any) {
    console.warn(`[Parser] Jina Reader failed for ${url}: ${err.message || err}. Trying Cheerio fallback.`);
  }

  console.log(`[Parser] Falling back to CheerioWebBaseLoader for URL: ${url}`);
  const loader = new CheerioWebBaseLoader(url);
  const docs = await loader.load();

  if (docs.length === 0) {
    throw new Error("No extractable content found on the page.");
  }

  // Combine and clean loaded document text
  return docs
    .map((doc) => doc.pageContent.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

/**
 * Fetch text segments with start offsets from YouTube.
 */
export async function fetchYoutubeTranscript(url: string): Promise<{ text: string; start: number }[]> {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL - could not parse Video ID.");
  }

  try {
    const apiUrl = `https://youtube-transcript.ai/transcript/${videoId}.txt`;
    const res = await fetch(apiUrl);
    
    if (!res.ok) {
      throw new Error(`Failed to fetch from keyless API: ${res.statusText}`);
    }

    const text = await res.text();
    const lines = text.split("\n");
    const segments: { text: string; start: number }[] = [];

    // Match lines like: [1:23] Some text or [1:02:30] Some text
    const timestampRegex = /^\[(?:(\d+):)?(\d+):(\d{2})\]\s*(.+)$/;

    for (const line of lines) {
      const match = line.trim().match(timestampRegex);
      if (match) {
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const content = match[4].trim();

        const start = (hours * 3600) + (minutes * 60) + seconds;
        segments.push({ text: content, start });
      }
    }

    if (segments.length === 0) {
      throw new Error("No timestamped segments could be parsed from the API response.");
    }

    console.log(`[YouTube] Successfully retrieved and parsed transcript for ${videoId} via youtube-transcript.ai`);
    return segments;
  } catch (err: any) {
    console.warn(`[YouTube] youtube-transcript.ai failed for ${videoId}: ${err.message || err}. Falling back to scraper.`);

    try {
      const segments = await YoutubeTranscript.fetchTranscript(videoId);
      return segments.map((item) => ({
        text: item.text,
        start: item.offset / 1000, // Convert from milliseconds to seconds
      }));
    } catch (fallbackErr: any) {
      console.error(`Error scraping transcript for YouTube Video ${videoId}:`, fallbackErr);
      throw new Error(`Could not load YouTube transcript. Make sure captions/subtitles are enabled for this video.`);
    }
  }
}

interface VttSegment {
  text: string;
  start: number; // in seconds
  end: number;   // in seconds
}

/**
 * Custom parser for WebVTT (.vtt) file content.
 */
export function parseVtt(content: string): VttSegment[] {
  const lines = content.split(/\r?\n/);
  const segments: VttSegment[] = [];
  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let currentTextLines: string[] = [];

  // Matches timestamp ranges like "00:00:01.000 --> 00:00:04.000" or "00:01.000 --> 00:04.000"
  const timeRegex = /((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2}[.,]\d{3})/;

  function timeToSeconds(timeStr: string): number {
    const cleanStr = timeStr.replace(",", "."); // Handle comma decimal separators
    const parts = cleanStr.split(":");
    let seconds = 0;
    
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      seconds += parseInt(parts[0], 10) * 3600;
      seconds += parseInt(parts[1], 10) * 60;
      seconds += parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.mmm
      seconds += parseInt(parts[0], 10) * 60;
      seconds += parseFloat(parts[1]);
    }
    return seconds;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      // Empty line indicates segment block boundaries
      if (currentStart !== null && currentTextLines.length > 0) {
        segments.push({
          start: currentStart,
          end: currentEnd ?? currentStart,
          text: currentTextLines.join(" "),
        });
        currentStart = null;
        currentEnd = null;
        currentTextLines = [];
      }
      continue;
    }

    const match = line.match(timeRegex);
    if (match) {
      currentStart = timeToSeconds(match[1]);
      currentEnd = timeToSeconds(match[2]);
    } else if (line !== "WEBVTT" && !line.startsWith("NOTE")) {
      // Ignore VTT header metadata, push everything else to text list
      currentTextLines.push(line);
    }
  }

  // Push final segment if file does not end with empty line
  if (currentStart !== null && currentTextLines.length > 0) {
    segments.push({
      start: currentStart,
      end: currentEnd ?? currentStart,
      text: currentTextLines.join(" "),
    });
  }

  return segments;
}
