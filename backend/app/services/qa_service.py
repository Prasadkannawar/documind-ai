"""
Own QA model — deepset/tinyroberta-squad2
- Extractive question answering (no hallucination — answer must exist in source)
- 65 MB on disk
- No external API needed
- Returns answer spans with start/end positions and confidence scores
"""
import logging
from typing import List, Tuple, Optional
from transformers import pipeline
from app.core.config import settings

logger = logging.getLogger(__name__)

_pipeline = None


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        logger.info(f"Loading QA model: {settings.QA_MODEL}")
        _pipeline = pipeline(
            "question-answering",
            model=settings.QA_MODEL,
            tokenizer=settings.QA_MODEL,
            device=-1,  # CPU
        )
        logger.info("QA model loaded")
    return _pipeline


def extract_answer_from_chunk(
    question: str,
    context: str,
    max_answer_len: int = 200,
) -> Tuple[str, float, int, int]:
    """
    Returns (answer_text, confidence_score, char_start, char_end).
    """
    qa = get_pipeline()
    try:
        result = qa(
            question=question,
            context=context,
            max_answer_len=max_answer_len,
            handle_impossible_answer=True,
        )
        return (
            result["answer"],
            float(result["score"]),
            result.get("start", 0),
            result.get("end", 0),
        )
    except Exception as e:
        logger.warning(f"QA extraction failed: {e}")
        # Fall back to first 200 chars of chunk
        return context[:200], 0.1, 0, min(200, len(context))


def synthesize_answer(
    question: str,
    chunks: List[dict],
    max_chunks: int = 3,
) -> Tuple[str, List[Optional[str]], float]:
    """
    Run extractive QA on top-k chunks, combine best spans into a final answer.
    Returns (combined_answer, extracted_spans_per_chunk, overall_confidence).
    """
    results = []
    spans = []

    for chunk in chunks[:max_chunks]:
        answer, score, start, end = extract_answer_from_chunk(
            question, chunk["content"]
        )
        results.append((answer, score, chunk))
        spans.append(answer if score > 0.15 else None)

    if not results:
        return "No relevant information found in the uploaded documents.", [], 0.0

    # Sort by QA confidence
    results.sort(key=lambda x: x[1], reverse=True)

    # Build final answer from unique high-confidence spans
    seen = set()
    answer_parts = []
    total_score = 0.0

    for answer, score, chunk in results:
        if score < 0.1:
            continue
        answer_clean = answer.strip()
        if answer_clean and answer_clean not in seen:
            seen.add(answer_clean)
            answer_parts.append(answer_clean)
            total_score += score

    if not answer_parts:
        # All confidence too low — use highest-similarity chunk content directly
        best_chunk = chunks[0] if chunks else None
        if best_chunk:
            return (
                f"Based on the documents: {best_chunk['content'][:300]}...",
                spans,
                0.2,
            )
        return "No relevant answer found.", spans, 0.0

    # Format answer: combine up to 3 unique spans
    if len(answer_parts) == 1:
        final_answer = answer_parts[0]
    else:
        final_answer = " ".join(answer_parts[:3])

    avg_confidence = min(1.0, total_score / len(answer_parts))
    return final_answer, spans, avg_confidence
