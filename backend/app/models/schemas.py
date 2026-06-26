from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Tokens & XAI ──────────────────────────────────────────────────────────────

class TokenImportance(BaseModel):
    token: str
    importance: float = Field(ge=0.0, description="raw drop in similarity when token removed")
    normalized_importance: float = Field(ge=0.0, le=1.0)


class NamedEntity(BaseModel):
    text: str
    label: str   # PERSON, ORG, LOC, DATE, etc.
    start: int
    end: int


class SourceChunk(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    content: str
    chunk_index: int
    page_number: Optional[int] = None        # PDF page number (1-indexed)
    similarity_score: float = Field(ge=0.0, le=1.0)
    relevance_label: str   # "High" | "Medium" | "Low"
    attribution_weight: float = Field(ge=0.0, le=1.0, description="Fraction this chunk contributed to answer")
    extracted_span: Optional[str] = None     # exact span extracted by QA model
    entities: List[NamedEntity] = []


class XAIReport(BaseModel):
    token_importance: List[TokenImportance]
    grounding_score: float = Field(ge=0.0, le=1.0, description="How well answer is grounded in sources (anti-hallucination)")
    grounding_label: str    # "Highly Grounded" | "Grounded" | "Partially Grounded" | "Ungrounded"
    total_chunks_searched: int
    chunks_used: int
    avg_similarity: float
    top_source: str
    reasoning_steps: List[str]


# ── Query ─────────────────────────────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    conversation_history: Optional[List[Dict[str, str]]] = []
    top_k: Optional[int] = Field(default=5, ge=1, le=10)


class QueryResponse(BaseModel):
    id: str
    question: str
    answer: str
    source_chunks: List[SourceChunk]
    xai: XAIReport
    confidence_score: float = Field(ge=0.0, le=1.0)
    processing_time_ms: float
    embedding_model: str
    qa_model: str
    timestamp: datetime
    suggested_questions: List[str] = []


# ── Documents ─────────────────────────────────────────────────────────────────

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_created: int
    file_size_kb: float
    summary: str
    processing_time_ms: float
    status: str


class DocumentItem(BaseModel):
    id: str
    filename: str
    chunk_count: int
    file_size_kb: Optional[float]
    summary: Optional[str]
    created_at: str


class DocumentListResponse(BaseModel):
    total: int
    documents: List[DocumentItem]


# ── Analytics ─────────────────────────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    total_queries: int
    total_documents: int
    total_chunks: int
    avg_confidence: float
    avg_grounding: float
    avg_latency_ms: float
    recent_queries: List[Dict[str, Any]]


# ── Health ────────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    embedding_model: str
    qa_model: str
    supabase_connected: bool
    total_documents: int
