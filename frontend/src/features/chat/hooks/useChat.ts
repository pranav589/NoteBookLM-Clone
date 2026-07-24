import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { notebookApi } from "../../../lib/notebook-api";
import { useJobPoller } from "../../../hooks/useJobPoller";
import type { Message } from "../../../lib/notebook-types";

export function useChat(notebookId: string | undefined, notebookName?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const { data: jobStatus } = useJobPoller(activeJobId);

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
      setActiveJobId(response.jobId);
      setActiveMessageId(queryId);
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === queryId
            ? {
                ...m,
                status: "failed",
                content: `Error submitting query: ${err.message || err}`,
              }
            : m
        )
      );
      setIsQuerying(false);
    }
  };

  useEffect(() => {
    if (!jobStatus || !activeMessageId) return;

    if (jobStatus.status === "completed") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessageId
            ? {
                ...m,
                status: "done",
                content: jobStatus.result?.answer || "",
                queries: jobStatus.result?.queries,
                sources: jobStatus.result?.sources,
              }
            : m
        )
      );
      setIsQuerying(false);
      setActiveJobId(null);
      setActiveMessageId(null);
    } else if (jobStatus.status === "failed") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessageId
            ? {
                ...m,
                status: "failed",
                content: `RAG error: ${jobStatus.error || "Execution failed"}`,
              }
            : m
        )
      );
      setIsQuerying(false);
      setActiveJobId(null);
      setActiveMessageId(null);
    }
  }, [jobStatus, activeMessageId]);

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
