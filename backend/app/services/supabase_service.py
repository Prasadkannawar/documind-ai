"""
Supabase service — handles both regular tables and pgvector similarity search.
"""
import logging
import json
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


# ── Documents ─────────────────────────────────────────────────────────────────

def create_document(filename: str, file_size_kb: float, summary: str) -> str:
    sb = get_client()
    result = sb.table("documents").insert({
        "filename": filename,
        "file_size_kb": file_size_kb,
        "summary": summary,
        "chunk_count": 0,
    }).execute()
    return result.data[0]["id"]


def update_chunk_count(document_id: str, count: int) -> None:
    get_client().table("documents").update({"chunk_count": count}).eq("id", document_id).execute()


def list_documents() -> List[Dict]:
    result = get_client().table("documents").select("*").order("created_at", desc=True).execute()
    return result.data or []


def delete_document(document_id: str) -> None:
    # CASCADE deletes chunks automatically
    get_client().table("documents").delete().eq("id", document_id).execute()


# ── Chunks ────────────────────────────────────────────────────────────────────

def insert_chunks(chunks: List[Dict]) -> None:
    """
    Batch-insert chunks with embeddings into Supabase.
    chunks: list of {document_id, filename, content, chunk_index, embedding: List[float]}
    """
    sb = get_client()
    # Supabase expects vector as list — supabase-py handles serialization
    rows = [
        {
            "document_id": c["document_id"],
            "filename": c["filename"],
            "content": c["content"],
            "chunk_index": c["chunk_index"],
            "page_number": c.get("page_number", 1),
            "embedding": c["embedding"],
        }
        for c in chunks
    ]
    # Insert in batches of 100 to avoid request size limits
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        sb.table("chunks").insert(rows[i : i + batch_size]).execute()


def hybrid_search(
    query_embedding: List[float],
    query_text: str,
    top_k: int = 5,
    threshold: float = 0.25,
    keyword_weight: float = 0.3,
) -> List[Dict]:
    """
    Call the match_chunks Supabase RPC function (hybrid vector + BM25 search).
    """
    sb = get_client()
    result = sb.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "query_text": query_text,
            "match_count": top_k,
            "match_threshold": threshold,
            "keyword_weight": keyword_weight,
        },
    ).execute()
    return result.data or []


# ── Query History ─────────────────────────────────────────────────────────────

def save_query(
    question: str,
    answer: str,
    confidence_score: float,
    grounding_score: float,
    processing_time_ms: float,
    chunks_used: int,
    top_document: str,
    xai_data: Dict,
) -> str:
    result = get_client().table("query_history").insert({
        "question": question,
        "answer": answer,
        "confidence_score": confidence_score,
        "grounding_score": grounding_score,
        "processing_time_ms": processing_time_ms,
        "chunks_used": chunks_used,
        "top_document": top_document,
        "xai_data": xai_data,
    }).execute()
    return result.data[0]["id"]


def get_analytics() -> Dict:
    result = get_client().rpc("get_analytics", {}).execute()
    return result.data or {}


def get_query_history(limit: int = 20) -> List[Dict]:
    result = (
        get_client()
        .table("query_history")
        .select("id, question, answer, confidence_score, grounding_score, processing_time_ms, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []
