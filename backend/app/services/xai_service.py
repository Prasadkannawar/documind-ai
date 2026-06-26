"""
Explainable AI (XAI) Service — DocuMind AI

Implements three interpretability techniques:
  1. Leave-one-out token attribution  — which words in the query drove retrieval
  2. Chunk attribution weights        — how much each chunk contributed to the answer
  3. Grounding score                  — anti-hallucination: is the answer in the sources?
"""
import re
import math
import logging
from typing import List, Tuple
import numpy as np

from app.services.embedding_service import embed_query, cosine_similarity
from app.models.schemas import TokenImportance

logger = logging.getLogger(__name__)


# ── 1. Leave-One-Out Token Attribution ────────────────────────────────────────

def compute_token_importance(
    query: str,
    chunks: List[dict],
    top_k: int = 5,
) -> List[TokenImportance]:
    """
    For each meaningful word in the query:
      - Remove it, re-embed the reduced query
      - Measure the drop in average top-k cosine similarity to the retrieved chunks
      - Larger drop → word was more important for retrieval
    """
    # Tokenize: keep alphabetic words, preserve casing for display
    tokens = re.findall(r'\b[a-zA-Z]\w*\b', query)
    if not tokens:
        return []

    # Baseline: similarity with full query
    query_emb = embed_query(query)
    chunk_embs = [np.array(c["embedding"]) for c in chunks if c.get("embedding")]

    if not chunk_embs:
        # No embeddings stored — return uniform importance
        return [
            TokenImportance(token=t, importance=1.0 / len(tokens), normalized_importance=1.0 / len(tokens))
            for t in tokens
        ]

    baseline_sim = _avg_similarity(query_emb, chunk_embs, top_k)

    raw_importances = []
    for i, token in enumerate(tokens):
        # Build query with this token removed
        reduced = " ".join(t for j, t in enumerate(tokens) if j != i)
        if not reduced.strip():
            raw_importances.append(0.0)
            continue
        reduced_emb = embed_query(reduced)
        reduced_sim = _avg_similarity(reduced_emb, chunk_embs, top_k)
        # Importance = drop in similarity when token is removed
        drop = max(0.0, baseline_sim - reduced_sim)
        raw_importances.append(drop)

    max_imp = max(raw_importances) if raw_importances else 1.0
    if max_imp == 0:
        max_imp = 1.0

    return [
        TokenImportance(
            token=token,
            importance=round(raw, 4),
            normalized_importance=round(raw / max_imp, 4),
        )
        for token, raw in zip(tokens, raw_importances)
    ]


def _avg_similarity(query_emb: List[float], chunk_embs: List[np.ndarray], top_k: int) -> float:
    sims = [float(np.dot(query_emb, ce)) for ce in chunk_embs]
    sims.sort(reverse=True)
    top = sims[:top_k]
    return sum(top) / len(top) if top else 0.0


# ── 2. Chunk Attribution Weights ──────────────────────────────────────────────

def compute_chunk_attribution(
    chunks: List[dict],
    extracted_spans: List[str | None],
) -> List[float]:
    """
    Attribution weight for each chunk = similarity_score * span_confidence_bonus.
    Normalized to sum to 1.0.
    """
    weights = []
    for i, chunk in enumerate(chunks):
        sim = chunk.get("similarity", chunk.get("similarity_score", 0.0))
        # Bonus if this chunk had a confident extracted span
        span = extracted_spans[i] if i < len(extracted_spans) else None
        span_bonus = 1.3 if span and len(span) > 10 else 1.0
        weights.append(sim * span_bonus)

    total = sum(weights) or 1.0
    return [round(w / total, 4) for w in weights]


# ── 3. Grounding Score (Anti-Hallucination) ────────────────────────────────────

