from pydantic import BaseModel
from typing import Optional, List


class ChatMessage(BaseModel):
    message: str
    client_id: Optional[str] = None  # if chatting in context of a specific client


class ChatResponse(BaseModel):
    reply: str
    mode_used: str  # "ask" | "rag" | "agentic" | "invoice"
    sources: Optional[List[str]] = None  # which document chunks were used, if RAG


class DocumentUploadOut(BaseModel):
    id: str
    filename: str
    client_id: Optional[str] = None
    chunks_created: int
