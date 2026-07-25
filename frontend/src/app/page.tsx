"use client";

import React, { useState, useEffect } from "react";
import { Layers, Plus, Database, BookOpen, Loader2, Sparkles, Compass, Headphones, MessageSquare, Trash2, Calendar, Search, ArrowRight, FolderClosed, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotebooks } from "@/features/notebooks/hooks/useNotebooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/AuthContext";

// Sleek color schemas for cards: left border indicators and icon accents
const colors = [
  {
    indicator: "bg-amber-500",
    iconBg: "bg-amber-100/70 text-amber-700 border-amber-200/30",
    accent: "bg-amber-100/40 text-amber-850 border-amber-200/30",
    gradient: "from-amber-50/70 via-white to-amber-50/10 border-amber-200/40 hover:border-amber-500/50 hover:shadow-[0_8px_30px_rgba(217,119,6,0.06)]",
  },
  {
    indicator: "bg-blue-500",
    iconBg: "bg-blue-100/70 text-blue-700 border-blue-200/30",
    accent: "bg-blue-100/40 text-blue-850 border-blue-200/30",
    gradient: "from-blue-50/70 via-white to-blue-50/10 border-blue-200/40 hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(59,130,246,0.06)]",
  },
  {
    indicator: "bg-emerald-500",
    iconBg: "bg-emerald-100/70 text-emerald-700 border-emerald-200/30",
    accent: "bg-emerald-100/40 text-emerald-850 border-emerald-200/30",
    gradient: "from-emerald-50/70 via-white to-emerald-50/10 border-amber-200/40 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.06)]",
  },
  {
    indicator: "bg-purple-500",
    iconBg: "bg-purple-100/70 text-purple-700 border-purple-200/30",
    accent: "bg-purple-100/40 text-purple-850 border-purple-200/30",
    gradient: "from-purple-50/70 via-white to-purple-50/10 border-amber-200/40 hover:border-purple-500/50 hover:shadow-[0_8px_30px_rgba(168,85,247,0.06)]",
  },
  {
    indicator: "bg-rose-500",
    iconBg: "bg-rose-100/70 text-rose-700 border-rose-200/30",
    accent: "bg-rose-100/40 text-rose-850 border-rose-200/30",
    gradient: "from-rose-50/70 via-white to-rose-50/10 border-amber-200/40 hover:border-rose-500/50 hover:shadow-[0_8px_30px_rgba(244,63,94,0.06)]",
  },
  {
    indicator: "bg-teal-500",
    iconBg: "bg-teal-100/70 text-teal-700 border-teal-200/30",
    accent: "bg-teal-100/40 text-teal-850 border-teal-200/30",
    gradient: "from-teal-50/70 via-white to-teal-50/10 border-amber-200/40 hover:border-teal-500/50 hover:shadow-[0_8px_30px_rgba(20,184,166,0.06)]",
  },
];

