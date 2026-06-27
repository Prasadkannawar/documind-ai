"""
Core RAG orchestration — DocuMind AI

Pipeline:
  1. Embed query (BGE)
  2. Hybrid search (pgvector + BM25 via Supabase RPC) — session-scoped
  3. Extractive QA across top chunks (tinyRoberta)
  4. XAI: token importance + chunk attribution + grounding score
  5. Persist to query_history
  6. Return enriched QueryResponse

Image pipeline (PDFs only):
  After text chunking, PyMuPDF extracts images → BLIP captions them →
  captions are embedded and stored as additional chunks (is_image_chunk=True).
"""
import uuid
import time
import logging
import tempfile
import os
from datetime import datetime, timezone
from pathlib import Path as _Path
from typing import List, Optional

from app.core.config import settings
from app.models.schemas import (
    QueryRequest, QueryResponse,
    DocumentUploadResponse, DocumentListResponse, DocumentItem,
    SourceChunk, XAIReport,
)
from app.services.document_processor import DocumentProcessor
from app.services import embedding_service as emb
from app.services import qa_service as qa
from app.services import xai_service as xai
from app.services import supabase_service as db

logger = logging.getLogger(__name__)

_processor = DocumentProcessor(
    chunk_size=settings.CHUNK_SIZE,
    chunk_overlap=settings.CHUNK_OVERLAP,
)


def _relevance_label(score: float) -> str:
    if score >= 0.65:
        return "High"
    if score >= 0.45:
        return "Medium"
    return "Low"


async def upload_document(
    file_bytes: bytes, filename: str, session_id: str
) -> DocumentUploadResponse:
    start = time.perf_counter()
    file_size_kb = len(file_bytes) / 1024
    is_pdf = _Path(filename).suffix.lower() == ".pdf"

    with tempfile.NamedTemporaryFile(
        suffix=_Path(filename).suffix, delete=False
    ) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # ── Text extraction ─────────────────────────────────────────────────
        if is_pdf:
            page_texts = _processor.extract_text_with_pages(tmp_path, filename)
            full_text = "\n\n".join(t for _, t in page_texts)
        else:
            full_text = _processor.extract_text(tmp_path, filename)

        if not full_text.strip():
            raise ValueError("No extractable text found in the document.")

        summary = _processor.extract_summary(full_text)
        document_id = db.create_document(filename, round(file_size_kb, 2), summary, session_id)

        # ── Text chunking ───────────────────────────────────────────────────
        if is_pdf:
            text_chunks = _processor.chunk_text_with_pages(page_texts, document_id, filename)
        else:
            text_chunks = _processor.chunk_text(full_text, document_id, filename)

        # ── Image analysis (PDFs only) ──────────────────────────────────────
        image_chunks: List[dict] = []
        if is_pdf:
            try:
                from app.services.image_analyzer import build_image_chunks
                logger.info(f"Extracting images from {filename}…")
                image_chunks = build_image_chunks(
                    pdf_path=tmp_path,
                    document_id=document_id,
                    filename=filename,
                    starting_chunk_index=len(text_chunks),
                )
            except Exception as e:
                logger.warning(f"Image analysis skipped: {e}")

        all_chunks = text_chunks + image_chunks

        # ── Embed and persist ───────────────────────────────────────────────
        texts = [c["content"] for c in all_chunks]
        embeddings = emb.embed_documents(texts)

        enriched = [
            {**chunk, "embedding": embeddings[i]}
            for i, chunk in enumerate(all_chunks)
        ]
        db.insert_chunks(enriched, session_id)
        db.update_chunk_count(document_id, len(enriched))

        elapsed = (time.perf_counter() - start) * 1000
        return DocumentUploadResponse(
            document_id=document_id,
            filename=filename,
            chunks_created=len(enriched),
            file_size_kb=round(file_size_kb, 2),
            summary=summary,
            processing_time_ms=round(elapsed, 1),
            status="success",
        )
    finally:
        os.unlink(tmp_path)


