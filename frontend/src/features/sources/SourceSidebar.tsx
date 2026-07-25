import React from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Plus, Loader2, RefreshCw, Trash2, FileText, Globe, Video, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SourceDoc } from "../../lib/notebook-types";
import { Badge } from "@/components/ui/badge";

interface SourceSidebarProps {
  notebookName: string;
  sources: SourceDoc[];
  onDeleteSource: (sourceId: string) => void;
  onReindexSource: (sourceId: string) => void;
  onAddSourceClick: () => void;
  isUploading: boolean;
}

export function SourceSidebar({
  notebookName,
  sources,
  onDeleteSource,
  onReindexSource,
  onAddSourceClick,
  isUploading,
}: SourceSidebarProps) {
  const getSourceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
      case "url":
        return <Globe className="w-3.5 h-3.5 text-amber-600" />;
      case "youtube":
        return <Video className="w-3.5 h-3.5 text-red-600" />;
      case "transcript":
        return <Clock className="w-3.5 h-3.5 text-stone-600" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-amber-600" />;
    }
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col transition-all duration-300">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-accent transition-colors mb-3.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Workspaces
        </Link>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center relative shrink-0 shadow-xs">
            <BookOpen className="w-4 h-4 text-foreground" />
          </div>
          <h2 className="text-xs font-bold text-foreground truncate max-w-[170px]" title={notebookName}>
            {notebookName}
          </h2>
        </div>
        <Button
          size="sm"
          onClick={onAddSourceClick}
          disabled={isUploading}
          className="w-full bg-primary hover:bg-primary/90 hover:shadow-md text-primary-foreground text-xs h-9 cursor-pointer shadow-xs rounded-[20px] font-bold transition-all duration-200"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              Uploading...
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Source
            </>
          )}
        </Button>
      </div>

      {/* Sources list */}
      <div className="flex-1 overflow-y-auto p-3">
        <h3 className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground px-1 mb-2">
          Knowledge Sources ({sources.length})
        </h3>
        
        {sources.length === 0 ? (
          <div className="border border-dashed border-border rounded-[20px] p-5 text-center text-[10.5px] text-muted-foreground/60 bg-card/45 leading-relaxed font-semibold">
            No sources yet. Click "Add Source" to upload documents.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sources.map((s) => (
              <div
                key={s._id}
                className="p-3 bg-card border border-border text-foreground rounded-[20px] hover:shadow-level1 transition-all duration-200 group relative flex flex-col gap-2"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-stone-900 border border-border flex items-center justify-center shrink-0">
                    {getSourceIcon(s.type)}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h4
                      className="text-[11px] font-semibold truncate text-foreground tracking-tight pr-8"
                      title={s.name}
                    >
                      {s.name}
                    </h4>
                    <span className="text-[8px] uppercase font-bold text-accent block mt-0.5 tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 bg-accent rounded-full" />
                      {s.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
                  {s.status === "completed" && (
                    <Badge variant="secondary" className="text-[8px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 py-0 px-1.5 rounded-md flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      Ready
                    </Badge>
                  )}
                  {s.status === "indexing" && (
                    <Badge variant="secondary" className="text-[8px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 py-0 px-1.5 rounded-md flex items-center gap-1">
                      <Loader2 className="w-2 h-2 animate-spin text-amber-500" />
                      Indexing
                    </Badge>
                  )}
                  {s.status === "failed" && (
                    <Badge variant="secondary" title={s.error} className="text-[8px] font-bold text-red-700 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900 py-0 px-1.5 rounded-md flex items-center gap-1 cursor-help">
                      <span className="w-1 h-1 rounded-full bg-red-500" />
                      Failed
                    </Badge>
                  )}

                  {/* Actions (visible on group hover) */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute right-2.5 top-2.5">
                    <button
                      onClick={() => onReindexSource(s._id)}
                      title="Re-index Source"
                      className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer transition-colors bg-white dark:bg-stone-900 rounded-full border border-border shadow-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteSource(s._id)}
                      title="Delete Source"
                      className="text-muted-foreground hover:text-destructive p-0.5 cursor-pointer transition-colors bg-white dark:bg-stone-900 rounded-full border border-border shadow-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
