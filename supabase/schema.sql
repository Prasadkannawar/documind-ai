-- DocuMind AI — Supabase schema
-- Run this in the Supabase SQL editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename    TEXT NOT NULL,
  file_size_kb FLOAT,
  chunk_count INTEGER DEFAULT 0,
  summary     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table with 384-dim BGE embedding
CREATE TABLE IF NOT EXISTS chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  content      TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  page_number  INTEGER DEFAULT 1,   -- PDF page number this chunk came from
  embedding    VECTOR(384),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- IVFFlat index for fast approximate nearest-neighbor search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- BM25-style keyword search via full-text index
CREATE INDEX IF NOT EXISTS chunks_content_fts
  ON chunks USING gin(to_tsvector('english', content));

-- Query history for analytics
CREATE TABLE IF NOT EXISTS query_history (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  confidence_score  FLOAT,
  grounding_score   FLOAT,
  processing_time_ms FLOAT,
  chunks_used       INTEGER,
  top_document      TEXT,
  xai_data          JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── RPC: hybrid similarity + keyword search ────────────────────────────────
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding  VECTOR(384),
  query_text       TEXT,
  match_count      INTEGER DEFAULT 5,
  match_threshold  FLOAT   DEFAULT 0.3,
  keyword_weight   FLOAT   DEFAULT 0.3
)
RETURNS TABLE (
  id           UUID,
  document_id  UUID,
  filename     TEXT,
  content      TEXT,
  chunk_index  INTEGER,
  page_number  INTEGER,
  similarity   FLOAT
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
    -- Hybrid score: (1 - weight) * vector_sim + weight * keyword_sim
    (
      (1 - keyword_weight) * (1 - (c.embedding <=> query_embedding))
      + keyword_weight * ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', query_text))
    ) AS similarity
  FROM chunks c
  WHERE
    (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- ── RPC: analytics summary ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_analytics()
RETURNS JSON
LANGUAGE SQL STABLE
AS $$
  SELECT json_build_object(
    'total_queries',    (SELECT COUNT(*) FROM query_history),
    'total_documents',  (SELECT COUNT(*) FROM documents),
    'total_chunks',     (SELECT COUNT(*) FROM chunks),
    'avg_confidence',   (SELECT ROUND(AVG(confidence_score)::NUMERIC, 3) FROM query_history),
    'avg_grounding',    (SELECT ROUND(AVG(grounding_score)::NUMERIC, 3) FROM query_history),
    'avg_latency_ms',   (SELECT ROUND(AVG(processing_time_ms)::NUMERIC, 0) FROM query_history),
    'recent_queries',   (
      SELECT json_agg(q ORDER BY q.created_at DESC)
      FROM (
        SELECT id, question, confidence_score, grounding_score, created_at
        FROM query_history
        ORDER BY created_at DESC
        LIMIT 10
      ) q
    )
  );
$$;
