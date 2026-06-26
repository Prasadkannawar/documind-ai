from fastapi import APIRouter
from app.services import supabase_service as db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/")
def analytics():
    return db.get_analytics()
