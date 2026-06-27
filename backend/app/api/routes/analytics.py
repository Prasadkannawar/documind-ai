from typing import Optional
from fastapi import APIRouter, Header
from app.services import supabase_service as db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/")
def analytics(x_session_id: Optional[str] = Header(default="global")):
    return db.get_analytics(x_session_id or "global")
