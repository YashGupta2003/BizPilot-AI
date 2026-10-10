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

from app.core.config import settings
AWS_BUCKET = getattr(settings, "AWS_BUCKET_NAME", None)
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


import hashlib
import uuid
from datetime import datetime, timezone
import magic
import io

@router.post("/upload-document")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    client_id: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    content = await file.read()
    size = len(content)
    if size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
        
    mime_type = magic.from_buffer(content[:2048], mime=True)
    allowed_mimes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
    if mime_type not in allowed_mimes:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime_type}")
        
    sha256_hash = hashlib.sha256(content).hexdigest()
    existing = await db.documents_meta.find_one({
        "owner_id": current_user["_id"], 
        "sha256": sha256_hash
    })
    
    doc_id = ObjectId() if not existing else existing["_id"]
    
    if existing:
        return {
            "doc_id": str(doc_id),
            "filename": existing["original_name"],
            "client_id": client_id,
            "status": existing["status"],
            "message": "File already exists"
        }
        
    ext = os.path.splitext(file.filename)[1]
    sanitized_name = f"{uuid.uuid4()}{ext}"
    
    client_obj_id = to_object_id_or_none(client_id)
    if client_obj_id:
        client_doc = await db.clients.find_one({"_id": client_obj_id, "owner_id": current_user["_id"]})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")

    meta = {
        "_id": doc_id,
        "owner_id": current_user["_id"],
        "original_name": file.filename,
        "storage_name": sanitized_name,
        "sha256": sha256_hash,
        "size": size,
        "status": "processing",
        "created_at": datetime.now(timezone.utc),
    }
    if client_obj_id:
        meta["client_id"] = client_obj_id
        
    await db.documents_meta.insert_one(meta)
    
    file.file = io.BytesIO(content)
    filepath = await storage_service.upload_file(file, sanitized_name, str(current_user["_id"]))
    
    try:
        text = load_text_from_file(filepath)
    except ValueError:
        await db.documents_meta.update_one({"_id": doc_id}, {"$set": {"status": "error"}})
        raise HTTPException(status_code=400, detail="Invalid document format or unreadable content")

    chunks = chunk_text(text)
    model = request.app.state.embedding_model
    # Pass str(doc_id) as filename equivalent for store_document_chunks so it sets doc_id in DB
    chunks_created = await store_document_chunks(db, model, current_user["_id"], str(doc_id), chunks, client_id=client_obj_id)
    
    await db.documents_meta.update_one({"_id": doc_id}, {"$set": {"status": "ready"}})

    return {
        "doc_id": str(doc_id),
        "filename": file.filename,
        "client_id": client_id,
        "chunks_created": chunks_created,
    }


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    obj_id = to_object_id_or_none(doc_id)
    meta = await db.documents_meta.find_one({"_id": obj_id, "owner_id": current_user["_id"]})
    if not meta:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete chunks
    await db.documents.delete_many({"filename": str(obj_id), "owner_id": current_user["_id"]})
    
    # Delete meta
    await db.documents_meta.delete_one({"_id": obj_id})
    
    # Delete from storage
    if "storage_name" in meta:
        await storage_service.delete_file(meta["storage_name"], str(current_user["_id"]))
        
    return {"status": "deleted"}
