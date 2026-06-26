export interface TokenImportance {
  token: string;
  importance: number;
  normalized_importance: number;
}

export interface NamedEntity {
  text: string;
  label: string;
  start: number;
  end: number;
}

export interface SourceChunk {
  chunk_id: string;
  document_id: string;
  filename: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  similarity_score: number;
  relevance_label: "High" | "Medium" | "Low";
  attribution_weight: number;
  extracted_span: string | null;
  entities: NamedEntity[];
}

export interface XAIReport {
  token_importance: TokenImportance[];
  grounding_score: number;
  grounding_label: string;
  total_chunks_searched: number;
  chunks_used: number;
  avg_similarity: number;
  top_source: string;
  reasoning_steps: string[];
}

export interface QueryResponse {
  id: string;
  question: string;
  answer: string;
  source_chunks: SourceChunk[];
  xai: XAIReport;
  confidence_score: number;
  processing_time_ms: number;
  embedding_model: string;
  qa_model: string;
  timestamp: string;
  suggested_questions: string[];
}

export interface DocumentItem {
  id: string;
  filename: string;
  chunk_count: number;
  file_size_kb: number | null;
  summary: string | null;
  created_at: string;
}

export interface HealthStatus {
  status: string;
  version: string;
  embedding_model: string;
  qa_model: string;
  supabase_connected: boolean;
  total_documents: number;
}

export interface AnalyticsData {
  total_queries: number;
  total_documents: number;
  total_chunks: number;
  avg_confidence: number;
  avg_grounding: number;
  avg_latency_ms: number;
  recent_queries: Array<{
    id: string;
    question: string;
    confidence_score: number;
    grounding_score: number;
    created_at: string;
  }>;
}
