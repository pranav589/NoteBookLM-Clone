import { apiFetch } from "./api-client";
import type { Notebook, NotebookDetails, Podcast, QueryJobStatus, QueryJobResult, Roadmap, Message } from "./notebook-types";

export const notebookApi = {
  list: () => apiFetch<Notebook[]>("/notebooks"),
  get: (notebookId: string) => apiFetch<NotebookDetails>(`/notebooks/${notebookId}`),
  create: (name: string) => apiFetch<Notebook>("/notebooks", { method: "POST", data: { name } }),
  remove: (notebookId: string) => apiFetch<void>(`/notebooks/${notebookId}`, { method: "DELETE" }),
  addSource: (notebookId: string, data: FormData) => apiFetch<void>(`/notebooks/${notebookId}/sources`, { method: "POST", data, headers: { "Content-Type": "multipart/form-data" } }),
  removeSource: (notebookId: string, sourceId: string) => apiFetch<void>(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "DELETE" }),
  reindexSource: (notebookId: string, sourceId: string) => apiFetch<void>(`/notebooks/${notebookId}/sources/${sourceId}`, { method: "POST" }),
  submitQuery: (notebookId: string, query: string) => apiFetch<{ message: string; result: QueryJobResult }>("/query", { method: "POST", data: { query, notebookId } }),
  getJob: (jobId: string) => apiFetch<QueryJobStatus>(`/jobs/${jobId}`),
  generateRoadmap: (notebookId: string) => apiFetch<Roadmap>("/roadmap", { method: "POST", data: { notebookId } }),
  generatePodcast: (notebookId: string) => apiFetch<Podcast>("/podcast", { method: "POST", data: { notebookId } }),
  generateMindMap: (notebookId: string) => apiFetch<{ message: string }>("/mindmap", { method: "POST", data: { notebookId } }),
  getMessages: (notebookId: string) => apiFetch<Message[]>(`/notebooks/${notebookId}/messages`),
  listNotifications: (notebookId: string) => apiFetch<any[]>(`/notebooks/${notebookId}/notifications`),
  markNotificationAsRead: (notebookId: string, notificationId: string) => apiFetch<{ success: boolean }>(`/notebooks/${notebookId}/notifications/${notificationId}`, { method: "PATCH" }),
  deleteNotification: (notebookId: string, notificationId: string) => apiFetch<{ success: boolean }>(`/notebooks/${notebookId}/notifications/${notificationId}`, { method: "DELETE" }),
  
  // Study endpoints
  generateQuiz: (notebookId: string) => apiFetch<any>("/quizzes/generate", { method: "POST", data: { notebookId } }),
  getQuizzes: (notebookId: string) => apiFetch<any[]>(`/quizzes?notebookId=${notebookId}`),
  getQuiz: (quizId: string) => apiFetch<any>(`/quizzes/${quizId}`),
  submitQuizAttempt: (quizId: string, answers: any[]) => apiFetch<any>(`/quizzes/${quizId}/attempts`, { method: "POST", data: { answers } }),
  getQuizAttempts: (notebookId: string) => apiFetch<any[]>(`/quizzes/all/attempts?notebookId=${notebookId}`),
  generateFlashcards: (notebookId: string) => apiFetch<any>("/flashcards/generate", { method: "POST", data: { notebookId } }),
  getFlashcards: (notebookId: string) => apiFetch<any[]>(`/flashcards?notebookId=${notebookId}`),
  getDueFlashcards: (notebookId: string) => apiFetch<any[]>(`/flashcards/due?notebookId=${notebookId}`),
  submitFlashcardReview: (cardId: string, rating: number) => apiFetch<any>(`/flashcards/${cardId}/review`, { method: "POST", data: { rating } }),
};
