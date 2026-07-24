import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import type { Message } from "../../../lib/notebook-types";

export function useChat(notebookId: string | undefined, notebookName?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (!notebookId) {
      setMessages([]);
      return;
    }

    let active = true;
    const fetchHistory = async () => {
      try {
        const history = await notebookApi.getMessages(notebookId);
        if (active) {
          const formatted = history.map((m: any) => ({
            id: m._id || m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
            queries: m.queries,
            status: "done" as const,
          }));

          if (formatted.length === 0) {
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: `Welcome to "${notebookName || "your Notebook"}"! Ingest PDFs, plaintext files, website links, or YouTube videos on the left side, then ask questions about them. Answers will include citations linked to their source documents.`,
              },
            ]);
            setSelectedMessageId("welcome");
          } else {
            setMessages(formatted);
            // Default select the last message if exists
            const lastMsg = formatted[formatted.length - 1];
            if (lastMsg && lastMsg.role === "assistant") {
              setSelectedMessageId(lastMsg.id);
            } else {
              setSelectedMessageId(null);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    fetchHistory();
    return () => {
      active = false;
    };
  }, [notebookId, notebookName]);

  const submitQueryMutation = useMutation({
    mutationFn: (query: string) => notebookApi.submitQuery(notebookId!, query),
  });

  const sendQuery = async (queryText: string) => {
    if (!queryText.trim() || isQuerying || !notebookId) return;

    const queryId = `${Date.now()}`;
    const userMsg: Message = {
      id: `${queryId}-user`,
      role: "user",
      content: queryText,
    };

    const assistantPendingMsg: Message = {
      id: queryId,
      role: "assistant",
      content: "Reviewing active notebook sources and generating answer...",
      status: "pending",
    };

    setMessages((prev) => [...prev, userMsg, assistantPendingMsg]);
    setSelectedMessageId(queryId);
    setIsQuerying(true);

    try {
      const response = await submitQueryMutation.mutateAsync(userMsg.content);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === queryId
            ? {
                ...m,
                status: "done",
                content: response.result?.answer || "",
                queries: response.result?.queries,
                sources: response.result?.sources,
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === queryId
            ? {
                ...m,
                status: "failed",
                content: `RAG error: ${err.message || err}`,
              }
            : m
        )
      );
    } finally {
      setIsQuerying(false);
    }
  };

  return {
    messages,
    setMessages,
    isQuerying,
    sendQuery,
    selectedMessageId,
    setSelectedMessageId,
  };
}
export default useChat;
