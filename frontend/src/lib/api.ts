import axios from "axios";
import type { QueryResponse, DocumentItem, HealthStatus, AnalyticsData } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 60000,
});

export const documindApi = {
  health: (): Promise<HealthStatus> =>
    api.get("/health").then((r) => r.data),

  uploadDocument: (file: File): Promise<{
    document_id: string; filename: string; chunks_created: number;
    file_size_kb: number; summary: string; processing_time_ms: number; status: string;
  }> => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/v1/documents/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },

  listDocuments: (): Promise<{ total: number; documents: DocumentItem[] }> =>
    api.get("/api/v1/documents/").then((r) => r.data),

  deleteDocument: (id: string): Promise<void> =>
    api.delete(`/api/v1/documents/${id}`).then(() => undefined),

  query: (question: string, history?: Array<{ role: string; content: string }>): Promise<QueryResponse> =>
    api.post("/api/v1/query/", {
      question,
      conversation_history: history || [],
    }).then((r) => r.data),

  queryHistory: (limit = 20): Promise<QueryResponse[]> =>
    api.get(`/api/v1/query/history?limit=${limit}`).then((r) => r.data),

  analytics: (): Promise<AnalyticsData> =>
    api.get("/api/v1/analytics/").then((r) => r.data),
};
