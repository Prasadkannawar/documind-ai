from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from pathlib import Path
from typing import Optional
from app.core.config import settings
from app.models.schemas import DocumentUploadResponse, DocumentListResponse
from app.services import rag_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload(
    file: UploadFile = File(...),
    x_session_id: Optional[str] = Header(default="global"),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed. Accepted: {settings.ALLOWED_EXTENSIONS}")

    data = await file.read()
    if len(data) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    session_id = x_session_id or "global"
    try:
        return await rag_service.upload_document(data, file.filename, session_id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")


@router.get("/", response_model=DocumentListResponse)
def list_docs(x_session_id: Optional[str] = Header(default="global")):
    return rag_service.list_documents(x_session_id or "global")


@router.delete("/{document_id}")
def delete_doc(
    document_id: str,
    x_session_id: Optional[str] = Header(default="global"),
):
    try:
        rag_service.delete_document(document_id, x_session_id or "global")
        return {"message": f"Document {document_id} deleted"}
    except Exception as e:
        raise HTTPException(500, str(e))
