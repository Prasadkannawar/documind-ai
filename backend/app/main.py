from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.core.config import settings
from app.api.routes import documents, query, analytics
from app.models.schemas import HealthResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

app = FastAPI(
    title="DocuMind AI — Backend API",
    version=settings.APP_VERSION,
    description=(
        "Production-ready RAG engine with full XAI. "
        "Hybrid search (vector + BM25), extractive QA with tinyRoberta, "
        "leave-one-out token attribution, and grounding scores."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/v1")
app.include_router(query.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def root():
    return {"product": "DocuMind AI", "version": settings.APP_VERSION, "docs": "/docs"}


@app.get("/health", response_model=HealthResponse, tags=["System"])
def health():
    from app.services import supabase_service as db
    try:
        docs = db.list_documents()
        connected = True
        doc_count = len(docs)
    except Exception:
        connected = False
        doc_count = 0

    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        embedding_model=settings.EMBEDDING_MODEL,
        qa_model=settings.QA_MODEL,
        supabase_connected=connected,
        total_documents=doc_count,
    )