def compute_grounding_score(answer: str, chunks: List[dict]) -> Tuple[float, str]:
    """
    Measures how well the answer is grounded in the retrieved source chunks.

    Method: Sentence-level overlap between answer tokens and chunk tokens.
    Score = Jaccard similarity between answer unigrams and union of chunk unigrams.

    A score close to 1.0 means the answer is entirely composed of words from the sources.
    A score near 0 means the answer may contain hallucinated content.
    """
    answer_tokens = set(_tokenize(answer))
    if not answer_tokens:
        return 0.0, "Ungrounded"

    source_tokens: set = set()
    for chunk in chunks:
        source_tokens |= set(_tokenize(chunk.get("content", "")))

    if not source_tokens:
        return 0.0, "Ungrounded"

    intersection = answer_tokens & source_tokens
    union = answer_tokens | source_tokens
    jaccard = len(intersection) / len(union) if union else 0.0

    # Scale: Jaccard for text is naturally low; map to 0-1 with sigmoid-like scaling
    scaled = min(1.0, jaccard * 3.5)
    score = round(scaled, 4)

    if score >= 0.75:
        label = "Highly Grounded"
    elif score >= 0.50:
        label = "Grounded"
    elif score >= 0.25:
        label = "Partially Grounded"
    else:
        label = "Ungrounded"

    return score, label


def _tokenize(text: str) -> List[str]:
    # Simple lowercased word tokenization, removing stopwords
    STOPWORDS = {"the", "a", "an", "is", "it", "in", "on", "at", "to", "for",
                 "of", "and", "or", "but", "with", "this", "that", "are", "was",
                 "be", "as", "by", "from", "has", "have", "had", "its", "not"}
    return [
        w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', text)
        if w.lower() not in STOPWORDS
    ]


# ── 4. Reasoning Steps ────────────────────────────────────────────────────────

def build_reasoning_steps(
    query: str,
    chunks: List[dict],
    token_importances: List[TokenImportance],
    grounding_score: float,
) -> List[str]:
    """Generate human-readable reasoning steps for the XAI panel."""
    top_tokens = sorted(token_importances, key=lambda t: t.importance, reverse=True)[:3]
    top_token_names = [t.token for t in top_tokens if t.importance > 0]

    steps = []

    if top_token_names:
        steps.append(
            f"Query analysis: The key retrieval terms were "
            f"{', '.join(repr(t) for t in top_token_names)}, "
            f"identified via leave-one-out token attribution."
        )
    else:
        steps.append("Query analyzed using full semantic embedding of the input question.")

    if chunks:
        top_chunk = chunks[0]
        steps.append(
            f"Hybrid search (vector + BM25) retrieved {len(chunks)} chunks. "
            f"Top match: '{top_chunk['filename']}' "
            f"(similarity {float(top_chunk.get('similarity', top_chunk.get('similarity_score', 0))):.0%})."
        )

    grounding_label = "high" if grounding_score >= 0.75 else "moderate" if grounding_score >= 0.5 else "low"
    steps.append(
        f"Answer grounding score is {grounding_score:.0%} ({grounding_label}), "
        f"meaning the answer is {'strongly' if grounding_score > 0.6 else 'partially'} "
        f"composed of text from the source documents."
    )

    return steps


# ── 5. Suggested Questions ─────────────────────────────────────────────────────

def generate_suggested_questions(chunks: List[dict]) -> List[str]:
    """Generate follow-up question suggestions based on chunk content."""
    suggestions = []
    seen_topics: set = set()

    question_patterns = [
        ("what", "What are the main points about {}?"),
        ("how", "How does {} work according to the document?"),
        ("why", "Why is {} important based on the content?"),
        ("when", "When does {} occur as mentioned in the source?"),
    ]

    for chunk in chunks[:3]:
        content = chunk.get("content", "")
        # Extract noun phrases as topics (simple heuristic: capitalized words or key nouns)
        words = re.findall(r'\b[A-Z][a-z]{3,}\b', content)
        if not words:
            words = re.findall(r'\b[a-z]{5,}\b', content)[:3]

        for word in words[:2]:
            if word.lower() in seen_topics:
                continue
            seen_topics.add(word.lower())
            _, pattern = question_patterns[len(suggestions) % len(question_patterns)]
            suggestions.append(pattern.format(word))
            if len(suggestions) >= 3:
                break
        if len(suggestions) >= 3:
            break

    return suggestions
