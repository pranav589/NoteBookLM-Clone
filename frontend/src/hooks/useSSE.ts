"use client";

import { useEffect, useRef, useCallback } from "react";

interface SSEEvent {
  type: string;
  [key: string]: any;
}

interface SSEHandlers {
  onEvent?: (event: SSEEvent) => void;
  onStatusChange?: (status: "connecting" | "connected" | "disconnected") => void;
  [eventType: string]: ((data: any) => void) | undefined;
}

const MAX_RETRY_DELAY_MS = 30_000; // cap backoff at 30s
const BASE_RETRY_DELAY_MS = 1_000; // start at 1s

export function useSSE(notebookId: string | undefined, handlers: SSEHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (isUnmountedRef.current || !notebookId) return;

    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
    const url = `${backendBaseUrl}/api/notebooks/${notebookId}/sse`;

    // Close any existing connection before reconnecting
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    handlersRef.current.onStatusChange?.("connecting");
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      if (isUnmountedRef.current) return;
      retryCountRef.current = 0; // Reset backoff on successful connect
      handlersRef.current.onStatusChange?.("connected");
    };

    eventSource.onmessage = (event) => {
      if (isUnmountedRef.current) return;
      try {
        const parsed: SSEEvent = JSON.parse(event.data);
        if (parsed.type === "ping" || parsed.type === "connected") return; // ignore keep-alives

        if (handlersRef.current.onEvent) {
          handlersRef.current.onEvent(parsed);
        }

        const specificHandler = handlersRef.current[parsed.type];
        if (specificHandler) {
          specificHandler(parsed);
        }
      } catch (err) {
        console.error("Error parsing SSE event data:", err);
      }
    };

    eventSource.onerror = () => {
      if (isUnmountedRef.current) return;

      const state = eventSource.readyState;

      if (state === EventSource.CONNECTING) {
        // Browser is already attempting a native reconnect — nothing to do
        return;
      }

      // CLOSED state: browser gave up, schedule a manual reconnect with backoff
      eventSource.close();
      eventSourceRef.current = null;
      handlersRef.current.onStatusChange?.("disconnected");

      const delay = Math.min(
        BASE_RETRY_DELAY_MS * 2 ** retryCountRef.current,
        MAX_RETRY_DELAY_MS
      );
      retryCountRef.current += 1;

      console.warn(
        `SSE connection closed for notebook ${notebookId}. Reconnecting in ${delay / 1000}s (attempt ${retryCountRef.current})...`
      );

      retryTimerRef.current = setTimeout(connect, delay);
    };
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;

    isUnmountedRef.current = false;
    retryCountRef.current = 0;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [notebookId, connect]);
}

export default useSSE;
