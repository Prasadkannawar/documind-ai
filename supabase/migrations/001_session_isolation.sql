-- Migration: session isolation + image chunk support
-- Run this in Supabase SQL Editor BEFORE deploying the new backend.

-- ── 1. Add session_id column to all tables ──────────────────────────────────
ALTER TABLE documents      ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'global';
ALTER TABLE chunks         ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'global';
ALTER TABLE query_history  ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'global';

-- ── 2. Indexes for fast per-session filtering ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_session     ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_chunks_session        ON chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_qh_session            ON query_history(session_id);

-- ── 3. Add image_chunk flag to chunks ────────────────────────────────────────
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS is_image_chunk BOOLEAN DEFAULT FALSE;

-- ── 4. Updated match_chunks — scoped to session ──────────────────────────────
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding  VECTOR(384),
  query_text       TEXT,
  match_count      INTEGER DEFAULT 5,
  match_threshold  FLOAT   DEFAULT 0.3,
  keyword_weight   FLOAT   DEFAULT 0.3,
  p_session_id     TEXT    DEFAULT 'global'
)
RETURNS TABLE (
  id              UUID,
  document_id     UUID,
  filename        TEXT,
  content         TEXT,
  chunk_index     INTEGER,
  page_number     INTEGER,
  is_image_chunk  BOOLEAN,
  similarity      FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    c.id,
    c.document_id,
    c.filename,
    c.content,
    c.chunk_index,
    c.page_number,
    c.is_image_chunk,
    (
      (1 - keyword_weight) * (1 - (c.embedding <=> query_embedding))
      + keyword_weight * ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text))
    ) AS similarity
  FROM chunks c
  WHERE
    c.session_id = p_session_id
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ── 5. Updated get_analytics — scoped to session ────────────────────────────
CREATE OR REPLACE FUNCTION get_analytics(p_session_id TEXT DEFAULT 'global')
RETURNS JSON
LANGUAGE SQL STABLE
AS $$
  SELECT json_build_object(
    'total_queries',    (SELECT COUNT(*)          FROM query_history WHERE session_id = p_session_id),
    'total_documents',  (SELECT COUNT(*)          FROM documents      WHERE session_id = p_session_id),
    'total_chunks',     (SELECT COUNT(*)          FROM chunks         WHERE session_id = p_session_id),
    'avg_confidence',   (SELECT ROUND(AVG(confidence_score)::NUMERIC, 3) FROM query_history WHERE session_id = p_session_id),
    'avg_grounding',    (SELECT ROUND(AVG(grounding_score)::NUMERIC, 3)  FROM query_history WHERE session_id = p_session_id),
    'avg_latency_ms',   (SELECT ROUND(AVG(processing_time_ms)::NUMERIC, 0) FROM query_history WHERE session_id = p_session_id),
    'recent_queries',   (
      SELECT json_agg(q ORDER BY q.created_at DESC)
      FROM (
        SELECT id, question, confidence_score, grounding_score, created_at
        FROM query_history
        WHERE session_id = p_session_id
        ORDER BY created_at DESC
        LIMIT 10
      ) q
    )
  );
$$;
