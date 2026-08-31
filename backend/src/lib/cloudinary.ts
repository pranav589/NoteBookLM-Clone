import { v2 as cloudinary } from "cloudinary";
import { config } from "./config";
import { SourceType } from "../types";

// Configure Cloudinary with keys from backend config
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a buffer to Cloudinary and returns secure URL & public ID
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  filename: string,
  resourceType: "auto" | "image" | "video" | "raw" = "auto"
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    // Generate a sanitized public ID from filename (alphanumeric and dashes/underscores only)
    const baseName = filename
      .split(".")[0]
      .replace(/[^a-zA-Z0-9-_]/g, "_");

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: `${baseName}_${Date.now()}`,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload returned empty result"));
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes a resource from Cloudinary by its public ID
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "raw"
): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });
}

/**
 * Downloads a file from Cloudinary by its public URL as a Buffer (for indexing)
 */
export async function downloadFileFromCloudinary(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from Cloudinary: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Maps a SourceType to Cloudinary's resourceType classification
 */
export function getCloudinaryResourceType(
  sourceType: SourceType
): "image" | "video" | "raw" {
  if (sourceType === "image") {
    return "image";
  }
  if (sourceType === "video") {
    return "video";
  }
  // pdf, text, transcript, url, youtube etc. (YouTube is handled by external parser/downloader)
  return "raw";
}
