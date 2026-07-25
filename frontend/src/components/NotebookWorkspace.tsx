"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Database, Plus, MessageSquare, Compass, Headphones, Layers, Network, Sparkles, X, Clock, Loader2, Bell, Check, Trash2, ArrowRight, Sun, Moon, PanelLeftClose, PanelLeft, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { SourceSidebar } from "@/features/sources/SourceSidebar";
import { AddSourcePanel } from "@/features/sources/AddSourcePanel";
import { ChatWindow } from "@/features/chat/ChatWindow";
import { RoadmapView } from "@/features/roadmap/RoadmapView";
import { MindMapView } from "@/features/mindmap/MindMapView";
import { PodcastPlayer } from "@/features/podcast/PodcastPlayer";
import { CitationCard } from "@/features/chat/CitationCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { useNotebooks } from "@/features/notebooks/hooks/useNotebooks";
import { useSources } from "@/features/sources/hooks/useSources";
import { useChat } from "@/features/chat/hooks/useChat";
import { useRoadmap } from "@/features/roadmap/hooks/useRoadmap";
import { useMindMap } from "@/features/mindmap/hooks/useMindMap";
import { usePodcast } from "@/features/podcast/hooks/usePodcast";

import { useSSE } from "@/hooks/useSSE";
import { useNotifications } from "@/hooks/useNotifications";

import type { Notebook, SourceDoc, CitationSource, RoadmapNode, MindMapNode } from "@/lib/notebook-types";

interface NotebookWorkspaceProps {
  notebookId: string;
}

