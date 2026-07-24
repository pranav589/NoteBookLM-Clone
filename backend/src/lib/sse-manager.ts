import { Response } from "express";
import Redis from "ioredis";
import { connection } from "./queue";

interface SSEEvent {
  type: string;
  [key: string]: any;
}

class SSEManager {
  private clients: Map<string, Set<Response>> = new Map();
  private redisPub: Redis | null = null;
  private redisSub: Redis | null = null;
  private isRedisConnected = false;

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    try {
      const conn: any = connection;

      // Connect to Redis for publishing
      this.redisPub = new Redis({
        host: conn.host,
        port: conn.port,
        password: conn.password,
        username: conn.username,
        tls: conn.tls,
        maxRetriesPerRequest: null,
      });

      // Connect to Redis for subscribing
      this.redisSub = new Redis({
        host: conn.host,
        port: conn.port,
        password: conn.password,
        username: conn.username,
        tls: conn.tls,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      this.redisPub.on("ready", () => {
        console.log("🚀 SSE Redis Publisher connected & ready");
        this.isRedisConnected = true;
      });

      this.redisSub.on("ready", () => {
        console.log("🚀 SSE Redis Subscriber connected & ready");
        if (this.redisSub) {
          // Subscribe to pattern for all notebooks
          this.redisSub.psubscribe("notebook:sse:*").catch((err) => {
            console.error("Failed to psubscribe to notebook:sse:*", err);
          });
        }
      });

      this.redisSub.on("pmessage", (pattern, channel, message) => {
        try {
          // channel format: notebook:sse:<notebookId>
          const parts = channel.split(":");
          const notebookId = parts[2];
          if (notebookId) {
            const event: SSEEvent = JSON.parse(message);
            this.sendToLocalClients(notebookId, event);
          }
        } catch (err) {
          console.error("Error processing SSE Redis message:", err);
        }
      });

      const handleError = (type: string, err: any) => {
        console.error(`Redis SSE ${type} Error:`, err);
        this.isRedisConnected = false;
      };

      this.redisPub.on("error", (err) => handleError("Publisher", err));
      this.redisSub.on("error", (err) => handleError("Subscriber", err));
    } catch (err) {
      console.error("Failed to initialize Redis for SSE. Falling back to local events only.", err);
    }
  }

  /**
   * Register an Express response stream for SSE
   */
  public register(notebookId: string, res: Response) {
    if (!this.clients.has(notebookId)) {
      this.clients.set(notebookId, new Set());
    }
    this.clients.get(notebookId)!.add(res);

    console.log(`📡 SSE client registered for notebook: ${notebookId} (Total: ${this.clients.get(notebookId)!.size})`);

    // Send initial ping to confirm connection
    this.sendDirect(res, { type: "connected", notebookId });
  }

  /**
   * Unregister an Express response stream
   */
  public unregister(notebookId: string, res: Response) {
    const notebookClients = this.clients.get(notebookId);
    if (notebookClients) {
      notebookClients.delete(res);
      if (notebookClients.size === 0) {
        this.clients.delete(notebookId);
      }
      console.log(`🔌 SSE client disconnected for notebook: ${notebookId}`);
    }
  }

  /**
   * Publish an event to a notebook's SSE clients (cross-process safe via Redis Pub/Sub)
   */
  public async publish(notebookId: string, event: SSEEvent) {
    const payload = JSON.stringify(event);

    // 1. Publish to Redis so other server instances receive it
    if (this.isRedisConnected && this.redisPub) {
      try {
        await this.redisPub.publish(`notebook:sse:${notebookId}`, payload);
      } catch (err) {
        console.error("Failed to publish SSE event to Redis:", err);
        // Fallback directly to local clients if Redis fails
        this.sendToLocalClients(notebookId, event);
      }
    } else {
      // 2. Local fallback if Redis is not connected
      this.sendToLocalClients(notebookId, event);
    }
  }

  /**
   * Helper to write formatted SSE data directly to a single response stream
   */
  private sendDirect(res: Response, event: SSEEvent) {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      console.error("Error writing to client SSE socket:", err);
    }
  }

  /**
   * Broadcasts event locally to registered clients for this notebookId
   */
  private sendToLocalClients(notebookId: string, event: SSEEvent) {
    const notebookClients = this.clients.get(notebookId);
    if (!notebookClients || notebookClients.size === 0) return;

    for (const res of notebookClients) {
      this.sendDirect(res, event);
    }
  }

  /**
   * Keep connections alive by sending periodic pings
   */
  public sendKeepAlive() {
    this.clients.forEach((notebookClients) => {
      for (const res of notebookClients) {
        this.sendDirect(res, { type: "ping" });
      }
    });
  }
}

export const sseManager = new SSEManager();

// Periodically send ping every 15 seconds to keep SSE streams alive
setInterval(() => {
  sseManager.sendKeepAlive();
}, 15000);
