import React, { useState } from "react";
import { Layers, Plus, Loader2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <aside className="w-64 border-r border-border/80 bg-sidebar flex flex-col transition-all duration-300">
      <div className="p-4 border-b border-border/80">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-primary" />
          Research Workspaces
        </h2>
        <form onSubmit={handleCreateNotebook} className="flex gap-2 mt-3.5">
          <Input
            placeholder="New Workspace Name..."
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            className="bg-card border-border text-xs text-stone-850 placeholder:text-stone-450 h-8.5 rounded-lg focus-visible:ring-primary shadow-sm"
          />
          <Button type="submit" size="icon" className="h-8.5 w-8.5 bg-primary hover:bg-primary/95 text-white shadow-sm shrink-0 rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer">
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1 p-2">
        {isLoadingNotebooks ? (
          <div className="space-y-2.5 px-3 py-4">
            <Skeleton className="h-8.5 w-full rounded-lg bg-stone-200/50" />
            <Skeleton className="h-8.5 w-full rounded-lg bg-stone-200/50" />
            <Skeleton className="h-8.5 w-full rounded-lg bg-stone-200/50" />
          </div>
        ) : notebooks.length === 0 ? (
          <p className="text-[11px] text-stone-400 text-center py-12 leading-relaxed px-4 font-medium">
            No workspaces created yet. Create one above to begin your research session.
          </p>
        ) : (
          <div className="space-y-1 px-1">
            {notebooks.map((nb) => {
              const isActive = activeNotebook?._id === nb._id;
              return (
                <div
                  key={nb._id}
                  onClick={() => setActiveNotebook(nb)}
                  className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 text-xs group border ${
                    isActive
                      ? "bg-white text-stone-900 font-bold border-amber-300/60 shadow-sm"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-transparent"
                  }`}
                >
                  <span className="truncate pr-2 tracking-wide">{nb.name}</span>
                  <button
                    onClick={(e) => handleDeleteNotebook(nb._id, e)}
                    className={`text-stone-450 hover:text-destructive p-0.5 transition-opacity duration-200 cursor-pointer ${
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
      </ScrollArea>
    </aside>
  );
}
export default NotebookSidebar;
