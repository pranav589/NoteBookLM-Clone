"use client";

import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api-client";
import {
  UploadCloud,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FileText,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  User,
  Bot,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Play,
  Globe,
  Video,
  Clock,
  Compass,
  Headphones,
  MapPin,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SourceMetadata {
  notebookId: string;
  sourceId: string;
  sourceName: string;
  sourceType: "pdf" | "text" | "url" | "youtube" | "transcript";
  chunkIndex: number;
  pageNumber?: number;
  url?: string;
  timestamp?: number;
}

interface CitationSource {
  index: number;
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
  rrfScore: number;
  matchedBy: string[];
  metadata: SourceMetadata;
}

interface Queries {
  original: string;
  rewritten: string;
  stepBack: string;
  hyde: string;
  subQueries: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  queries?: Queries;
  sources?: CitationSource[];
  status?: "pending" | "done" | "failed";
}

interface Notebook {
  _id: string;
  name: string;
  createdAt: string;
}

interface SourceDoc {
  _id: string;
  notebookId: string;
  name: string;
  type: "pdf" | "text" | "url" | "youtube" | "transcript";
  status: "uploading" | "indexing" | "completed" | "failed";
  error?: string;
  pathOrUrl?: string;
  createdAt: string;
}

interface RoadmapNode {
  id: string;
  concept: string;
  description: string;
  sourceName: string;
  sourceType: "pdf" | "text" | "url" | "youtube" | "transcript";
  url: string;
  timestamp: number;
  reason: string;
}

interface Roadmap {
  title: string;
  description: string;
  nodes: RoadmapNode[];
}

interface Podcast {
  success: boolean;
  audioUrl: string;
  script: { speaker: string; text: string }[];
}

export default function Home() {
  // Navigation & Notebooks States
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [newNotebookName, setNewNotebookName] = useState("");

  // Tab selections inside the Notebook
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "roadmap" | "podcast">("chat");

  // Ingestion States
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [sourceType, setSourceType] = useState<"pdf" | "text" | "url" | "youtube" | "transcript">("pdf");
  
  // Custom Source Inputs
  const [webUrl, setWebUrl] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [pastedTextName, setPastedTextName] = useState("");
  const [pastedTextContent, setPastedTextContent] = useState("");
  
  // File uploads
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Source Viewer States
  const [viewingCitation, setViewingCitation] = useState<CitationSource | null>(null);

  // Roadmap & Podcast States
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [podcast, setPodcast] = useState<Podcast | null>(null);

  // Polling Job states
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // -------------------------------------------------------------
  // REACT QUERY CALLS
  // -------------------------------------------------------------

  // 1. Fetch notebooks
  const { data: notebooks = [], isLoading: isLoadingNotebooks } = useQuery<Notebook[]>({
    queryKey: ["notebooks"],
    queryFn: () => apiFetch<Notebook[]>("/notebooks"),
  });

  // 2. Fetch active notebook details
  const { data: notebookData } = useQuery<any>({
    queryKey: ["notebook", activeNotebook?._id],
    queryFn: () => apiFetch<any>(`/notebooks/${activeNotebook?._id}`),
    enabled: !!activeNotebook?._id,
    refetchInterval: (query) => {
      const sources = query.state.data?.sources || [];
      const hasIndexing = sources.some(
        (s: any) => s.status === "indexing" || s.status === "uploading"
      );
      return hasIndexing ? 2500 : false;
    },
  });

  const sources: SourceDoc[] = notebookData?.sources || [];

  // 3. Poll query job status
  const { data: jobStatus } = useQuery<any>({
    queryKey: ["job", activeJobId],
    queryFn: () => apiFetch<any>(`/jobs/${activeJobId}`),
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return (status === "completed" || status === "failed") ? false : 2000;
    },
  });

  // 4. Create notebook mutation
  const createNotebookMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<Notebook>("/notebooks", { method: "POST", data: { name } }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      setActiveNotebook(data);
      setNewNotebookName("");
    },
  });

  // 5. Delete notebook mutation
  const deleteNotebookMutation = useMutation({
    mutationFn: (id: string) => apiFetch<any>(`/notebooks/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      if (activeNotebook?._id === id) {
        setActiveNotebook(null);
      }
    },
  });

  // 6. Add source mutation
  const addSourceMutation = useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch<any>(`/notebooks/${activeNotebook?._id}/sources`, {
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      setIsAddSourceOpen(false);
      setWebUrl("");
      setYtUrl("");
      setPastedTextName("");
      setPastedTextContent("");
    },
    onError: (err: any) => {
      alert(`Ingestion failed: ${err.message || err}`);
    },
  });

  // 7. Delete source mutation
  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch<any>(`/notebooks/${activeNotebook?._id}/sources/${sourceId}`, {
        method: "DELETE",
      }),
    onSuccess: (_, sourceId) => {
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
      if (viewingCitation?.metadata?.sourceId === sourceId) {
        setViewingCitation(null);
      }
    },
  });

  // 8. Reindex source mutation (with optimistic update)
  const reindexSourceMutation = useMutation({
    mutationFn: (sourceId: string) =>
      apiFetch<any>(`/notebooks/${activeNotebook?._id}/sources/${sourceId}`, {
        method: "POST",
      }),
    onMutate: async (sourceId) => {
      await queryClient.cancelQueries({ queryKey: ["notebook", activeNotebook?._id] });
      const previousNotebookData = queryClient.getQueryData(["notebook", activeNotebook?._id]);

      if (previousNotebookData) {
        queryClient.setQueryData(["notebook", activeNotebook?._id], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            sources: old.sources.map((s: any) =>
              s._id === sourceId ? { ...s, status: "indexing", error: undefined } : s
            ),
          };
        });
      }

      return { previousNotebookData };
    },
    onError: (err, sourceId, context: any) => {
      if (context?.previousNotebookData) {
        queryClient.setQueryData(["notebook", activeNotebook?._id], context.previousNotebookData);
      }
      console.error(err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebook", activeNotebook?._id] });
    },
  });

  // 9. Submit query mutation
  const submitQueryMutation = useMutation({
    mutationFn: (queryText: string) =>
      apiFetch<{ jobId: string }>("/query", {
        method: "POST",
        data: { query: queryText, notebookId: activeNotebook?._id },
      }),
  });

  // 10. Generate roadmap mutation
  const generateRoadmapMutation = useMutation({
    mutationFn: () =>
      apiFetch<Roadmap>("/roadmap", {
        method: "POST",
        data: { notebookId: activeNotebook?._id },
      }),
    onSuccess: (data) => {
      setRoadmap(data);
    },
    onError: (err: any) => {
      alert(`Roadmap Generation failed: ${err.message || err}`);
    },
  });

  // 11. Generate podcast mutation
  const generatePodcastMutation = useMutation({
    mutationFn: () =>
      apiFetch<Podcast>("/podcast", {
        method: "POST",
        data: { notebookId: activeNotebook?._id },
      }),
    onSuccess: (data) => {
      setPodcast(data);
    },
    onError: (err: any) => {
      alert(`Podcast Generation failed: ${err.message || err}`);
    },
  });

  // Mutation pending states mapped to variables used in JSX
  const isCreatingNotebook = createNotebookMutation.isPending;
  const isUploading = addSourceMutation.isPending;
  const isGeneratingRoadmap = generateRoadmapMutation.isPending;
  const isGeneratingPodcast = generatePodcastMutation.isPending;

  // -------------------------------------------------------------
  // EFFECTS
  // -------------------------------------------------------------

  // Set the first notebook active when notebooks load on start
  useEffect(() => {
    if (notebooks.length > 0 && !activeNotebook) {
      setActiveNotebook(notebooks[0]);
    }
  }, [notebooks, activeNotebook]);

  // Seed the initial welcome message when active notebook changes
  useEffect(() => {
    if (notebookData) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Welcome to "${notebookData.notebook.name}"! Ingest PDFs, plaintext files, website links, or YouTube videos on the left side, then ask questions about them. Answers will include citations linked to their source documents.`,
        },
      ]);
      setSelectedMessageId("welcome");
      setViewingCitation(null);
      setRoadmap(null);
      setPodcast(null);
      setActiveSubTab("chat");
    } else {
      setMessages([]);
      setViewingCitation(null);
      setRoadmap(null);
      setPodcast(null);
    }
  }, [notebookData?.notebook?._id]);

  // Handle query job completion state
  useEffect(() => {
    if (!jobStatus || !activeMessageId) return;

    if (jobStatus.status === "completed") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === activeMessageId
            ? {
                ...m,
                status: "done",
                content: jobStatus.result.answer,
                queries: jobStatus.result.queries,
                sources: jobStatus.result.sources,
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

  // Helper to extract Youtube ID
  const getYoutubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // -------------------------------------------------------------
  // BRIDGE HANDLERS
  // -------------------------------------------------------------

  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim() || createNotebookMutation.isPending) return;
    createNotebookMutation.mutate(newNotebookName.trim());
  };

  const handleDeleteNotebook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this notebook? All indexed source documents and vector embeddings will be permanently deleted.")) return;
    deleteNotebookMutation.mutate(id);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileIngest(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileIngest(e.target.files[0]);
    }
  };

  const handleFileIngest = (file: File) => {
    if (!activeNotebook) return;
    const formData = new FormData();
    formData.append("type", sourceType);
    formData.append("file", file);
    addSourceMutation.mutate(formData);
  };

  const handleTextOrUrlIngest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNotebook) return;

    const formData = new FormData();
    formData.append("type", sourceType);

    if (sourceType === "text") {
      formData.append("name", pastedTextName.trim());
      formData.append("text", pastedTextContent.trim());
    } else if (sourceType === "url") {
      formData.append("url", webUrl.trim());
    } else if (sourceType === "youtube") {
      formData.append("url", ytUrl.trim());
    }

    addSourceMutation.mutate(formData);
  };

  const handleDeleteSource = (sourceId: string) => {
    if (!activeNotebook) return;
    if (!confirm("Remove this source? All associated vector embeddings will be deleted.")) return;
    deleteSourceMutation.mutate(sourceId);
  };

  const handleReindexSource = (sourceId: string) => {
    if (!activeNotebook) return;
    reindexSourceMutation.mutate(sourceId);
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isQuerying || !activeNotebook) return;

    const queryId = `${Date.now()}`;
    const userMsg: Message = {
      id: `${queryId}-user`,
      role: "user",
      content: inputQuery,
    };

    const assistantPendingMsg: Message = {
      id: queryId,
      role: "assistant",
      content: "Reviewing active notebook sources and generating answer...",
      status: "pending",
    };

    setMessages((prev) => [...prev, userMsg, assistantPendingMsg]);
    setSelectedMessageId(queryId);
    setInputQuery("");
    setIsQuerying(true);

    submitQueryMutation.mutate(userMsg.content, {
      onSuccess: (data) => {
        setActiveJobId(data.jobId);
        setActiveMessageId(queryId);
      },
      onError: (err: any) => {
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
      },
    });
  };

  const handleGenerateRoadmap = () => {
    if (!activeNotebook || generateRoadmapMutation.isPending) return;
    generateRoadmapMutation.mutate();
  };

  const handleGeneratePodcast = () => {
    if (!activeNotebook || generatePodcastMutation.isPending) return;
    generatePodcastMutation.mutate();
  };

  // Interactive node click triggers Right Sidebar Source Viewer at specific timestamp
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

  const activeMessage = messages.find((m) => m.id === selectedMessageId);

  // Render inline citations [Source X] as clickable buttons
  const renderResponseWithCitations = (content: string, responseSources?: CitationSource[]) => {
    if (!responseSources || responseSources.length === 0) {
      return <p className="mt-1 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{content}</p>;
    }

    const parts = content.split(/(\[Source\s+\d+\])/gi);
    return (
      <p className="mt-1 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {parts.map((part, index) => {
          const match = part.match(/\[Source\s+(\d+)\]/i);
          if (match) {
            const citeIndex = parseInt(match[1], 10);
            const matchedSource = responseSources.find((s) => s.index === citeIndex);
            
            if (matchedSource) {
              return (
                <button
                  key={index}
                  onClick={() => setViewingCitation(matchedSource)}
                  className="mx-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 text-xs font-bold border border-cyan-500/30 transition shadow-sm cursor-pointer"
                >
                  {citeIndex}
                </button>
              );
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 p-2 rounded-lg text-white">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                NoteBookLM
              </h1>
              <p className="text-xs text-slate-400">Isolated Workspaces, Dynamic Sources, & Edge TTS</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-slate-400 text-xs">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>MongoDB Atlas Connected</span>
          </div>
        </div>
      </header>

      {/* App Body Layout */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-4rem)]">
        
        {/* Left Sidebar: Notebook Selection */}
        <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col">
          <div className="p-4 border-b border-slate-900">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-500" />
              Workspaces
            </h2>
            <form onSubmit={handleCreateNotebook} className="flex gap-2 mt-3">
              <Input
                placeholder="New Notebook..."
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                className="bg-slate-900 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-8"
              />
              <Button type="submit" size="icon" className="h-8 w-8 bg-cyan-600 hover:bg-cyan-500 text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </form>
          </div>

          <ScrollArea className="flex-1 p-2">
            {isLoadingNotebooks ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              </div>
            ) : notebooks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">No notebooks yet. Create one above.</p>
            ) : (
              <div className="space-y-1">
                {notebooks.map((nb) => (
                  <div
                    key={nb._id}
                    onClick={() => setActiveNotebook(nb)}
                    className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-xs ${
                      activeNotebook?._id === nb._id
                        ? "bg-slate-800 text-white font-medium shadow-sm border border-slate-700"
                        : "text-slate-400 hover:bg-slate-900 hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="truncate pr-2">{nb.name}</span>
                    <button
                      onClick={(e) => handleDeleteNotebook(nb._id, e)}
                      className="text-slate-500 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Central Workspace */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900/10">
          {!activeNotebook ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <BookOpen className="w-16 h-16 text-slate-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-200">No active workspace</h2>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Create a notebook or select an existing one in the sidebar to begin ingestion.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Notebook Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="font-bold text-slate-100 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    {activeNotebook.name}
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {sources.length} document source(s) indexed in this workspace
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8"
                    onClick={() => setIsAddSourceOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add Source
                  </Button>
                </div>
              </div>

              {/* Sub Tab Navigation */}
              <div className="border-b border-slate-800/80 bg-slate-900/10 px-4 py-2 flex items-center gap-2 flex-shrink-0">
                <Button
                  variant={activeSubTab === "chat" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSubTab("chat")}
                  className={`text-xs h-7 px-3 ${
                    activeSubTab === "chat"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Chat Q&A
                </Button>
                <Button
                  variant={activeSubTab === "roadmap" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSubTab("roadmap")}
                  className={`text-xs h-7 px-3 ${
                    activeSubTab === "roadmap"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 mr-1.5" />
                  Concept Roadmap
                </Button>
                <Button
                  variant={activeSubTab === "podcast" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveSubTab("podcast")}
                  className={`text-xs h-7 px-3 ${
                    activeSubTab === "podcast"
                      ? "bg-slate-800 text-white border border-slate-700"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5 mr-1.5" />
                  Audio Podcast Dialogue
                </Button>
              </div>

              {/* Grid of Ingested Sources */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-800/85 flex-shrink-0">
                <h3 className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-2">
                  Knowledge Materials
                </h3>
                {sources.length === 0 ? (
                  <div className="border border-dashed border-slate-800 rounded-lg p-5 text-center text-xs text-slate-500">
                    No sources ingested. Click "Add Source" to upload PDFs, URLs, plain text, or transcripts.
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
                    {sources.map((s) => (
                      <Card key={s._id} className="w-44 bg-slate-950 border-slate-850 text-slate-200 flex-shrink-0">
                        <CardHeader className="p-2.5 pb-0.5 flex flex-row items-start justify-between space-y-0">
                          <div className="min-w-0 pr-1.5">
                            <CardTitle className="text-[11px] font-semibold truncate text-slate-200">
                              {s.name}
                            </CardTitle>
                            <span className="text-[9px] uppercase font-bold text-cyan-400 block mt-0.5">
                              {s.type}
                            </span>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleReindexSource(s._id)}
                              title="Re-index"
                              className="text-slate-500 hover:text-cyan-400 p-0.5"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSource(s._id)}
                              title="Delete"
                              className="text-slate-500 hover:text-red-400 p-0.5"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-2.5 pt-0">
                          <div className="flex items-center mt-1">
                            {s.status === "completed" && (
                              <span className="flex items-center text-[8px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-1 py-0.2 rounded">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                Ready
                              </span>
                            )}
                            {s.status === "indexing" && (
                              <span className="flex items-center text-[8px] text-amber-400 bg-amber-950/20 border border-amber-500/20 px-1 py-0.2 rounded animate-pulse">
                                <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                Indexing
                              </span>
                            )}
                            {s.status === "failed" && (
                              <span
                                title={s.error}
                                className="flex items-center text-[8px] text-red-400 bg-red-950/20 border border-red-500/20 px-1 py-0.2 rounded cursor-help"
                              >
                                <AlertCircle className="w-2.5 h-2.5 mr-1" />
                                Failed
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Content Area based on Tab Selection */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/20">
                
                {/* SUB-TAB 1: CHAT QA */}
                {activeSubTab === "chat" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                      {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                          Chat interface initialized. Ask anything about your sources!
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              onClick={() => setSelectedMessageId(msg.id)}
                              className={`flex gap-3 p-4 rounded-xl cursor-pointer transition-all border ${
                                selectedMessageId === msg.id
                                  ? "bg-slate-900/60 border-slate-700/80 shadow-md ring-1 ring-cyan-500/10"
                                  : "bg-slate-950/40 border-slate-800 hover:bg-slate-900/30"
                              }`}
                            >
                              <div className="mt-0.5">
                                {msg.role === "user" ? (
                                  <div className="w-8 h-8 rounded-full bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                                    <User className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                                    <Bot className="w-4 h-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {msg.role === "user" ? "You" : "Notebook RAG"}
                                  </span>
                                  {msg.status === "pending" && (
                                    <span className="flex items-center text-[10px] text-amber-400">
                                      <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                      Reviewing sources...
                                    </span>
                                  )}
                                  {msg.status === "failed" && (
                                    <span className="flex items-center text-[10px] text-red-400">
                                      <AlertCircle className="w-2.5 h-2.5 mr-1" />
                                      Error
                                    </span>
                                  )}
                                </div>
                                {msg.role === "user" ? (
                                  <p className="mt-1 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                  renderResponseWithCitations(msg.content, msg.sources)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    {/* Input Bar */}
                    <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
                      <form onSubmit={handleQuerySubmit} className="flex gap-2">
                        <Input
                          placeholder={sources.filter(s => s.status === 'completed').length === 0 ? "Ingest a source on the left to activate chat..." : "Ask a question about the active notebook documents..."}
                          value={inputQuery}
                          onChange={(e) => setInputQuery(e.target.value)}
                          disabled={isQuerying || sources.filter(s => s.status === 'completed').length === 0}
                          className="flex-1 bg-slate-950 border-slate-850 text-slate-100 placeholder:text-slate-500 focus-visible:ring-cyan-500 h-10 text-sm"
                        />
                        <Button
                          type="submit"
                          disabled={isQuerying || !inputQuery.trim() || sources.filter(s => s.status === 'completed').length === 0}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 h-10"
                        >
                          {isQuerying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4" />
                          )}
                        </Button>
                      </form>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: STUDY ROADMAP */}
                {activeSubTab === "roadmap" && (
                  <ScrollArea className="flex-1 p-6">
                    {!roadmap ? (
                      <div className="max-w-md mx-auto text-center py-12 space-y-4">
                        <Compass className="w-16 h-16 text-slate-700 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-200">Personalized Learning Roadmap</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Synthesize concept checkpoints out of your ingested YouTube subtitles, Web articles, and PDFs. Click below to map a custom path of nodes.
                        </p>
                        <Button
                          disabled={isGeneratingRoadmap || sources.filter(s => s.status === 'completed').length === 0}
                          onClick={handleGenerateRoadmap}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-6"
                        >
                          {isGeneratingRoadmap ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                              Analyzing Concepts...
                            </>
                          ) : (
                            "Generate Study Roadmap"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="border-b border-slate-850 pb-3">
                          <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                            <Compass className="w-5 h-5" />
                            {roadmap.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{roadmap.description}</p>
                        </div>

                        {/* Interactive Timeline Nodes */}
                        <div className="relative border-l border-cyan-800/40 ml-4 pl-6 space-y-8">
                          {roadmap.nodes.map((node, idx) => (
                            <div
                              key={node.id}
                              onClick={() => handleRoadmapNodeClick(node)}
                              className="relative bg-slate-900/40 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-800/40 p-4 rounded-xl cursor-pointer transition shadow-md group"
                            >
                              {/* Glowing Node Dot */}
                              <div className="absolute -left-[31px] top-4 bg-slate-950 border border-cyan-500 rounded-full w-4 h-4 flex items-center justify-center ring-4 ring-cyan-500/10 group-hover:bg-cyan-500 transition-colors">
                                <span className="text-[8px] font-bold text-cyan-400 group-hover:text-slate-950">
                                  {idx + 1}
                                </span>
                              </div>

                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                                  {node.concept}
                                </h4>
                                <span className="text-[9px] uppercase font-bold text-cyan-500 flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  Step {idx + 1}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                {node.description}
                              </p>
                              
                              {/* Reason/Prerequisite */}
                              <p className="text-[10px] text-slate-500 italic mt-2 border-t border-slate-850/50 pt-1.5">
                                <span className="font-semibold text-slate-400 not-italic">Why study this: </span>
                                {node.reason}
                              </p>

                              {/* Target Source Link */}
                              <div className="mt-3 flex items-center justify-between text-[10px] bg-slate-950/60 p-2 rounded border border-slate-850">
                                <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                                  {node.sourceType === "youtube" ? (
                                    <Video className="w-3.5 h-3.5 text-red-500" />
                                  ) : (
                                    <FileText className="w-3.5 h-3.5 text-cyan-500" />
                                  )}
                                  <span className="truncate font-semibold text-slate-400">
                                    {node.sourceName}
                                  </span>
                                </div>
                                <span className="text-cyan-400 flex items-center gap-1 text-[9px] font-bold uppercase group-hover:underline">
                                  <Play className="w-2.5 h-2.5 fill-cyan-400/20" />
                                  {node.sourceType === "youtube"
                                    ? `Watch @ ${new Date(node.timestamp * 1000).toISOString().substr(14, 5)}`
                                    : "View Document"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                )}

                {/* SUB-TAB 3: AUDIO PODCAST */}
                {activeSubTab === "podcast" && (
                  <ScrollArea className="flex-1 p-6">
                    {!podcast ? (
                      <div className="max-w-md mx-auto text-center py-12 space-y-4">
                        <Headphones className="w-16 h-16 text-slate-700 mx-auto" />
                        <h3 className="text-lg font-bold text-slate-200">Interactive Audio Podcast</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Generate a synthetic talk-show conversation between two hosts (Andrew and Emma) reviewing your workspace documents. Utilises Edge TTS for human-like speech.
                        </p>
                        <Button
                          disabled={isGeneratingPodcast || sources.filter(s => s.status === 'completed').length === 0}
                          onClick={handleGeneratePodcast}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2 px-6"
                        >
                          {isGeneratingPodcast ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                              Compiling Neural Voice Audio...
                            </>
                          ) : (
                            "Generate Audio Podcast"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="border-b border-slate-850 pb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-base font-bold text-cyan-400 flex items-center gap-2">
                              <Headphones className="w-5 h-5" />
                              Notebook Talk Show
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">Generated dialogue script between Andrew and Emma</p>
                          </div>
                        </div>

                        {/* HTML Audio Player */}
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md flex flex-col md:flex-row items-center gap-4">
                          <div className="p-3 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-full">
                            <Volume2 className="w-6 h-6 animate-pulse" />
                          </div>
                          <div className="flex-1 w-full">
                            <audio src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000"}${podcast.audioUrl}`} controls className="w-full" />
                          </div>
                        </div>

                        {/* Dialogue Transcript */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Dialogue Script Transcript
                          </h4>
                          <div className="space-y-3">
                            {podcast.script.map((line, idx) => (
                              <div
                                key={idx}
                                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                                  line.speaker === "Host A"
                                    ? "bg-cyan-950/20 border-cyan-800/20 mr-12"
                                    : "bg-purple-950/20 border-purple-800/20 ml-12"
                                }`}
                              >
                                <span className={`text-[9px] uppercase font-bold tracking-wider block mb-1 ${
                                  line.speaker === "Host A" ? "text-cyan-400" : "text-purple-400"
                                }`}>
                                  {line.speaker === "Host A" ? "Andrew (Host A)" : "Emma (Host B)"}
                                </span>
                                <p className="text-slate-200">{line.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                )}

              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Dynamic Source Viewer & Inspector */}
        <aside className="w-96 border-l border-slate-800 bg-slate-950 flex flex-col">
          <Tabs defaultValue="viewer" className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/40 p-2 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-slate-950 p-1 border border-slate-850 h-9">
                <TabsTrigger value="viewer" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white cursor-pointer">
                  Source Viewer
                </TabsTrigger>
                <TabsTrigger value="inspector" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white cursor-pointer">
                  RAG Pipeline
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab 1: Interactive Source Viewer */}
            <TabsContent value="viewer" className="flex-1 flex flex-col overflow-hidden m-0">
              {!viewingCitation ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Clock className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Source Viewer</p>
                  <p className="text-xs mt-1 text-slate-500 max-w-[200px] leading-relaxed">
                    Click a citation badge in a response message or a roadmap step node to load source frames.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
                  <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-shrink-0">
                    <div className="min-w-0 pr-4">
                      <h4 className="font-bold text-sm text-slate-200 truncate" title={viewingCitation.source}>
                        {viewingCitation.source}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/30 border border-cyan-800/30 px-2 py-0.5 rounded">
                          {viewingCitation.metadata?.sourceType}
                        </span>
                        {viewingCitation.metadata?.pageNumber && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Page {viewingCitation.metadata.pageNumber}
                          </span>
                        )}
                        {viewingCitation.metadata?.timestamp !== undefined && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-cyan-500" />
                            {new Date(viewingCitation.metadata.timestamp * 1000).toISOString().substr(14, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setViewingCitation(null)}
                      className="text-slate-400 hover:text-white p-1 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* YouTube Player Embed */}
                  {viewingCitation.metadata?.sourceType === "youtube" && (
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 shadow-md">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYoutubeVideoId(
                          viewingCitation.metadata.url || ""
                        )}?start=${viewingCitation.metadata.timestamp || 0}&autoplay=1`}
                        title="YouTube source context"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  )}

                  {/* Document Text Content */}
                  <div className="flex-1 overflow-hidden flex flex-col bg-slate-900/30 border border-slate-800 rounded-lg p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block border-b border-slate-800 pb-1.5">
                      Cited Context Excerpt
                    </span>
                    <ScrollArea className="flex-1">
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-3 border border-slate-900 rounded-md ring-1 ring-cyan-500/10">
                        {viewingCitation.text}
                      </p>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: RAG Pipeline Inspector */}
            <TabsContent value="inspector" className="flex-1 flex flex-col overflow-hidden m-0">
              {!activeMessage || activeMessage.role === "user" || !activeMessage.queries ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Layers className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">RAG Inspector</p>
                  <p className="text-xs mt-1 text-slate-500 max-w-[200px] leading-relaxed">
                    Select a completed assistant message to inspect RAG pipeline operations.
                  </p>
                </div>
              ) : (
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-6">
                    
                    {/* Query variants */}
                    <div className="space-y-2.5">
                      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Query Expansion (LangChain)
                      </h3>

                      <div className="space-y-2 text-xs">
                        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded">
                          <span className="text-slate-400 block font-semibold mb-1">Original User Query</span>
                          <span className="text-slate-200">{activeMessage.queries.original}</span>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded">
                          <span className="text-slate-400 block font-semibold mb-1">Rewritten Query</span>
                          <span className="text-slate-200">{activeMessage.queries.rewritten}</span>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded">
                          <span className="text-slate-400 block font-semibold mb-1">Step-Back Question</span>
                          <span className="text-slate-200">{activeMessage.queries.stepBack}</span>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded">
                          <span className="text-slate-400 block font-semibold mb-1">Sub-Queries Decomposition</span>
                          <ul className="list-decimal pl-4 space-y-1 text-slate-200 mt-1">
                            {activeMessage.queries.subQueries.map((q, idx) => (
                              <li key={idx}>{q}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded">
                          <span className="text-slate-400 block font-semibold mb-1">HyDE Document</span>
                          <p className="text-slate-300 italic mt-0.5 leading-relaxed">
                            "{activeMessage.queries.hyde}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Fused chunks */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        Fused Rank Candidates (RRF)
                      </h3>

                      <div className="space-y-2.5">
                        {activeMessage.sources?.map((src) => (
                          <div
                            key={src.index}
                            onClick={() => setViewingCitation(src)}
                            className="bg-slate-900/40 border border-slate-850 p-2.5 rounded text-xs space-y-1.5 hover:border-slate-700 transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between border-b border-slate-900 pb-1">
                              <span className="font-semibold text-slate-300 truncate max-w-[150px]">
                                {src.source}
                              </span>
                              <span className="text-[9px] bg-slate-950 text-cyan-400 px-1 rounded border border-cyan-950">
                                Rank #{src.index}
                              </span>
                            </div>

                            <p className="text-slate-400 line-clamp-2 leading-relaxed text-[11px]">
                              {src.text}
                            </p>

                            <div className="flex flex-wrap gap-1 pt-1">
                              <span className="text-[9px] bg-slate-950 text-purple-400 px-1 py-0.5 rounded font-mono">
                                RRF: {src.rrfScore.toFixed(4)}
                              </span>
                              <span className="text-[9px] bg-slate-950 text-slate-400 px-1 py-0.5 rounded font-mono">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                Add Source to Workspace
              </h3>
              <button
                onClick={() => setIsAddSourceOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {/* Selector Tabs */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 block">
                  Select Source Type
                </label>
                <div className="grid grid-cols-5 gap-1.5 bg-slate-950 p-1 border border-slate-850 rounded-lg">
                  {[
                    { id: "pdf", label: "PDF", icon: FileText },
                    { id: "text", label: "Text", icon: FileText },
                    { id: "url", label: "Website", icon: Globe },
                    { id: "youtube", label: "YouTube", icon: Video },
                    { id: "transcript", label: "VTT File", icon: Clock },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSourceType(tab.id as any)}
                        className={`flex flex-col items-center justify-center p-2 rounded-md transition text-center cursor-pointer ${
                          sourceType === tab.id
                            ? "bg-slate-800 text-white font-medium shadow-sm border border-slate-700"
                            : "text-slate-400 hover:text-white hover:bg-slate-900/40 text-[10px]"
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span className="text-[9px]">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Ingest Forms */}
              {sourceType === "pdf" || sourceType === "transcript" || (sourceType === "text" && !dragActive) ? (
                // File upload drag drop section
                sourceType !== "text" || !formDataHasText() ? (
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Upload {sourceType === "pdf" ? "PDF Document" : sourceType === "transcript" ? "WebVTT Subtitle file (.vtt)" : "Plain Text file (.txt)"}
                    </label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                        dragActive
                          ? "border-cyan-500 bg-cyan-500/5"
                          : "border-slate-800 hover:border-slate-700 bg-slate-950"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept={
                          sourceType === "pdf"
                            ? "application/pdf"
                            : sourceType === "transcript"
                            ? ".vtt"
                            : ".txt,text/plain"
                        }
                        className="hidden"
                      />
                      <UploadCloud className="w-12 h-12 text-slate-600 mb-2" />
                      <p className="text-xs text-slate-300 font-medium">
                        Drag & Drop or <span className="text-cyan-400">Browse</span> your file
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Files are parsed, chunked, and vector-indexed in the background
                      </p>
                    </div>
                  </div>
                ) : null
              ) : null}

              {/* Pasted text option */}
              {sourceType === "text" && (
                <form onSubmit={handleTextOrUrlIngest} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Document Title / Name
                    </label>
                    <Input
                      placeholder="e.g. Project Notes, API Spec..."
                      value={pastedTextName}
                      onChange={(e) => setPastedTextName(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Paste Plain Text Content
                    </label>
                    <textarea
                      placeholder="Enter or paste plain text here..."
                      value={pastedTextContent}
                      onChange={(e) => setPastedTextContent(e.target.value)}
                      required
                      rows={6}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isUploading || !pastedTextContent.trim() || !pastedTextName.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-9"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Ingesting Text...
                      </>
                    ) : (
                      "Ingest Plain Text"
                    )}
                  </Button>
                </form>
              )}

              {/* Web URL option */}
              {sourceType === "url" && (
                <form onSubmit={handleTextOrUrlIngest} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Webpage URL to Scrape
                    </label>
                    <Input
                      placeholder="https://example.com/blog-post"
                      type="url"
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Friendly Name / Title (Optional)
                    </label>
                    <Input
                      placeholder="e.g. Scraped Blog Page"
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                      onChange={(e) => setPastedTextName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isUploading || !webUrl.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-9"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Scraping Page...
                      </>
                    ) : (
                      "Scrape and Ingest Website"
                    )}
                  </Button>
                </form>
              )}

              {/* YouTube Video option */}
              {sourceType === "youtube" && (
                <form onSubmit={handleTextOrUrlIngest} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      YouTube Video URL
                    </label>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=VIDEO_ID"
                      type="url"
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      required
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Video Name / Title (Optional)
                    </label>
                    <Input
                      placeholder="e.g. React Tutorial"
                      className="bg-slate-950 border-slate-850 text-slate-100 text-xs"
                      onChange={(e) => setPastedTextName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isUploading || !ytUrl.trim()}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-9"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Downloading Transcripts...
                      </>
                    ) : (
                      "Fetch and Ingest YouTube Transcript"
                    )}
                  </Button>
                </form>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-850 text-right flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddSourceOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  // Helper check
  function formDataHasText() {
    return pastedTextContent.trim().length > 0;
  }
}
