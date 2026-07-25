"use client";

import React from "react";
import { BookOpen, Compass, Headphones, Network, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { SourceSidebar } from "@/features/sources/SourceSidebar";
import { AddSourcePanel } from "@/features/sources/AddSourcePanel";
import { ChatWindow } from "@/features/chat/ChatWindow";
import { RoadmapView } from "@/features/roadmap/RoadmapView";
import { MindMapView } from "@/features/mindmap/MindMapView";
import { PodcastPlayer } from "@/features/podcast/PodcastPlayer";
import { CitationCard } from "@/features/chat/CitationCard";
import { Skeleton } from "@/components/ui/skeleton";

import { WorkspaceHeader } from "./WorkspaceHeader";
import { StudyStudio } from "./StudyStudio";
import { NotebookWorkspaceProvider, useNotebookWorkspace } from "./NotebookWorkspaceContext";

interface NotebookWorkspaceProps {
  notebookId: string;
}

function NotebookWorkspaceContent() {
  const {
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
    isGeneratingRoadmap,
    isGeneratingMindMap,
    isGeneratingPodcast,
    handleGenerateRoadmap,
    handleGenerateMindMap,
    handleGeneratePodcast,
    handleRoadmapNodeClick,
    handleMindMapNodeClick,
    handleAskAboutConcept,
    handleAddSource,
    handleDeleteSource,
    handleReindexSource,
  } = useNotebookWorkspace();

  return (
    <main className="h-screen max-h-screen bg-background text-foreground flex flex-col font-sans overflow-hidden">
      <WorkspaceHeader />

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
                    isGenerating={isGeneratingRoadmap}
                    onGenerateRoadmap={handleGenerateRoadmap}
                    onRoadmapNodeClick={handleRoadmapNodeClick}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}

                {activeSubTab === "mindmap" && (
                  <MindMapView
                    mindMap={mindMap}
                    isGenerating={isGeneratingMindMap}
                    onGenerateMindMap={handleGenerateMindMap}
                    onNodeClick={handleMindMapNodeClick}
                    onAskAboutConcept={handleAskAboutConcept}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}

                {activeSubTab === "podcast" && (
                  <PodcastPlayer
                    podcast={podcast}
                    isGenerating={isGeneratingPodcast}
                    onGeneratePodcast={handleGeneratePodcast}
                    hasCompletedSources={hasCompletedSources}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <StudyStudio />
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

export function NotebookWorkspace({ notebookId }: NotebookWorkspaceProps) {
  return (
    <NotebookWorkspaceProvider notebookId={notebookId}>
      <NotebookWorkspaceContent />
    </NotebookWorkspaceProvider>
  );
}
export default NotebookWorkspace;
