import mongoose from "mongoose";
import { Readable } from "stream";

let bucket: mongoose.mongo.GridFSBucket | null = null;

// Initialize the GridFS bucket once MongoDB connects
export function getGridFSBucket(): mongoose.mongo.GridFSBucket {
  if (bucket) return bucket;

  if (!mongoose.connection.db) {
    throw new Error("Database connection not established yet.");
  }

  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "media",
  });
  return bucket;
}

/**
 * Uploads a buffer to GridFS
 */
export async function uploadFileToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata?: Record<string, any>
): Promise<string> {
  const mediaBucket = getGridFSBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = mediaBucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        contentType,
      },
    });

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null); // End of stream

    readable
      .pipe(uploadStream)
      .on("error", reject)
      .on("finish", () => {
        resolve(uploadStream.id.toString());
      });
  });
}

/**
 * Deletes a file from GridFS by its ObjectId
 */
export async function deleteFileFromGridFS(fileId: string): Promise<void> {
  const mediaBucket = getGridFSBucket();
  await mediaBucket.delete(new mongoose.Types.ObjectId(fileId));
}

/**
 * Downloads a file from GridFS by its ObjectId as a Buffer
 */
export async function downloadFileFromGridFS(fileId: string): Promise<Buffer> {
  const mediaBucket = getGridFSBucket();
  const objectId = new mongoose.Types.ObjectId(fileId);

  return new Promise((resolve, reject) => {
    const downloadStream = mediaBucket.openDownloadStream(objectId);
    const chunks: Buffer[] = [];

    downloadStream.on("data", (chunk) => {
      chunks.push(Buffer.from(chunk));
    });

    downloadStream.on("error", (err) => {
      reject(err);
    });

    downloadStream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

/**
 * Fetches file metadata details from GridFS files collection
 */
export async function getFileMetadataFromGridFS(fileId: string): Promise<any> {
  const objectId = new mongoose.Types.ObjectId(fileId);
  const files = await mongoose.connection.db!
    .collection("media.files")
    .find({ _id: objectId })
    .toArray();

  if (!files || files.length === 0) {
    return null;
  }
  return files[0];
}
