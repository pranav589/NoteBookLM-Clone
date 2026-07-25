import React, { useState } from "react";
import { Layers, Plus, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNotebooks } from "./hooks/useNotebooks";
import { Skeleton } from "@/components/ui/skeleton";
import type { Notebook } from "../../lib/notebook-types";

interface NotebookSidebarProps {
  activeNotebook: Notebook | null;
  setActiveNotebook: (notebook: Notebook | null) => void;
}

export function NotebookSidebar({
  activeNotebook,
  setActiveNotebook,
}: NotebookSidebarProps) {
  const [newNotebookName, setNewNotebookName] = useState("");
  const { useList, createNotebook, deleteNotebook } = useNotebooks();
  const { data: notebooks = [], isLoading: isLoadingNotebooks } = useList();

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;

    try {
      const created = await createNotebook(newNotebookName.trim());
      setActiveNotebook(created);
      setNewNotebookName("");
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
      if (activeNotebook?._id === id) {
        setActiveNotebook(null);
      }
    } catch (err) {
      console.error("Failed to delete notebook:", err);
    }
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-border">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-accent rounded-full" />
          Workspaces
        </h2>
        <form onSubmit={handleCreateNotebook} className="flex gap-2 mt-3.5">
          <Input
            placeholder="New workspace..."
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            className="bg-white dark:bg-stone-900 border-border text-xs text-foreground placeholder:text-muted-foreground/60 h-9 rounded-[20px] focus-visible:ring-foreground shadow-xs font-semibold"
          />
          <Button type="submit" size="icon" className="h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs shrink-0 rounded-full cursor-pointer transition-all duration-200">
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoadingNotebooks ? (
          <div className="space-y-2 px-2 py-4">
            <Skeleton className="h-9 w-full rounded-[20px]" />
            <Skeleton className="h-9 w-full rounded-[20px]" />
            <Skeleton className="h-9 w-full rounded-[20px]" />
          </div>
        ) : notebooks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-12 leading-relaxed px-4 font-semibold">
            No workspaces created yet. Create one above to begin.
          </p>
        ) : (
          <div className="space-y-1.5 px-1">
            {notebooks.map((nb) => {
              const isActive = activeNotebook?._id === nb._id;
              return (
                <div
                  key={nb._id}
                  onClick={() => setActiveNotebook(nb)}
                  className={`flex items-center justify-between p-3.5 rounded-[20px] cursor-pointer transition-all duration-250 text-xs group border ${
                    isActive
                      ? "bg-card text-foreground font-semibold border-border shadow-level1"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {isActive && (
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse shrink-0" />
                    )}
                    <span className="truncate pr-2 tracking-tight">{nb.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteNotebook(nb._id, e)}
                    className={`text-muted-foreground/60 hover:text-destructive p-0.5 transition-opacity duration-200 cursor-pointer ${
                      isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
export default NotebookSidebar;
