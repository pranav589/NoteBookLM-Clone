import { Queue } from "bullmq";
import { config, INDEXING_QUEUE, QUERY_QUEUE } from "./config";

import { ConnectionOptions } from "bullmq";

const getRedisConnection = (): ConnectionOptions => {
  if (process.env.REDIS_URL) {
    try {
      const parsed = new URL(process.env.REDIS_URL);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === "rediss:" ? {} : undefined,
        maxRetriesPerRequest: null,
      };
    } catch (err) {
      console.error("Invalid REDIS_URL in env, falling back to standard config", err);
    }
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  };
};

export const connection = getRedisConnection();

// Singleton pattern to prevent re-initialization of queues during dev hot reloads
const globalForQueue = global as unknown as {
  indexingQueue: Queue;
  queryQueue: Queue;
};

export const indexingQueue =
  globalForQueue.indexingQueue ||
  new Queue(INDEXING_QUEUE, { connection });

export const queryQueue =
  globalForQueue.queryQueue ||
  new Queue(QUERY_QUEUE, { connection });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.indexingQueue = indexingQueue;
  globalForQueue.queryQueue = queryQueue;
}

export async function enqueueIndexingJob(payload: {
  sourceId: string;
  notebookId: string;
  type: "pdf" | "text" | "url" | "youtube" | "transcript";
  filePath?: string;
  url?: string;
  name: string;
}) {
  return indexingQueue.add("index-source", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

export async function enqueueQueryJob(payload: { query: string; notebookId: string }) {
  return queryQueue.add("run-query", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 3600, count: 1000 },
  });
}

