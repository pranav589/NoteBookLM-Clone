import { apiFetch } from "./api-client";
import type { Notebook, NotebookDetails, Podcast, QueryJobStatus, Roadmap, Message } from "./notebook-types";

export const notebookApi = {
  list: () => apiFetch<Notebook[]>("/notebooks"),
  get: (notebookId: string) => apiFetch<NotebookDetails>(`/notebooks/${notebookId}`),
  create: (name: string) => apiFetch<Notebook>("/notebooks", { method: "POST", data: { name } }),
  remove: (notebookId: string) => apiFetch<void>(`/notebooks/${notebookId}`, { method: "DELETE" }),
  addSource: (notebookId: string, data: FormData) => apiFetch<void>(`/notebooks/${notebookId}/sources`, { method: "POST", data, headers: { "Content-Type": "multipart/form-data" } }),
  removeSource: (notebookId: string, sourceId: string) => apiFetch<void>(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "DELETE" }),
  reindexSource: (notebookId: string, sourceId: string) => apiFetch<void>(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "POST" }),
  submitQuery: (notebookId: string, query: string) => apiFetch<{ jobId: string }>("/query", { method: "POST", data: { query, notebookId } }),
  getJob: (jobId: string) => apiFetch<QueryJobStatus>(`/jobs/${jobId}`),
  generateRoadmap: (notebookId: string) => apiFetch<Roadmap>("/roadmap", { method: "POST", data: { notebookId } }),
  generatePodcast: (notebookId: string) => apiFetch<Podcast>("/podcast", { method: "POST", data: { notebookId } }),
  generateMindMap: (notebookId: string) => apiFetch<{ message: string }>("/mindmap", { method: "POST", data: { notebookId } }),
  getMessages: (notebookId: string) => apiFetch<Message[]>(`/notebooks/${notebookId}/messages`),
  listNotifications: (notebookId: string) => apiFetch<any[]>(`/notebooks/${notebookId}/notifications`),
  markNotificationAsRead: (notebookId: string, notificationId: string) => apiFetch<{ success: boolean }>(`/notebooks/${notebookId}/notifications/${notificationId}`, { method: "PATCH" }),
  deleteNotification: (notebookId: string, notificationId: string) => apiFetch<{ success: boolean }>(`/notebooks/${notebookId}/notifications/${notificationId}`, { method: "DELETE" }),
};