const getColorClass = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function Home() {
  const router = useRouter();
  const [newNotebookName, setNewNotebookName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const { user, logout } = useAuth();

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
  
  const { useList, createNotebook, deleteNotebook, isCreating } = useNotebooks();
  const { data: notebooks = [], isLoading } = useList();

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim() || isCreating) return;

    try {
      const created = await createNotebook(newNotebookName.trim());
      router.push(`/note/${created._id}`);
    } catch (err) {
      console.error("Failed to create notebook:", err);
    }
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to delete this notebook? All indexed source documents and vector embeddings will be permanently deleted."
      )
    ) {
      return;
    }

    try {
      await deleteNotebook(id);
    } catch (err) {
      console.error("Failed to delete notebook:", err);
    }
  };

  // Filter notebooks based on search query
  const filteredNotebooks = notebooks.filter((nb) =>
    nb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If loading, show a premium skeleton layout
  if (isLoading) {
    return (
      <div className="h-screen max-h-screen bg-background flex flex-col font-sans overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-16 border-b border-border bg-white dark:bg-[#141413] flex items-center px-8 justify-between flex-shrink-0 transition-colors duration-255">
          <div className="flex items-center space-x-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-2 w-32 rounded" />
            </div>
          </div>
          <Skeleton className="h-8 w-44 rounded-full" />
        </header>

        {/* Body Skeleton representing Dashboard */}
        <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto px-6 py-10 space-y-10">
          {/* Title Row Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/60 pb-6 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64 rounded-md" />
              <Skeleton className="h-4 w-96 rounded-md" />
            </div>
            <div className="flex items-center gap-3.5 flex-wrap">
              <Skeleton className="h-9.5 w-56 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
            </div>
          </div>

          {/* Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Create Notebook Card Skeleton */}
            <div className="border border-dashed border-border bg-card rounded-[40px] p-6 flex flex-col justify-between min-h-[200px]">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-full rounded-[20px]" />
              </div>
              <Skeleton className="h-9.5 w-full rounded-[20px]" />
            </div>

            {/* Notebook Card Skeletons */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-card border border-border p-6 rounded-[40px] flex flex-col justify-between min-h-[200px] relative overflow-hidden"
              >
                <div className="space-y-4 pl-1">
                  <div className="flex gap-4 items-start">
                    <Skeleton className="h-14 w-14 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1 mt-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-border/60 pl-1">
                  <Skeleton className="h-3.5 w-24" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-7 w-7 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="h-full w-full overflow-y-auto bg-background text-foreground flex flex-col font-sans pb-12 min-h-screen relative transition-colors duration-250">
        {/* Sleek Header */}
        <header className="h-16 border-b border-border bg-white/80 dark:bg-[#141413]/80 backdrop-blur-md flex items-center px-8 justify-between flex-shrink-0 sticky top-0 z-50 transition-colors duration-250">
          <div className="flex items-center space-x-2.5">
            <div className="bg-foreground text-background p-1.5 rounded-lg shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-foreground tracking-tight">
                NoteBook<span className="text-accent font-bold">LM</span>
              </h1>
              <p className="text-[9px] text-muted-foreground font-bold tracking-widest uppercase">
                AI Cognitive Workspace
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-border bg-white dark:bg-[#20201F] text-foreground hover:bg-stone-50 dark:hover:bg-stone-850/50 flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Toggle theme"
            >
              {themeMode === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2  border-border pr-3.5">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border border-border" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-accent/15 text-accent flex items-center justify-center text-[10px] font-black">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <p className="text-[10px] font-black leading-tight text-foreground">{user.name}</p>
                  <p className="text-[9px] text-muted-foreground font-bold leading-none">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="ml-2.5 px-3 py-1.5 rounded-full border border-border text-[9.5px] font-bold bg-white dark:bg-stone-900 text-muted-foreground hover:text-foreground hover:bg-stone-50 dark:hover:bg-stone-850/50 cursor-pointer shadow-xs transition-colors"
                >
                  Logout
                </button>
              </div>
            )}

           

         
          </div>
        </header>

      {notebooks.length === 0 ? (
        /* Welcome card if no workspaces exist yet */
        <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden py-20">
          <div className="max-w-xl w-full bg-card border border-border p-8 md:p-10 rounded-[40px] shadow-level2 hover:shadow-[0_24px_64px_rgba(0,0,0,0.08)] transition-all duration-300 relative z-10 space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1 bg-accent/10 text-accent font-bold tracking-widest text-[9px] uppercase px-3 py-1 rounded-full border border-accent/20 mx-auto mb-2">
                <Sparkles className="w-3 h-3 animate-pulse" /> NoteBookLM Studio
              </div>
              <div className="bg-white/80 dark:bg-stone-900 border border-border p-4 rounded-full w-fit mx-auto shadow-xs">
                <BookOpen className="w-10 h-10 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight">
                Welcome to NoteBookLM
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed font-semibold">
                Your personalized AI collaborator. Ingest videos, PDFs, webpages, and audio documents to construct study roadmaps, synthetic dialogs, and explore content interactively.
              </p>
            </div>

            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block ml-1">
                  Workspace Name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Machine Learning Study Guide..."
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  required
                  disabled={isCreating}
                  className="w-full text-xs h-11 border-border rounded-[20px] focus-visible:ring-foreground bg-white dark:bg-stone-900 shadow-sm font-semibold text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={!newNotebookName.trim() || isCreating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 text-xs font-bold rounded-[20px] shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating workspace...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Workspace
                  </>
                )}
              </Button>
            </form>

            <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-6 text-center text-muted-foreground">
              <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-foreground/5 transition-colors">
                <MessageSquare className="w-4.5 h-4.5 text-accent mx-auto" />
                <h4 className="text-[9px] font-bold uppercase tracking-wider">Chat Q&A</h4>
              </div>
              <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-foreground/5 transition-colors">
                <Compass className="w-4.5 h-4.5 text-accent mx-auto" />
                <h4 className="text-[9px] font-bold uppercase tracking-wider">Syllabus Guide</h4>
              </div>
              <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-foreground/5 transition-colors">
                <Headphones className="w-4.5 h-4.5 text-accent mx-auto" />
                <h4 className="text-[9px] font-bold uppercase tracking-wider">Podcast Audio</h4>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Premium Workspace Cards Dashboard */
        <div className="max-w-6xl w-full mx-auto px-6 py-10 space-y-10 font-sans">
          
          {/* Header & Filter Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/60 pb-6 gap-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                My Research Notebooks
              </h2>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Create a workspace or select a research notebook below to begin querying your ingested sources.
              </p>
            </div>
            
            <div className="flex items-center gap-3.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search notebooks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 text-xs h-9.5 pl-9 pr-3 border-border rounded-full bg-white dark:bg-stone-900 shadow-level1 font-semibold focus-visible:ring-foreground placeholder:text-muted-foreground/60 text-foreground"
                />
              </div>
              
              <Badge variant="secondary" className="bg-white/60 dark:bg-stone-900 border border-border text-foreground font-bold px-3.5 py-1.5 text-[10.5px] rounded-full shadow-level1">
                {notebooks.length} Active Workspaces
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Premium Create Card */}
            <div className="border border-dashed border-border bg-card/45 hover:bg-card hover:border-foreground/30 hover:shadow-level2 rounded-[40px] p-6 flex flex-col justify-between min-h-[200px] shadow-sm transition-all duration-300 group">
              <form onSubmit={handleCreateNotebook} className="h-full flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full" />
                    New Workspace
                  </span>
                  <Input
                    placeholder="Workspace name..."
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    required
                    disabled={isCreating}
                    className="w-full text-xs h-9.5 border-border rounded-[20px] focus-visible:ring-foreground bg-white dark:bg-stone-900 shadow-xs font-semibold text-foreground placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!newNotebookName.trim() || isCreating}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-9.5 text-xs font-bold rounded-[20px] shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-center"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create Notebook
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Notebook Cards */}
            {filteredNotebooks.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground text-xs font-medium border border-dashed border-border rounded-[40px] bg-card flex flex-col items-center justify-center gap-2 shadow-sm">
                <FolderClosed className="w-8 h-8 text-muted-foreground/60" />
                <span>No notebooks match your search.</span>
              </div>
            ) : (
              filteredNotebooks.map((nb) => {
                const theme = getColorClass(nb._id);
                const totalSources = nb.sourcesCount || 0;
                const formattedDate = nb.createdAt
                  ? new Date(nb.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Just now";

                return (
                  <div
                    key={nb._id}
                    onClick={() => router.push(`/note/${nb._id}`)}
                    className="bg-card border border-border p-6 rounded-[40px] cursor-pointer flex flex-col justify-between min-h-[200px] shadow-level2 hover:shadow-[0_24px_64px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 transition-all duration-300 relative group/card overflow-hidden"
                  >
                    <div className="space-y-4 pl-1">
                      {/* Top Row: Icon and Title with circular crop and satellite CTA */}
                      <div className="flex gap-4 items-start min-w-0">
                        {/* Circular portrait crop for icon */}
                        <div className="w-14 h-14 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center relative shrink-0 shadow-sm">
                          <BookOpen className="w-6 h-6 text-foreground" />
                          
                          {/* Satellite Arrow CTA attached to the perimeter */}
                          <div className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center absolute -bottom-1 -right-1 shadow-xs border border-white dark:border-[#20201F] transform transition-transform group-hover/card:scale-110">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        
                        <div className="min-w-0 flex-1 pt-1.5">
                          {/* Eyebrow Label with tiny accent dot */}
                          <div className="text-[10px] font-bold tracking-widest text-accent uppercase flex items-center gap-1 mb-1">
                            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                            {totalSources} {totalSources === 1 ? "document" : "documents"}
                          </div>
                          <h3 className="font-medium text-foreground text-base tracking-tight leading-snug line-clamp-2 pr-4 transition-colors group-hover/card:text-accent" title={nb.name}>
                            {nb.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-border/60 pl-1">
                      <span className="text-[10px] text-muted-foreground font-medium tracking-wide flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {formattedDate}
                      </span>

                      {/* Delete button as custom rounded pill */}
                      <button
                        onClick={(e) => handleDeleteNotebook(nb._id, e)}
                        title="Delete Workspace"
                        className="opacity-0 group-hover/card:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-full border border-border bg-white dark:bg-stone-900 shadow-xs transition-all cursor-pointer shrink-0 text-[10px] font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </main>
  );
}
