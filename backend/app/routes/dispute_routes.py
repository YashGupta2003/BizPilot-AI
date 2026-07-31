from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.dispute_schema import DisputeRequest, DisputeResponse
from app.models.serializers import serialize_doc
from app.rag.retriever import search_similar_chunks
from app.agents.dispute_agent import resolve_dispute

router = APIRouter(prefix="/api/disputes", tags=["Disputes"])

def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")

@router.post("/resolve", response_model=DisputeResponse)
async def resolve_client_dispute(
    payload: DisputeRequest, 
    current_user: dict = Depends(get_current_user), 
    db=Depends(get_database)
):
    owner_id = current_user["_id"]
    client_id = payload.client_id
    
    # 1. Fetch Client Details
    client = await db.clients.find_one({"_id": to_object_id(client_id), "owner_id": owner_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    client_out = serialize_doc(client)
    
    # 2. Fetch Invoice Details (if provided)
    invoice_out = None
    if payload.invoice_id:
        invoice = await db.invoices.find_one({"_id": to_object_id(payload.invoice_id), "owner_id": owner_id})
        if invoice:
            invoice_out = serialize_doc(invoice)
            
    # 3. Use RAG to query for relevant contract/meeting notes for this client
    # The query is designed to find payment terms, revision limits, and dispute clauses
    rag_query = f"Payment terms, dispute resolution, revision limits, contract agreement for: {payload.dispute_message}"
    
    chunks = await search_similar_chunks(db, owner_id, rag_query, client_id=client_id, top_k=5)
    
    rag_context = ""
    if chunks:
        rag_context = "\n\n".join([f"Source: {c['filename']}\nExcerpt: {c['text']}" for c in chunks])
    else:
        rag_context = "No specific contract or meeting notes found for this client regarding this issue."

    # 4. Pass to Dispute Agent
    agent_response = await resolve_dispute(
        dispute_message=payload.dispute_message,
        client_details=client_out,
        invoice_details=invoice_out,
        rag_context=rag_context
    )
    
    return DisputeResponse(**agent_response)
