"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertTriangle, X, Info, Loader2, Bell, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { notebookApi } from "../lib/notebook-api";

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "progress";
  title: string;
  message: string;
  progress?: number;
  duration?: number | null; // ms, null/undefined = persistent
  timestamp: string;
  isRead?: boolean;
}

interface NotificationContextProps {
  notifications: Notification[];
  history: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "isRead">) => string;
  updateNotification: (id: string, updates: Partial<Omit<Notification, "id" | "timestamp" | "isRead">>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  markAllAsRead: () => void;
  fetchNotifications: (notebookId: string) => Promise<void>;
  markNotificationAsRead: (notebookId: string, notificationId: string) => Promise<void>;
  deleteNotification: (notebookId: string, notificationId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [history, setHistory] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback((n: Omit<Notification, "id" | "timestamp">) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newNotification: Notification = {
      ...n,
      id,
      timestamp,
      duration: n.duration !== undefined ? n.duration : n.type === "progress" ? null : 5000,
    };

    setNotifications((prev) => [...prev, newNotification]);
    setHistory((prev) => [newNotification, ...prev.slice(0, 49)]); // keep last 50
    setUnreadCount((prev) => prev + 1);

    if (newNotification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [removeNotification]);

  const updateNotification = useCallback((id: string, updates: Partial<Omit<Notification, "id" | "timestamp">>) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
    setHistory((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const fetchNotifications = useCallback(async (notebookId: string) => {
    try {
      const data = await notebookApi.listNotifications(notebookId);
      const formatted: Notification[] = data.map((n: any) => ({
        id: n._id || n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        progress: undefined,
        duration: null,
        isRead: n.isRead,
        timestamp: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setHistory(formatted);
      const unreads = formatted.filter((item) => !item.isRead).length;
      setUnreadCount(unreads);
    } catch (err) {
      console.error("Failed to load notifications from DB:", err);
    }
  }, []);

  const markNotificationAsRead = useCallback(async (notebookId: string, notificationId: string) => {
    try {
      await notebookApi.markNotificationAsRead(notebookId, notificationId);
      setHistory((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const deleteNotification = useCallback(async (notebookId: string, notificationId: string) => {
    try {
      await notebookApi.deleteNotification(notebookId, notificationId);
      setHistory((prev) => prev.filter((n) => n.id !== notificationId));
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        history,
        unreadCount,
        addNotification,
        updateNotification,
        removeNotification,
        clearAll,
        markAllAsRead,
        fetchNotifications,
        markNotificationAsRead,
        deleteNotification,
      }}
    >
      {children}
      
      {/* Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {notifications.map((n) => {
          const isProgress = n.type === "progress";
          
          return (
            <div
              key={n.id}
              className={cn(
                "p-4 rounded-[20px] border shadow-level2 pointer-events-auto bg-card flex flex-col gap-2 transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-5-percent",
                n.type === "success" && "border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-500/10",
                n.type === "error" && "border-red-500/25 bg-red-500/5 dark:bg-red-500/10",
                n.type === "warning" && "border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10",
                n.type === "info" && "border-blue-500/25 bg-blue-500/5 dark:bg-blue-500/10",
                isProgress && "border-accent/35 bg-accent/5 dark:bg-accent/10 border-dashed"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {n.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {n.type === "error" && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                  {n.type === "warning" && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                  {n.type === "info" && <Info className="w-5 h-5 text-blue-500 shrink-0" />}
                  {isProgress && <Loader2 className="w-5 h-5 text-accent animate-spin shrink-0" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate tracking-wide">
                    {n.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed mt-0.5">
                    {n.message}
                  </p>
                </div>

                <button
                  onClick={() => removeNotification(n.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-lg cursor-pointer"
                  title="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isProgress && n.progress !== undefined && (
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden border border-border/50 mt-1">
                  <div
                    className="bg-accent h-full transition-all duration-500 rounded-full"
                    style={{ width: `${n.progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
