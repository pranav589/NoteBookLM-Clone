"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Database, Plus, MessageSquare, Compass, Headphones, Layers, Network, Sparkles, X, Clock, Loader2, Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

import { NotebookSidebar } from "@/features/notebooks/NotebookSidebar";
import { SourceList } from "@/features/sources/SourceList";
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
    <main className="min-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      {/* Sleek Minimal Header */}
      <header className="h-16 border-b border-border bg-white flex items-center px-6 justify-between flex-shrink-0">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-1">
                NoteBook<span className="text-primary font-bold">LM</span>
              </h1>
              <p className="text-[9px] text-stone-400 font-bold tracking-widest">
                AI COGNITIVE RESEARCH AGENT
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-stone-50 border-border text-stone-600 flex items-center gap-1.5 py-1 px-3 text-[10px] font-semibold rounded-lg shadow-sm">
              <Database className="w-3.5 h-3.5 text-primary" />
              <span>MongoDB Connected</span>
            </Badge>
          </div>
        </div>

        {/* Right Header Section: Notifications */}
        <div className="relative flex items-center">
          <Popover>
            <PopoverTrigger
              onClick={() => {
                if (activeNotebook?._id) {
                  markAllAsRead();
                }
              }}
              className="relative p-2 text-stone-500 hover:text-stone-850 hover:bg-stone-100 rounded-xl transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-stone-200/50 outline-none"
              title="Notification Center"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white font-bold text-[8.5px] w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-80 bg-white border border-border rounded-2xl shadow-xl z-[999] p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <span className="text-xs font-bold text-stone-850">
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
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
        {/* Left Sidebar: Notebook Selection */}
        <NotebookSidebar
          activeNotebook={activeNotebook}
          setActiveNotebook={handleSetActiveNotebook}
        />

        {/* Central Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#FAFAF8]">
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
              <div className="flex gap-2.5 border-b border-border/80 pb-3">
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
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FCFAF6]/60">
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl mb-4 shadow-premium">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-stone-850">No Active Workspace</h2>
              <p className="text-xs text-stone-450 max-w-xs mt-2 leading-relaxed font-medium">
                Create a workspace in the left sidebar or select an existing one to begin adding sources.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Notebook Header */}
              <div className="px-6 py-4.5 border-b border-border bg-white flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-stone-850 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {activeNotebook.name}
                  </h2>
                  <p className="text-[10px] text-stone-400 mt-0.5 font-bold tracking-wider">
                    {sources.length} SOURCES INDEXED
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/95 hover:shadow-md text-white text-xs h-8 cursor-pointer shadow-sm rounded-lg font-bold px-3.5 transition-all duration-200"
                    onClick={() => setIsAddSourceOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Source
                  </Button>
                </div>
              </div>

              {/* Sub Tab Navigation */}
              <div className="border-b border-border/80 bg-stone-50/50 px-6 py-2.5 flex items-center gap-2 flex-shrink-0">
                <Button
                  variant={activeSubTab === "chat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabChange("chat")}
                  className={`text-xs h-8 px-3.5 cursor-pointer rounded-lg font-bold transition-all duration-250 ${
                    activeSubTab === "chat"
                      ? "bg-primary text-white hover:bg-primary/95 shadow-sm"
                      : "text-stone-600 hover:bg-stone-150 hover:text-stone-900"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Chat Q&A
                </Button>
                <Button
                  variant={activeSubTab === "roadmap" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabChange("roadmap")}
                  className={`text-xs h-8 px-3.5 cursor-pointer rounded-lg font-bold transition-all duration-250 ${
                    activeSubTab === "roadmap"
                      ? "bg-primary text-white hover:bg-primary/95 shadow-sm"
                      : "text-stone-600 hover:bg-stone-150 hover:text-stone-900"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 mr-1.5" />
                  Concept Roadmap
                </Button>
                <Button
                  variant={activeSubTab === "mindmap" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabChange("mindmap")}
                  className={`text-xs h-8 px-3.5 cursor-pointer rounded-lg font-bold transition-all duration-250 ${
                    activeSubTab === "mindmap"
                      ? "bg-primary text-white hover:bg-primary/95 shadow-sm"
                      : "text-stone-600 hover:bg-stone-150 hover:text-stone-900"
                  }`}
                >
                  <Network className="w-3.5 h-3.5 mr-1.5" />
                  Mind Map
                  {mindMap && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-amber-300 inline-block" />
                  )}
                </Button>
                <Button
                  variant={activeSubTab === "podcast" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleTabChange("podcast")}
                  className={`text-xs h-8 px-3.5 cursor-pointer rounded-lg font-bold transition-all duration-250 ${
                    activeSubTab === "podcast"
                      ? "bg-primary text-white hover:bg-primary/95 shadow-sm"
                      : "text-stone-600 hover:bg-stone-150 hover:text-stone-900"
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5 mr-1.5" />
                  Audio Podcast Dialogue
                </Button>
              </div>

              {/* Grid of Ingested Sources */}
              <SourceList
                sources={sources}
                onDeleteSource={handleDeleteSource}
                onReindexSource={handleReindexSource}
              />

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

        {/* Right Sidebar: Dynamic Source Viewer & Inspector */}
        <aside className="w-96 border-l border-border bg-card flex flex-col shadow-sm">
          <Tabs defaultValue="viewer" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border bg-stone-50/50 p-3 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-stone-100/80 p-1 border border-border/80 h-9 rounded-lg">
                <TabsTrigger
                  value="viewer"
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm rounded-md transition-all cursor-pointer font-medium"
                >
                  Source Viewer
                </TabsTrigger>
                <TabsTrigger
                  value="inspector"
                  className="text-xs data-[state=active]:bg-white data-[state=active]:text-stone-900 data-[state=active]:shadow-sm rounded-md transition-all cursor-pointer font-medium"
                >
                  RAG Pipeline
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Interactive Source Viewer */}
            <TabsContent value="viewer" className="flex-1 flex flex-col overflow-hidden m-0">
              {!viewingCitation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 bg-[#FCFAF6]/40">
                  <Clock className="w-8 h-8 text-stone-300 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Source Viewer
                  </p>
                  <p className="text-xs mt-1.5 text-stone-500 max-w-[220px] leading-relaxed">
                    Click a citation badge, roadmap step, or mind map node to display the corresponding source text context here.
                  </p>
                </div>
              ) : (
                <CitationCard
                  viewingCitation={viewingCitation}
                  onClose={() => setViewingCitation(null)}
                />
              )}
            </TabsContent>

            {/* Tab 2: RAG Pipeline Inspector */}
            <TabsContent value="inspector" className="flex-1 flex flex-col overflow-hidden m-0">
              {!activeMessage || activeMessage.role === "user" || !activeMessage.queries ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 bg-[#FCFAF6]/40">
                  <Layers className="w-8 h-8 text-stone-300 mb-3" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    RAG Inspector
                  </p>
                  <p className="text-xs mt-1.5 text-stone-500 max-w-[220px] leading-relaxed">
                    Select any completed assistant message to inspect RAG pipeline operations, query rewrites, and rank scores.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4 bg-[#FCFAF6]/30">
                  <div className="space-y-6">
                    {/* Query variants */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Query Expansion (LangChain)
                      </h3>

                      <div className="space-y-2 text-xs">
                        <div className="bg-white border border-border p-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <span className="text-[10px] text-stone-400 block font-semibold mb-1 uppercase tracking-wide">
                            Original User Query
                          </span>
                          <span className="text-stone-800 leading-relaxed font-medium">{activeMessage.queries.original}</span>
                        </div>

                        <div className="bg-white border border-border p-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <span className="text-[10px] text-stone-400 block font-semibold mb-1 uppercase tracking-wide">
                            Rewritten Query
                          </span>
                          <span className="text-stone-855 leading-relaxed">{activeMessage.queries.rewritten}</span>
                        </div>

                        <div className="bg-white border border-border p-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <span className="text-[10px] text-stone-400 block font-semibold mb-1 uppercase tracking-wide">
                            Step-Back Question
                          </span>
                          <span className="text-stone-850 leading-relaxed italic">"{activeMessage.queries.stepBack}"</span>
                        </div>

                        <div className="bg-white border border-border p-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <span className="text-[10px] text-stone-400 block font-semibold mb-1 uppercase tracking-wide">
                            Sub-Queries Decomposition
                          </span>
                          <ul className="list-decimal pl-4 space-y-1.5 text-stone-750 mt-1">
                            {activeMessage.queries.subQueries.map((q, idx) => (
                              <li key={idx} className="leading-relaxed">{q}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-white border border-border p-3 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                          <span className="text-[10px] text-stone-400 block font-semibold mb-1 uppercase tracking-wide">
                            HyDE Document (Hypothetical Answer)
                          </span>
                          <p className="text-stone-600 italic mt-0.5 leading-relaxed">
                            "{activeMessage.queries.hyde}"
                          </p>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Fused chunks */}
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Fused Rank Candidates (RRF)
                      </h3>

                      <div className="space-y-2.5">
                        {activeMessage.sources?.map((src) => (
                          <div
                            key={src.index}
                            onClick={() => setViewingCitation(src)}
                            className="bg-white border border-border p-3 rounded-xl space-y-2 hover:border-amber-400/70 hover:shadow-sm transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                          >
                            <div className="flex items-center justify-between border-b border-stone-100 pb-1.5">
                              <span className="font-semibold text-stone-850 truncate max-w-[170px] text-[11px]">
                                {src.source}
                              </span>
                              <Badge variant="outline" className="text-[9px] bg-stone-50 border-border text-stone-500 font-bold px-1.5 py-0">
                                Rank #{src.index}
                              </Badge>
                            </div>

                            <p className="text-stone-600 line-clamp-2 leading-relaxed text-[11px]">
                                {src.text}
                            </p>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono border border-amber-100">
                                RRF Score: {src.rrfScore.toFixed(4)}
                              </span>
                              <span className="text-[9px] bg-stone-105 text-stone-500 px-1.5 py-0.5 rounded font-mono border border-stone-200">
                                Type: {src.metadata?.sourceType}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
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
    </main>
  );
}
