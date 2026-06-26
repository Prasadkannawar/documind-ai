"""
Own embedding model — BAAI/bge-small-en-v1.5
- 384-dimensional embeddings
- 130 MB on disk
- No external API needed
- State-of-the-art for its size class
"""
import logging
import numpy as np
from typing import List
from sentence_transformers import SentenceTransformer
from app.core.config import settings

logger = logging.getLogger(__name__)

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
        logger.info("Embedding model loaded")
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    model = get_model()
    # BGE models require a query prefix for queries, doc prefix for passages
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,   # cosine similarity via dot product
        show_progress_bar=False,
        batch_size=32,
    )
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Prepend BGE query instruction for better retrieval accuracy."""
    model = get_model()
    instruction = f"Represent this sentence for searching relevant passages: {query}"
    embedding = model.encode(
        [instruction],
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return embedding[0].tolist()


def embed_documents(texts: List[str]) -> List[List[float]]:
    """Passages don't need the instruction prefix — just encode directly."""
    return embed_texts(texts)


def cosine_similarity(a: List[float], b: List[float]) -> float:
    va = np.array(a)
    vb = np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)
