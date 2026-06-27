import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header
from app.models.schemas import QueryRequest, QueryResponse
from app.services import rag_service, supabase_service as db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/query", tags=["Query"])


@router.post("/", response_model=QueryResponse)
async def query(
    request: QueryRequest,
    x_session_id: Optional[str] = Header(default="global"),
):
    session_id = x_session_id or "global"
    docs = db.list_documents(session_id)
    if not docs:
        raise HTTPException(422, "No documents indexed. Upload documents first.")
    try:
        return await rag_service.query(request, session_id)
    except Exception as e:
        logger.error(f"Query pipeline failed: {e}", exc_info=True)
        raise HTTPException(500, f"Query failed: {str(e)}")


@router.get("/history")
def history(
    limit: int = 20,
    x_session_id: Optional[str] = Header(default="global"),
):
    return db.get_query_history(x_session_id or "global", limit)
