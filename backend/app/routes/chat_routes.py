from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from bson import ObjectId
from bson.errors import InvalidId
import os

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.chat_schema import ChatMessage, ChatResponse
from app.agents.chat_agent import handle_chat
from app.rag.document_loader import load_text_from_file, chunk_text
from app.rag.retriever import store_document_chunks
from app.services.storage_service import LocalStorageService, S3StorageService

router = APIRouter(prefix="/api/chat", tags=["Chat & Documents"])

# Use S3 if bucket is configured, otherwise fallback to local
AWS_BUCKET = os.getenv("AWS_BUCKET_NAME")
if AWS_BUCKET:
    storage_service = S3StorageService(bucket_name=AWS_BUCKET)
else:
    storage_service = LocalStorageService(upload_dir="data/uploads")




def to_object_id_or_none(id_str: str | None):
    if not id_str:
        return None
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid client_id format")


@router.post("", response_model=ChatResponse)
async def chat(request: Request, payload: ChatMessage, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    client_id = to_object_id_or_none(payload.client_id)
    model = request.app.state.embedding_model
    result = await handle_chat(db, model, current_user["_id"], payload.message, client_id=client_id)
    return result


@router.post("/upload-document")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    client_id: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Upload a PDF/DOCX/TXT, chunk it, embed it, and store in MongoDB.
    This is the RAG ingestion endpoint your frontend's upload button calls.
    """
    filepath = await storage_service.upload_file(file, file.filename)

    try:
        text = load_text_from_file(filepath)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    chunks = chunk_text(text)
    client_obj_id = to_object_id_or_none(client_id)
    if client_obj_id:
        client_doc = await db.clients.find_one({"_id": client_obj_id, "owner_id": current_user["_id"]})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")
            
    model = request.app.state.embedding_model
    chunks_created = await store_document_chunks(db, model, current_user["_id"], file.filename, chunks, client_id=client_obj_id)

    return {
        "filename": file.filename,
        "client_id": client_id,
        "chunks_created": chunks_created,
    }
