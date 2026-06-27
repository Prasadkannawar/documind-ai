"""
Supabase service — all queries are scoped to a session_id for data isolation.
"""
import logging
from typing import List, Dict, Any, Optional
from supabase import create_client
from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Any = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


# ── Documents ─────────────────────────────────────────────────────────────────

def create_document(filename: str, file_size_kb: float, summary: str, session_id: str) -> str:
    result = get_client().table("documents").insert({
        "filename": filename,
        "file_size_kb": file_size_kb,
        "summary": summary,
        "chunk_count": 0,
        "session_id": session_id,
    }).execute()
    return result.data[0]["id"]


def update_chunk_count(document_id: str, count: int) -> None:
    get_client().table("documents").update({"chunk_count": count}).eq("id", document_id).execute()


def list_documents(session_id: str) -> List[Dict]:
    result = (
        get_client()
        .table("documents")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def delete_document(document_id: str, session_id: str) -> None:
    # Scope delete to session so one user cannot delete another's documents
    get_client().table("documents").delete().eq("id", document_id).eq("session_id", session_id).execute()


# ── Chunks ────────────────────────────────────────────────────────────────────

def insert_chunks(chunks: List[Dict], session_id: str) -> None:
    """
    Batch-insert chunks with embeddings.
    Each chunk must have: document_id, filename, content, chunk_index, embedding.
    Optional: page_number, is_image_chunk.
    """
    sb = get_client()
    rows = [
        {
            "document_id": c["document_id"],
            "filename": c["filename"],
            "content": c["content"],
            "chunk_index": c["chunk_index"],
            "page_number": c.get("page_number", 1),
            "embedding": c["embedding"],
            "is_image_chunk": c.get("is_image_chunk", False),
            "session_id": session_id,
        }
        for c in chunks
    ]
    batch_size = 100
    for i in range(0, len(rows), batch_size):
        sb.table("chunks").insert(rows[i: i + batch_size]).execute()


def hybrid_search(
    query_embedding: List[float],
    query_text: str,
    session_id: str,
    top_k: int = 5,
    threshold: float = 0.25,
    keyword_weight: float = 0.3,
) -> List[Dict]:
    """Hybrid vector + BM25 search, scoped to session."""
    sb = get_client()
    result = sb.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "query_text": query_text,
            "match_count": top_k,
            "match_threshold": threshold,
            "keyword_weight": keyword_weight,
            "p_session_id": session_id,
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
    session_id: str,
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
        "session_id": session_id,
    }).execute()
    return result.data[0]["id"]


def get_analytics(session_id: str) -> Dict:
    result = get_client().rpc("get_analytics", {"p_session_id": session_id}).execute()
    return result.data or {}


def get_query_history(session_id: str, limit: int = 20) -> List[Dict]:
    result = (
        get_client()
        .table("query_history")
        .select("id, question, answer, confidence_score, grounding_score, processing_time_ms, created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []
