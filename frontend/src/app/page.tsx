"use client";

import React, { useState, useEffect } from "react";
import { Layers, Plus, Database, BookOpen, Loader2, Sparkles, Compass, Headphones, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotebooks } from "@/features/notebooks/hooks/useNotebooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const router = useRouter();
  const [newNotebookName, setNewNotebookName] = useState("");
  const { useList, createNotebook, isCreating } = useNotebooks();
  const { data: notebooks = [], isLoading } = useList();

  // Redirect to the first notebook if any exist
  useEffect(() => {
    if (!isLoading && notebooks.length > 0) {
      router.replace(`/note/${notebooks[0]._id}`);
    }
  }, [isLoading, notebooks, router]);

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

  // If loading or redirecting, show a skeleton layout of the workspace
  if (isLoading || notebooks.length > 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans overflow-hidden">
        {/* Header Skeleton */}
        <header className="h-16 border-b border-border bg-white flex items-center px-6 justify-between">
          <div className="flex items-center space-x-3 w-1/3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-32 rounded-full" />
        </header>

        {/* Body Skeleton */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Skeleton */}
          <aside className="w-64 border-r border-border bg-stone-50/50 p-4 space-y-4">
            <Skeleton className="h-8 w-full rounded-lg" />
            <div className="space-y-2.5">
              <Skeleton className="h-7 w-5/6 rounded-md" />
              <Skeleton className="h-7 w-4/5 rounded-md" />
              <Skeleton className="h-7 w-5/6 rounded-md" />
            </div>
          </aside>

          {/* Workspace Skeleton */}
          <div className="flex-1 flex flex-col p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div className="space-y-2 w-1/3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <div className="flex-1 flex flex-col justify-end space-y-4">
              <Skeleton className="h-10 w-2/3 rounded-xl" />
              <Skeleton className="h-16 w-3/4 rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render a gorgeous welcome card if no workspaces exist yet
  return (
    <main className="min-h-screen bg-[#FCFAF6] text-stone-900 flex flex-col font-sans overflow-hidden">
      {/* Sleek Header */}
      <header className="h-16 border-b border-border/80 bg-white/60 backdrop-blur-md flex items-center px-8 justify-between flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="bg-amber-500 text-white p-1.5 rounded-lg shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 tracking-tight">
              NoteBook<span className="text-primary font-bold">LM</span>
            </h1>
            <p className="text-[9px] text-stone-400 font-bold tracking-widest uppercase">
              AI Cognitive Workspace
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-stone-50 border-border text-stone-600 flex items-center gap-1.5 py-1 px-3 text-[10px] font-semibold rounded-lg shadow-sm">
          <Database className="w-3.5 h-3.5 text-primary" />
          <span>MongoDB Connected</span>
        </Badge>
      </header>

      {/* Main Landing Area */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden bg-radial-gradient">
        {/* Modern Amber Decorative Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-250/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="max-w-xl w-full bg-white/80 backdrop-blur-lg border border-amber-200/50 p-8 md:p-10 rounded-3xl shadow-premium hover:shadow-hover transition-all duration-300 relative z-10 space-y-8">
          
          {/* Logo & Welcome description */}
          <div className="text-center space-y-3">
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl w-fit mx-auto shadow-sm">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-stone-850 tracking-tight">
              Welcome to NoteBookLM
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed font-semibold">
              Your personalized AI collaborator. Ingest videos, PDFs, webpages, and audio documents to construct study roadmaps, synthetic dialogs, and explore content interactively.
            </p>
          </div>

          {/* Form to create the first notebook */}
          <form onSubmit={handleCreateNotebook} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block ml-1">
                Workspace Name
              </label>
              <Input
                type="text"
                placeholder="e.g. Machine Learning Study Guide, Web Dev Notes..."
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                required
                disabled={isCreating}
                className="w-full text-xs h-10.5 border-border rounded-xl focus-visible:ring-primary bg-white shadow-sm font-semibold text-stone-800"
              />
            </div>

            <Button
              type="submit"
              disabled={!newNotebookName.trim() || isCreating}
              className="w-full bg-primary hover:bg-primary/95 text-white h-11 text-xs font-bold rounded-xl shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center"
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

          {/* Quick Feature Grid */}
          <div className="grid grid-cols-3 gap-3 border-t border-stone-100 pt-6 text-center text-stone-400">
            <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-stone-50/50 transition-colors">
              <MessageSquare className="w-4.5 h-4.5 text-amber-500/80 mx-auto" />
              <h4 className="text-[9px] font-bold uppercase text-stone-500 tracking-wider">Chat Q&A</h4>
            </div>
            <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-stone-50/50 transition-colors">
              <Compass className="w-4.5 h-4.5 text-amber-500/80 mx-auto" />
              <h4 className="text-[9px] font-bold uppercase text-stone-500 tracking-wider">Syllabus Guide</h4>
            </div>
            <div className="space-y-1.5 p-2.5 rounded-xl hover:bg-stone-50/50 transition-colors">
              <Headphones className="w-4.5 h-4.5 text-amber-500/80 mx-auto" />
              <h4 className="text-[9px] font-bold uppercase text-stone-500 tracking-wider">Podcast Audio</h4>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
