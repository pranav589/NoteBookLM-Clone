import * as cheerio from "cheerio";
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
 * Fetch and extract text blocks from a website.
 */
export async function scrapeWebsite(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch webpage: ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Remove elements that don't represent primary text
  $("script, style, iframe, nav, footer, header, noscript, svg, form").remove();

  const textBlocks: string[] = [];
  $("h1, h2, h3, h4, h5, h6, p, li").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 0) {
      // Normalize whitespace
      textBlocks.push(text.replace(/\s+/g, " "));
    }
  });

  if (textBlocks.length === 0) {
    throw new Error("No extractable paragraph or heading text found on the page.");
  }

  return textBlocks.join("\n\n");
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
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    return segments.map((item) => ({
      text: item.text,
      start: item.offset / 1000, // Convert from milliseconds to seconds
    }));
  } catch (err: any) {
    console.error(`Error scraping transcript for YouTube Video ${videoId}:`, err);
    throw new Error(`Could not load YouTube transcript. Make sure captions/subtitles are enabled for this video.`);
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
