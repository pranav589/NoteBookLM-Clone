"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { useNotebooks } from "@/features/notebooks/hooks/useNotebooks";
import { useSources } from "@/features/sources/hooks/useSources";
import { useChat } from "@/features/chat/hooks/useChat";
import { useRoadmap } from "@/features/roadmap/hooks/useRoadmap";
import { useMindMap } from "@/features/mindmap/hooks/useMindMap";
import { usePodcast } from "@/features/podcast/hooks/usePodcast";
import { useSSE } from "@/hooks/useSSE";
import { useNotifications } from "@/hooks/useNotifications";
import { useTheme } from "next-themes";

import type { Notebook, SourceDoc, CitationSource, RoadmapNode, MindMapNode } from "@/lib/notebook-types";

// Define a local interface representing Notification structure to avoid circular import issues
interface WorkspaceContextNotification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "progress";
  title: string;
  message: string;
  progress?: number;
  duration?: number | null;
  timestamp: string;
  isRead?: boolean;
}

interface NotebookWorkspaceContextType {
  notebookId: string;
  activeNotebook: Notebook | null;
  notebookData: any;
  isLoadingDetails: boolean;
  activeSubTab: "chat" | "roadmap" | "mindmap" | "podcast" | "quiz" | "flashcard";
  handleTabChange: (tab: "chat" | "roadmap" | "mindmap" | "podcast" | "quiz" | "flashcard") => void;
  isAddSourceOpen: boolean;
  setIsAddSourceOpen: (open: boolean) => void;
  viewingCitation: CitationSource | null;
  setViewingCitation: (citation: CitationSource | null) => void;
  isSourcesCollapsed: boolean;
  setIsSourcesCollapsed: (collapsed: boolean) => void;
  themeMode: "light" | "dark";
  toggleTheme: () => void;
  sources: SourceDoc[];
  hasCompletedSources: boolean;
  isUploading: boolean;
  messages: any[];
  isQuerying: boolean;
  sendQuery: (query: string) => Promise<void>;
  selectedMessageId: string | null;
  setSelectedMessageId: (id: string | null) => void;
  roadmap: any;
  mindMap: any;
  podcast: any;
  isGeneratingRoadmap: boolean;
  isGeneratingMindMap: boolean;
  isGeneratingPodcast: boolean;
  handleGenerateRoadmap: () => Promise<void>;
  handleGenerateMindMap: () => Promise<void>;
  handleGeneratePodcast: () => Promise<void>;
  handleRoadmapNodeClick: (node: RoadmapNode) => void;
  handleMindMapNodeClick: (node: MindMapNode) => void;
  handleAskAboutConcept: (question: string) => void;
  handleAddSource: (formData: FormData) => Promise<void>;
  handleDeleteSource: (sourceId: string) => Promise<void>;
  handleReindexSource: (sourceId: string) => Promise<void>;
  unreadCount: number;
  history: WorkspaceContextNotification[];
  markAllAsRead: () => void;
  markNotificationAsRead: (notebookId: string, id: string) => void;
  deleteNotification: (notebookId: string, id: string) => void;
}

const NotebookWorkspaceContext = createContext<NotebookWorkspaceContextType | undefined>(undefined);

export function useNotebookWorkspace() {
  const context = useContext(NotebookWorkspaceContext);
  if (!context) {
    throw new Error("useNotebookWorkspace must be used within a NotebookWorkspaceProvider");
  }
  return context;
}

interface NotebookWorkspaceProviderProps {
  notebookId: string;
  children: ReactNode;
}