async def query(request: QueryRequest, session_id: str) -> QueryResponse:
    start = time.perf_counter()
    question = request.question

    # 1. Embed query
    query_emb = emb.embed_query(question)

    # 2. Hybrid search — session-scoped
    raw = db.hybrid_search(
        query_embedding=query_emb,
        query_text=question,
        session_id=session_id,
        top_k=request.top_k or settings.TOP_K_RESULTS,
        threshold=settings.SIMILARITY_THRESHOLD,
        keyword_weight=settings.KEYWORD_WEIGHT,
    )

    for chunk in raw:
        chunk["embedding"] = []

    # 3. Extractive QA
    answer, extracted_spans, qa_confidence = qa.synthesize_answer(question, raw)

    # 4. XAI
    token_importances = xai.compute_token_importance(question, raw)
    attribution_weights = xai.compute_chunk_attribution(raw, extracted_spans)
    grounding_score, grounding_label = xai.compute_grounding_score(answer, raw)
    reasoning_steps = xai.build_reasoning_steps(
        question, raw, token_importances, grounding_score
    )
    suggested = xai.generate_suggested_questions(raw)

    # 5. Build source chunks
    source_chunks = []
    for i, chunk in enumerate(raw):
        source_chunks.append(
            SourceChunk(
                chunk_id=str(chunk.get("id", f"chunk_{i}")),
                document_id=str(chunk.get("document_id", "")),
                filename=chunk["filename"],
                content=chunk["content"],
                chunk_index=chunk.get("chunk_index", i),
                page_number=chunk.get("page_number"),
                similarity_score=round(min(1.0, float(chunk.get("similarity", 0.0))), 4),
                relevance_label=_relevance_label(float(chunk.get("similarity", 0.0))),
                attribution_weight=attribution_weights[i] if i < len(attribution_weights) else 0.0,
                extracted_span=extracted_spans[i] if i < len(extracted_spans) else None,
            )
        )

    top_sim = float(raw[0].get("similarity", 0.0)) if raw else 0.0
    confidence = round(min(1.0, qa_confidence * 0.5 + top_sim * 0.5), 3)

    xai_report = XAIReport(
        token_importance=token_importances,
        grounding_score=round(grounding_score, 4),
        grounding_label=grounding_label,
        total_chunks_searched=len(raw),
        chunks_used=len([s for s in extracted_spans if s]),
        avg_similarity=round(
            sum(float(c.get("similarity", 0)) for c in raw) / max(len(raw), 1), 4
        ),
        top_source=raw[0]["filename"] if raw else "N/A",
        reasoning_steps=reasoning_steps,
    )

    elapsed = (time.perf_counter() - start) * 1000

    # 6. Persist
    query_id = db.save_query(
        question=question,
        answer=answer,
        confidence_score=confidence,
        grounding_score=grounding_score,
        processing_time_ms=round(elapsed, 1),
        chunks_used=len(source_chunks),
        top_document=xai_report.top_source,
        xai_data=xai_report.model_dump(),
        session_id=session_id,
    )

    return QueryResponse(
        id=query_id,
        question=question,
        answer=answer,
        source_chunks=source_chunks,
        xai=xai_report,
        confidence_score=confidence,
        processing_time_ms=round(elapsed, 1),
        embedding_model=settings.EMBEDDING_MODEL,
        qa_model=settings.QA_MODEL,
        timestamp=datetime.now(timezone.utc),
        suggested_questions=suggested,
    )


def list_documents(session_id: str) -> DocumentListResponse:
    docs = db.list_documents(session_id)
    return DocumentListResponse(
        total=len(docs),
        documents=[
            DocumentItem(
                id=d["id"],
                filename=d["filename"],
                chunk_count=d.get("chunk_count", 0),
                file_size_kb=d.get("file_size_kb"),
                summary=d.get("summary"),
                created_at=str(d.get("created_at", "")),
            )
            for d in docs
        ],
    )


def delete_document(document_id: str, session_id: str) -> None:
    db.delete_document(document_id, session_id)
