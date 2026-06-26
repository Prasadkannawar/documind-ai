import pytest
from app.services.xai_service import (
    compute_grounding_score,
    compute_chunk_attribution,
    build_reasoning_steps,
    generate_suggested_questions,
    _tokenize,
)
from app.models.schemas import TokenImportance


def test_grounding_highly_grounded():
    answer = "market volatility is the primary risk factor"
    chunks = [{"content": "market volatility remains the primary risk concern for investors"}]
    score, label = compute_grounding_score(answer, chunks)
    assert score > 0.5
    assert "Grounded" in label


def test_grounding_ungrounded():
    answer = "quantum computing will solve everything"
    chunks = [{"content": "the company reported strong quarterly earnings growth"}]
    score, label = compute_grounding_score(answer, chunks)
    assert label in ("Ungrounded", "Partially Grounded")


def test_chunk_attribution_sums_to_one():
    chunks = [
        {"similarity_score": 0.9},
        {"similarity_score": 0.6},
        {"similarity_score": 0.3},
    ]
    spans = ["some answer span", None, "another span"]
    weights = compute_chunk_attribution(chunks, spans)
    assert len(weights) == 3
    assert abs(sum(weights) - 1.0) < 0.01


def test_reasoning_steps_returns_three():
    chunks = [{"filename": "doc.pdf", "similarity_score": 0.85, "content": "test content"}]
    importances = [TokenImportance(token="risk", importance=0.9, normalized_importance=1.0)]
    steps = build_reasoning_steps("What are the risks?", chunks, importances, 0.8)
    assert len(steps) == 3


def test_tokenize_removes_stopwords():
    tokens = _tokenize("What are the main risk factors in the report?")
    assert "the" not in tokens
    assert "are" not in tokens
    assert "risk" in tokens
    assert "factors" in tokens


def test_suggested_questions():
    chunks = [{"content": "Python programming language is widely used in Machine learning applications"}]
    suggestions = generate_suggested_questions(chunks)
    assert isinstance(suggestions, list)
    assert len(suggestions) >= 0
