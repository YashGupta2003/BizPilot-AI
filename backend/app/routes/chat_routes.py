from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from bson import ObjectId
from bson.errors import InvalidId
import os
import shutil

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.chat_schema import ChatMessage, ChatResponse
from app.agents.chat_agent import handle_chat
from app.rag.document_loader import load_text_from_file, chunk_text
from app.rag.retriever import store_document_chunks

router = APIRouter(prefix="/api/chat", tags=["Chat & Documents"])

UPLOAD_DIR = "data/uploads"


def to_object_id_or_none(id_str: str | None):
    if not id_str:
        return None
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid client_id format")


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatMessage, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    client_id = to_object_id_or_none(payload.client_id)
    result = await handle_chat(db, current_user["_id"], payload.message, client_id=client_id)
    return result


@router.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    client_id: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Upload a PDF/DOCX/TXT, chunk it, embed it, and store in MongoDB.
    This is the RAG ingestion endpoint your frontend's upload button calls.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(UPLOAD_DIR, file.filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = load_text_from_file(filepath)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    chunks = chunk_text(text)
    client_obj_id = to_object_id_or_none(client_id)
    chunks_created = await store_document_chunks(db, current_user["_id"], file.filename, chunks, client_id=client_obj_id)

    return {
        "filename": file.filename,
        "client_id": client_id,
        "chunks_created": chunks_created,
    }
