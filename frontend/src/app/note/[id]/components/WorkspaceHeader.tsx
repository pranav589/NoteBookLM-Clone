"use client";

import React from "react";
import { BookOpen, Bell, Check, Trash2, Sun, Moon, PanelLeftClose, PanelLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useNotebookWorkspace } from "./NotebookWorkspaceContext";

export function WorkspaceHeader() {
  const {
    activeNotebook,
    isSourcesCollapsed,
    setIsSourcesCollapsed,
    themeMode,
    toggleTheme,
    unreadCount,
    markAllAsRead,
    history,
    markNotificationAsRead,
    deleteNotification,
  } = useNotebookWorkspace();

  return (
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
                onClick={markAllAsRead}
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
  );
}