export function NotebookWorkspaceProvider({ notebookId, children }: NotebookWorkspaceProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeSubTab, setActiveSubTab] = useState<"chat" | "roadmap" | "mindmap" | "podcast" | "quiz" | "flashcard">(() => {
    if (tabParam === "roadmap" || tabParam === "mindmap" || tabParam === "podcast" || tabParam === "chat" || tabParam === "quiz" || tabParam === "flashcard") {
      return tabParam;
    }
    return "chat";
  });

  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [viewingCitation, setViewingCitation] = useState<CitationSource | null>(null);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);

  const { theme, setTheme } = useTheme();
  const themeMode = (theme as "light" | "dark") || "light";
  const toggleTheme = () => {
    setTheme(themeMode === "light" ? "dark" : "light");
  };

  const handleTabChange = (tab: "chat" | "roadmap" | "mindmap" | "podcast" | "quiz" | "flashcard") => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };

  useEffect(() => {
    if (tabParam === "roadmap" || tabParam === "mindmap" || tabParam === "podcast" || tabParam === "chat" || tabParam === "quiz" || tabParam === "flashcard") {
      if (tabParam !== activeSubTab) {
        setActiveSubTab(tabParam);
      }
    }
  }, [tabParam, activeSubTab]);

  const { useList, useGet } = useNotebooks();
  const { data: notebooks = [], isLoading: isLoadingList } = useList();
  
  const activeNotebook = notebooks.find((n) => n._id === notebookId) || null;
  const { data: notebookData, isLoading: isLoadingDetails } = useGet(activeNotebook?._id || null);

  const sources: SourceDoc[] = notebookData?.sources || [];
  const hasCompletedSources = sources.filter((s) => s.status === "completed").length > 0;

  const { addSource, removeSource, reindexSource, isUploading } = useSources(
    activeNotebook?._id
  );

  const {
    messages,
    setMessages,
    isQuerying,
    setIsQuerying,
    sendQuery,
    selectedMessageId,
    setSelectedMessageId,
  } = useChat(activeNotebook?._id, activeNotebook?.name);

  const { roadmap, setRoadmap, generateRoadmap, isGenerating: isGeneratingRoadmap } =
    useRoadmap(activeNotebook?._id);

  const { mindMap, setMindMap, generateMindMap, isGenerating: isGeneratingMindMap } =
    useMindMap(activeNotebook?._id);

  const { podcast, setPodcast, generatePodcast, isGenerating: isGeneratingPodcast } =
    usePodcast(activeNotebook?._id);

  const queryClient = useQueryClient();
  const {
    addNotification,
    updateNotification,
    removeNotification,
    history,
    unreadCount,
    markAllAsRead,
    fetchNotifications,
    markNotificationAsRead,
    deleteNotification,
  } = useNotifications();

  const [isGeneratingRoadmapLocal, setIsGeneratingRoadmapLocal] = useState(false);
  const [isGeneratingMindMapLocal, setIsGeneratingMindMapLocal] = useState(false);
  const [isGeneratingPodcastLocal, setIsGeneratingPodcastLocal] = useState(false);

  const indexingNotifications = useRef<Record<string, string>>({});
  const roadmapNotificationId = useRef<string | null>(null);
  const mindMapNotificationId = useRef<string | null>(null);
  const podcastNotificationId = useRef<string | null>(null);

  useSSE(activeNotebook?._id, {
    "indexing:start": (data) => {
      const toastId = addNotification({
        type: "progress",
        title: "Indexing Document",
        message: `Reading and extracting segments for "${data.sourceName}"...`,
        progress: 30,
      });
      indexingNotifications.current[data.sourceId] = toastId;
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
    },
    "indexing:complete": (data) => {
      const toastId = indexingNotifications.current[data.sourceId];
      if (toastId) {
        removeNotification(toastId);
        delete indexingNotifications.current[data.sourceId];
      }
      addNotification({
        type: "success",
        title: "Ingestion Success",
        message: `Successfully indexed "${data.sourceName}" into ${data.chunks} chunk vectors.`,
      });
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "indexing:failed": (data) => {
      const toastId = indexingNotifications.current[data.sourceId];
      if (toastId) {
        removeNotification(toastId);
        delete indexingNotifications.current[data.sourceId];
      }
      addNotification({
        type: "error",
        title: "Ingestion Failed",
        message: `Failed to index "${data.sourceName}": ${data.error}`,
      });
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "roadmap:progress": (data) => {
      setIsGeneratingRoadmapLocal(true);
      if (!roadmapNotificationId.current) {
        roadmapNotificationId.current = addNotification({
          type: "progress",
          title: "Building Concept Syllabus",
          message: data.message,
          progress: 50,
        });
      } else {
        updateNotification(roadmapNotificationId.current, {
          message: data.message,
        });
      }
    },
    "roadmap:complete": (data) => {
      if (roadmapNotificationId.current) {
        removeNotification(roadmapNotificationId.current);
        roadmapNotificationId.current = null;
      }
      addNotification({
        type: "success",
        title: "Roadmap Syllabus Generated",
        message: "Your concept timeline syllabus and sources maps are ready!",
      });
      setRoadmap(data.roadmap);
      setIsGeneratingRoadmapLocal(false);
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "roadmap:failed": (data) => {
      if (roadmapNotificationId.current) {
        removeNotification(roadmapNotificationId.current);
        roadmapNotificationId.current = null;
      }
      addNotification({
        type: "error",
        title: "Roadmap Synthesis Failed",
        message: data.error,
      });
      setIsGeneratingRoadmapLocal(false);
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "mindmap:progress": (data) => {
      setIsGeneratingMindMapLocal(true);
      if (!mindMapNotificationId.current) {
        mindMapNotificationId.current = addNotification({
          type: "progress",
          title: "Building Concept Mind Map",
          message: data.message,
          progress: 50,
        });
      } else {
        updateNotification(mindMapNotificationId.current, {
          message: data.message,
        });
      }
    },
    "mindmap:complete": (data) => {
      if (mindMapNotificationId.current) {
        removeNotification(mindMapNotificationId.current);
        mindMapNotificationId.current = null;
      }
      addNotification({
        type: "success",
        title: "Mind Map Generated",
        message: "Your interactive concept map is ready to explore!",
      });
      setMindMap(data.mindMap);
      setIsGeneratingMindMapLocal(false);
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "mindmap:failed": (data) => {
      if (mindMapNotificationId.current) {
        removeNotification(mindMapNotificationId.current);
        mindMapNotificationId.current = null;
      }
      addNotification({
        type: "error",
        title: "Mind Map Generation Failed",
        message: data.error,
      });
      setIsGeneratingMindMapLocal(false);
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "podcast:progress": (data) => {
      setIsGeneratingPodcastLocal(true);
      if (!podcastNotificationId.current) {
        podcastNotificationId.current = addNotification({
          type: "progress",
          title: "Synthesizing Audio Podcast",
          message: data.message,
          progress: 60,
        });
      } else {
        updateNotification(podcastNotificationId.current, {
          message: data.message,
        });
      }
    },
    "podcast:complete": (data) => {
      if (podcastNotificationId.current) {
        removeNotification(podcastNotificationId.current);
        podcastNotificationId.current = null;
      }
      addNotification({
        type: "success",
        title: "Audio Podcast Dialog Synthesized",
        message: "Your host discussion script and audio dialogue files are ready!",
      });
      setPodcast({ success: true, audioUrl: data.audioUrl, script: data.script });
      setIsGeneratingPodcastLocal(false);
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "podcast:failed": (data) => {
      if (podcastNotificationId.current) {
        removeNotification(podcastNotificationId.current);
        podcastNotificationId.current = null;
      }
      addNotification({
        type: "error",
        title: "Podcast Audio Synthesis Failed",
        message: data.error,
      });
      setIsGeneratingPodcastLocal(false);
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "notifications:updated": () => {
      if (activeNotebook?._id) fetchNotifications(activeNotebook._id);
    },
    "query:complete": (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.clientMessageId
            ? {
                ...m,
                status: "done",
                content: data.result?.answer || "",
                queries: data.result?.queries,
                sources: data.result?.sources,
              }
            : m
        )
      );
      setIsQuerying(false);
    },
    "query:failed": (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.clientMessageId
            ? {
                ...m,
                status: "failed",
                content: `RAG error: ${data.error}`,
              }
            : m
        )
      );
      setIsQuerying(false);
    },
  });

  const lastNotebookId = useRef<string | null>(null);

  useEffect(() => {
    if (activeNotebook?._id) {
      if (activeNotebook._id !== lastNotebookId.current) {
        lastNotebookId.current = activeNotebook._id;
        setViewingCitation(null);
        if (tabParam === "roadmap" || tabParam === "mindmap" || tabParam === "podcast" || tabParam === "chat") {
          setActiveSubTab(tabParam);
        } else {
          setActiveSubTab("chat");
        }
      }
      fetchNotifications(activeNotebook._id);
    }
    if (notebookData?.notebook) {
      setRoadmap(notebookData.notebook.roadmap || null);
      setMindMap(notebookData.notebook.mindMap || null);
      setPodcast(notebookData.notebook.podcast || null);
    } else {
      setRoadmap(null);
      setMindMap(null);
      setPodcast(null);
    }
  }, [activeNotebook?._id, notebookData?.notebook, fetchNotifications, tabParam, setRoadmap, setMindMap, setPodcast]);

  const handleAddSource = async (formData: FormData) => {
    try {
      await addSource(formData);
      setIsAddSourceOpen(false);
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message || err}`);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Remove this source? All associated vector embeddings will be deleted.")) return;
    try {
      await removeSource(sourceId);
      if (viewingCitation?.metadata?.sourceId === sourceId) {
        setViewingCitation(null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleReindexSource = async (sourceId: string) => {
    try {
      await reindexSource(sourceId);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleGenerateRoadmap = async () => {
    setIsGeneratingRoadmapLocal(true);
    try {
      await generateRoadmap();
    } catch (err: any) {
      setIsGeneratingRoadmapLocal(false);
      console.error(err);
    }
  };

  const handleGenerateMindMap = async () => {
    setIsGeneratingMindMapLocal(true);
    try {
      await generateMindMap();
    } catch (err: any) {
      setIsGeneratingMindMapLocal(false);
      console.error(err);
    }
  };

  const handleGeneratePodcast = async () => {
    setIsGeneratingPodcastLocal(true);
    try {
      await generatePodcast();
    } catch (err: any) {
      setIsGeneratingPodcastLocal(false);
      console.error(err);
    }
  };

  const handleRoadmapNodeClick = (node: RoadmapNode) => {
    setViewingCitation({
      index: parseInt(node.id, 10),
      text: node.description,
      source: node.sourceName,
      chunkIndex: 0,
      score: 1.0,
      rrfScore: 1.0,
      matchedBy: ["roadmap"],
      metadata: {
        notebookId: activeNotebook?._id || "",
        sourceId: "",
        sourceName: node.sourceName,
        sourceType: node.sourceType,
        chunkIndex: 0,
        url: node.url,
        timestamp: node.timestamp,
      },
    });
  };

  const handleMindMapNodeClick = (node: MindMapNode) => {
    setViewingCitation({
      index: parseInt(node.id, 10) || 0,
      text: node.description || node.summary,
      source: node.sourceName,
      chunkIndex: 0,
      score: 1.0,
      rrfScore: 1.0,
      matchedBy: ["mindmap"],
      metadata: {
        notebookId: activeNotebook?._id || "",
        sourceId: node.sourceId || "",
        sourceName: node.sourceName,
        sourceType: node.sourceType,
        chunkIndex: 0,
        pageNumber: node.sourceType === "pdf" ? node.sourceLocation : undefined,
        timestamp:
          node.sourceType === "youtube" || node.sourceType === "transcript"
            ? node.sourceLocation
            : undefined,
      },
    });
  };

  const handleAskAboutConcept = (question: string) => {
    handleTabChange("chat");
    void sendQuery(question);
  };

  // Compute final load states
  const isGeneratingRoadmapCombined = isGeneratingRoadmap || isGeneratingRoadmapLocal || notebookData?.notebook?.roadmapStatus === "generating";
  const isGeneratingMindMapCombined = isGeneratingMindMap || isGeneratingMindMapLocal || notebookData?.notebook?.mindMapStatus === "generating";
  const isGeneratingPodcastCombined = isGeneratingPodcast || isGeneratingPodcastLocal || notebookData?.notebook?.podcastStatus === "generating";

  return (
    <NotebookWorkspaceContext.Provider
      value={{
        notebookId,
        activeNotebook,
        notebookData,
        isLoadingDetails,
        activeSubTab,
        handleTabChange,
        isAddSourceOpen,
        setIsAddSourceOpen,
        viewingCitation,
        setViewingCitation,
        isSourcesCollapsed,
        setIsSourcesCollapsed,
        themeMode,
        toggleTheme,
        sources,
        hasCompletedSources,
        isUploading,
        messages,
        isQuerying,
        sendQuery,
        selectedMessageId,
        setSelectedMessageId,
        roadmap,
        mindMap,
        podcast,
        isGeneratingRoadmap: isGeneratingRoadmapCombined,
        isGeneratingMindMap: isGeneratingMindMapCombined,
        isGeneratingPodcast: isGeneratingPodcastCombined,
        handleGenerateRoadmap,
        handleGenerateMindMap,
        handleGeneratePodcast,
        handleRoadmapNodeClick,
        handleMindMapNodeClick,
        handleAskAboutConcept,
        handleAddSource,
        handleDeleteSource,
        handleReindexSource,
        unreadCount,
        history,
        markAllAsRead,
        markNotificationAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotebookWorkspaceContext.Provider>
  );
}