export function NotebookWorkspace({ notebookId }: NotebookWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeSubTab, setActiveSubTab] = useState<"chat" | "roadmap" | "mindmap" | "podcast">(() => {
    if (tabParam === "roadmap" || tabParam === "mindmap" || tabParam === "podcast" || tabParam === "chat") {
      return tabParam;
    }
    return "chat";
  });

  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [viewingCitation, setViewingCitation] = useState<CitationSource | null>(null);
  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState(false);
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme-mode") as "light" | "dark" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeMode(initial);
    if (initial === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(nextTheme);
    localStorage.setItem("theme-mode", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Synchronize state changes to URL
  const handleTabChange = (tab: "chat" | "roadmap" | "mindmap" | "podcast") => {
    setActiveSubTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    router.replace(`${window.location.pathname}?${params.toString()}`);
  };

  // Keep state updated on URL changes (like forward/backward navigation)
  useEffect(() => {
    if (tabParam === "roadmap" || tabParam === "mindmap" || tabParam === "podcast" || tabParam === "chat") {
      if (tabParam !== activeSubTab) {
        setActiveSubTab(tabParam);
      }
    }
  }, [tabParam, activeSubTab]);

  const { useList, useGet } = useNotebooks();
  const { data: notebooks = [], isLoading: isLoadingList } = useList();
  
  // Resolve active notebook from the list
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

  // Local loading overrides to persist layout loading state until SSE triggers completion
  const [isGeneratingRoadmapLocal, setIsGeneratingRoadmapLocal] = useState(false);
  const [isGeneratingMindMapLocal, setIsGeneratingMindMapLocal] = useState(false);
  const [isGeneratingPodcastLocal, setIsGeneratingPodcastLocal] = useState(false);

  // References to active progress notification IDs so we can update/remove them dynamically
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
  });

  const activeMessage = messages.find((m) => m.id === selectedMessageId);

  const lastNotebookId = useRef<string | null>(null);

  // Sync active notebook stored roadmap and podcast values when active notebook loads
  useEffect(() => {
    if (activeNotebook?._id) {
      if (activeNotebook._id !== lastNotebookId.current) {
        lastNotebookId.current = activeNotebook._id;
        setViewingCitation(null);
        // On switching notebooks: preserve tab from URL query param if valid, else default to "chat"
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
  }, [activeNotebook?._id, notebookData?.notebook, fetchNotifications, tabParam]);

  const handleSetActiveNotebook = (nb: Notebook | null) => {
    if (nb) {
      router.push(`/note/${nb._id}`);
    } else {
      router.push("/");
    }
  };

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

  return (
    <main className="h-screen max-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Sleek Minimal Header */}
      <header className="h-16 border-b border-border bg-white dark:bg-stone-900 flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center">
          {activeNotebook && (
            <button
              onClick={() => setIsSourcesCollapsed(!isSourcesCollapsed)}
              className="w-9 h-9 border border-border bg-white dark:bg-stone-900 text-foreground hover:bg-foreground/5 flex items-center justify-center transition-all cursor-pointer rounded-full mr-4 shadow-xs"
              title={isSourcesCollapsed ? "Show sources panel" : "Hide sources panel"}
            >
              {isSourcesCollapsed ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1">
                  NoteBook<span className="text-accent font-bold">LM</span>
                </h1>
                <p className="text-[8px] text-muted-foreground font-bold tracking-widest uppercase">
                  AI COGNITIVE RESEARCH AGENT
                </p>
              </div>
            </div>
          
          </div>
        </div>

        {/* Right Header Section: Theme Switcher & Notifications */}
        <div className="relative flex items-center gap-3">
          {/* Theme Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full border border-border bg-white dark:bg-stone-900 text-foreground hover:bg-foreground/5 flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Toggle color theme"
          >
            {themeMode === "light" ? (
              <Moon className="w-4.5 h-4.5" />
            ) : (
              <Sun className="w-4.5 h-4.5" />
            )}
          </button>

          <Popover>
            <PopoverTrigger
              onClick={() => {
                if (activeNotebook?._id) {
                  markAllAsRead();
                }
              }}
              className="relative w-9 h-9 rounded-full border border-border bg-white dark:bg-stone-900 text-foreground hover:bg-foreground/5 flex items-center justify-center transition-all cursor-pointer shadow-xs outline-none"
              title="Notification Center"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-accent text-white font-bold text-[8.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white dark:border-stone-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-80 bg-white dark:bg-stone-900 border border-border rounded-[20px] shadow-level2 z-[999] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-foreground">
                  Notification History
                </span>
                <button
                  onClick={() => {
                    markAllAsRead();
                  }}
                  className="text-[10px] text-primary hover:text-amber-600 font-semibold transition-colors cursor-pointer"
                >
                  Clear Badge
                </button>
              </div>

              <ScrollArea className="max-h-[300px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs flex flex-col items-center justify-center gap-1">
                    <Bell className="w-6 h-6 text-stone-200 mb-1" />
                    <span>No notifications yet</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all hover:bg-stone-50/40 relative group/item",
                          item.isRead
                            ? "bg-[#FCFAF6]/25 border-stone-100/70 text-stone-500"
                            : "bg-amber-50/15 border-amber-100/70 text-stone-850 font-semibold shadow-xs"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide",
                              item.type === "success" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                              item.type === "error" && "bg-red-50 text-red-700 border border-red-150",
                              item.type === "warning" && "bg-amber-50 text-amber-700 border border-amber-150",
                              item.type === "info" && "bg-blue-50 text-blue-700 border border-blue-150",
                              item.type === "progress" && "bg-amber-50 text-primary border border-amber-250 border-dashed"
                            )}
                          >
                            {item.type}
                          </span>
                          <span className="text-[9px] text-stone-400 font-medium mr-5">
                            {item.timestamp}
                          </span>
                        </div>
                        <h5 className="text-[11.5px] font-bold text-stone-850 truncate leading-snug">
                          {item.title}
                        </h5>
                        <p className="text-[10.5px] text-stone-550 leading-relaxed pr-6">
                          {item.message}
                        </p>

                        {/* Mark read & delete controls */}
                        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          {!item.isRead && (
                            <button
                              onClick={() => {
                                if (activeNotebook?._id) {
                                  markNotificationAsRead(activeNotebook._id, item.id);
                                }
                              }}
                              className="text-stone-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer rounded bg-white shadow-xs border border-stone-200"
                              title="Mark as Read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (activeNotebook?._id) {
                                deleteNotification(activeNotebook._id, item.id);
                              }
                            }}
                            className="text-stone-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer rounded bg-white shadow-xs border border-stone-200"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* App Body Layout */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]">
        {/* Left Sidebar: Knowledge Sources */}
        <div className={cn("transition-all duration-300 flex overflow-hidden border-r border-border bg-sidebar", isSourcesCollapsed ? "w-0 border-r-0" : "w-64")}>
          <SourceSidebar
            notebookName={activeNotebook?.name || ""}
            sources={sources}
            onDeleteSource={handleDeleteSource}
            onReindexSource={handleReindexSource}
            onAddSourceClick={() => setIsAddSourceOpen(true)}
            isUploading={isUploading}
          />
        </div>

        {/* Central Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          {isLoadingDetails ? (
            <div className="flex-1 flex flex-col p-6 space-y-6">
              {/* Header Skeleton */}
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div className="space-y-2 w-1/3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
              {/* Tab Navigation Skeleton */}
              <div className="flex gap-2.5 border-b border-border pb-3">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
              {/* Grid Sources Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
              {/* Chat Skeleton */}
              <div className="flex-1 flex flex-col justify-end space-y-4">
                <Skeleton className="h-10 w-2/3 rounded-xl align-self-start" />
                <Skeleton className="h-16 w-3/4 rounded-xl align-self-end bg-amber-50/70" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            </div>
          ) : !activeNotebook ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
              <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center mb-4 bg-card shadow-xs text-primary">
                <BookOpen className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-lg font-bold text-foreground">No Active Workspace</h2>
              <p className="text-xs text-muted-foreground max-w-xs mt-2 leading-relaxed font-semibold">
                Create a workspace in the left sidebar or select an existing one to begin adding sources.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Back to Chat header bar */}
              {activeSubTab !== "chat" && (
                <div className="border-b border-border bg-card px-6 py-2.5 flex items-center justify-between flex-shrink-0 animate-in fade-in duration-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTabChange("chat")}
                    className="text-xs h-7 px-3 text-muted-foreground hover:text-foreground font-bold rounded-full cursor-pointer flex items-center gap-1.5 hover:bg-foreground/5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Chat Q&A
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {activeSubTab === "roadmap" && (
                      <Badge variant="outline" className="bg-accent/15 border-accent/30 text-accent text-[9px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1">
                        <Compass className="w-2.5 h-2.5" />
                        Roadmap View
                      </Badge>
                    )}
                    {activeSubTab === "mindmap" && (
                      <Badge variant="outline" className="bg-accent/15 border-accent/30 text-accent text-[9px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1">
                        <Network className="w-2.5 h-2.5" />
                        Mind Map View
                      </Badge>
                    )}
                    {activeSubTab === "podcast" && (
                      <Badge variant="outline" className="bg-accent/15 border-accent/30 text-accent text-[9px] font-bold py-0.5 px-2 rounded-full flex items-center gap-1">
                        <Headphones className="w-2.5 h-2.5" />
                        Podcast View
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Main Content Area based on Tab Selection */}
              <div className="flex-1 flex flex-col overflow-hidden bg-background">
                {activeSubTab === "chat" && (
                  <ChatWindow
                    messages={messages}
                    isQuerying={isQuerying}
                    sendQuery={sendQuery}
                    selectedMessageId={selectedMessageId}
                    setSelectedMessageId={setSelectedMessageId}
                    onSelectCitation={setViewingCitation}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}

                {activeSubTab === "roadmap" && (
                  <RoadmapView
                    roadmap={roadmap}
                    isGenerating={isGeneratingRoadmap || isGeneratingRoadmapLocal || notebookData?.notebook.roadmapStatus === "generating"}
                    onGenerateRoadmap={handleGenerateRoadmap}
                    onRoadmapNodeClick={handleRoadmapNodeClick}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}

                {activeSubTab === "mindmap" && (
                  <MindMapView
                    mindMap={mindMap}
                    isGenerating={isGeneratingMindMap || isGeneratingMindMapLocal || notebookData?.notebook.mindMapStatus === "generating"}
                    onGenerateMindMap={handleGenerateMindMap}
                    onNodeClick={handleMindMapNodeClick}
                    onAskAboutConcept={handleAskAboutConcept}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}

                {activeSubTab === "podcast" && (
                  <PodcastPlayer
                    podcast={podcast}
                    isGenerating={isGeneratingPodcast || isGeneratingPodcastLocal || notebookData?.notebook.podcastStatus === "generating"}
                    onGeneratePodcast={handleGeneratePodcast}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Study Studio */}
        <aside className="w-80 border-l border-border bg-sidebar flex flex-col shrink-0">
          <div className="border-b border-border bg-sidebar px-4 py-3 flex-shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse" />
                Study Studio
              </h2>
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                AI Cognitive Assets
              </p>
            </div>
            <Badge variant="outline" className="bg-card border-border text-foreground text-[9px] font-bold py-0.5 px-1.5 rounded-full">
              3 Tools
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Card 1: Concept Roadmap */}
              {(() => {
                const isGenerating = isGeneratingRoadmap || isGeneratingRoadmapLocal || notebookData?.notebook.roadmapStatus === "generating";
                const isReady = !!roadmap;
                return (
                  <div
                    onClick={() => handleTabChange("roadmap")}
                    className={cn(
                      "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
                      activeSubTab === "roadmap"
                        ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                        : "border-border hover:border-foreground/20 hover:shadow-xs"
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
                    
                    <div className="space-y-2 pl-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                          <Compass className="w-3.5 h-3.5" />
                        </div>
                        {isGenerating ? (
                          <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                        ) : isReady ? (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                          Roadmap
                        </h4>
                        <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                          Timeline guide of key concepts.
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
                      <Button
                        size="sm"
                        disabled={isGenerating || !hasCompletedSources}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGenerateRoadmap();
                        }}
                        className="text-[8px] h-5.5 px-2 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
                      >
                        {isReady ? "Re-Gen" : "Create"}
                      </Button>
                      
                      <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                        Open <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Interactive Mind Map */}
              {(() => {
                const isGenerating = isGeneratingMindMap || isGeneratingMindMapLocal || notebookData?.notebook.mindMapStatus === "generating";
                const isReady = !!mindMap;
                return (
                  <div
                    onClick={() => handleTabChange("mindmap")}
                    className={cn(
                      "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer flex flex-col justify-between min-h-[145px]",
                      activeSubTab === "mindmap"
                        ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                        : "border-border hover:border-foreground/20 hover:shadow-xs"
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
                    
                    <div className="space-y-2 pl-1">
                      <div className="flex items-center justify-between">
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                          <Network className="w-3.5 h-3.5" />
                        </div>
                        {isGenerating ? (
                          <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                        ) : isReady ? (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors truncate">
                          Mind Map
                        </h4>
                        <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                          Interconnect concepts in a graph.
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1">
                      <Button
                        size="sm"
                        disabled={isGenerating || !hasCompletedSources}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGenerateMindMap();
                        }}
                        className="text-[8px] h-5.5 px-2 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
                      >
                        {isReady ? "Re-Gen" : "Create"}
                      </Button>
                      
                      <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                        Open <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Card 3: Audio Podcast (col-span-2) */}
              {(() => {
                const isGenerating = isGeneratingPodcast || isGeneratingPodcastLocal || notebookData?.notebook.podcastStatus === "generating";
                const isReady = !!podcast;
                return (
                  <div
                    onClick={() => handleTabChange("podcast")}
                    className={cn(
                      "bg-card border p-3.5 rounded-[20px] transition-all duration-300 relative overflow-hidden group cursor-pointer col-span-2 flex flex-col justify-between min-h-[130px]",
                      activeSubTab === "podcast"
                        ? "border-accent shadow-level1 bg-white dark:bg-stone-900"
                        : "border-border hover:border-foreground/20 hover:shadow-xs"
                    )}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />
                    
                    <div className="space-y-2 pl-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center text-foreground">
                            <Headphones className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="text-[11px] font-bold text-foreground group-hover:text-accent transition-colors">
                            Audio Podcast
                          </h4>
                        </div>
                        {isGenerating ? (
                          <span className="w-2 h-2 bg-accent rounded-full animate-ping" title="Generating..." />
                        ) : isReady ? (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_#10b981]" title="Ready" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full" title="Not Started" />
                        )}
                      </div>

                      <p className="text-[9.5px] text-muted-foreground leading-snug line-clamp-2 font-semibold">
                        A synthetic host discussion dialogue summarizing your sources into talk-show audio.
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between pl-1.5">
                      <Button
                        size="sm"
                        disabled={isGenerating || !hasCompletedSources}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleGeneratePodcast();
                        }}
                        className="text-[8px] h-5.5 px-3 bg-foreground hover:bg-foreground/90 text-background font-bold uppercase tracking-wider rounded-full cursor-pointer transition-all duration-200"
                      >
                        {isReady ? "Regenerate" : "Generate Podcast"}
                      </Button>
                      
                      <span className="text-[9px] font-bold text-muted-foreground group-hover:text-accent transition-colors flex items-center gap-0.5">
                        Open <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })()}

            </div>
          </ScrollArea>
        </aside>
      </div>

      {/* Add Source Modal Dialog */}
      {isAddSourceOpen && activeNotebook && (
        <AddSourcePanel
          onClose={() => setIsAddSourceOpen(false)}
          onSubmit={handleAddSource}
          isUploading={isUploading}
        />
      )}

      {/* Dynamic Slide-over Right Drawer for Citations */}
      {viewingCitation && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0 cursor-pointer animate-in fade-in duration-200" onClick={() => setViewingCitation(null)} />
          <div className="relative w-full max-w-[500px] bg-card border-l border-border shadow-level2 z-10 flex flex-col h-full animate-in slide-in-from-right duration-300 rounded-l-[32px] overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col">
              <CitationCard
                viewingCitation={viewingCitation}
                onClose={() => setViewingCitation(null)}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
