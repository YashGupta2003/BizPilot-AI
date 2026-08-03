from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime, timezone
from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.schemas.tone_schema import ToneAnalysisRequest
from app.agents.tone_agent import analyze_communication_tone

router = APIRouter(prefix="/api/tone", tags=["Tone Analyzer"])

@router.post("/analyze")
async def analyze_tone_route(
    request: ToneAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    owner_id = current_user["_id"]
    client_context = None
    client_name = None
    
    if request.client_id:
        try:
            client_id_obj = ObjectId(request.client_id)
            client = await db["clients"].find_one({"_id": client_id_obj, "owner_id": owner_id})
            if client:
                client_name = client.get("name")
                
                # Fetch context (simplified)
                invoices = await db["invoices"].find({"client_id": str(client_id_obj), "owner_id": owner_id}).to_list(10)
                invoices_data = serialize_list(invoices)
                
                client_context = {
                    "client_name": client_name,
                    "industry": client.get("industry"),
                    "status": client.get("status"),
                    "recent_invoices": [{"status": inv.get("status"), "amount": inv.get("amount")} for inv in invoices_data]
                }
        except:
            pass

    analysis_result = await analyze_communication_tone(
        text=request.communication_text,
        client_context=client_context
    )
    
    doc = {
        "owner_id": owner_id,
        "client_id": request.client_id,
        "client_name": client_name,
        "communication_type": request.communication_type,
        "communication_text": request.communication_text,
        "analysis": analysis_result,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db["tone_analyses"].insert_one(doc)
    doc["_id"] = result.inserted_id
    
    return serialize_doc(doc)

@router.get("/history")
async def get_tone_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    owner_id = current_user["_id"]
    analyses = await db["tone_analyses"].find({"owner_id": owner_id}).sort("created_at", -1).to_list(100)
    return serialize_list(analyses)

@router.get("/history/{id}")
async def get_tone_analysis(
    id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    owner_id = current_user["_id"]
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    analysis = await db["tone_analyses"].find_one({"_id": obj_id, "owner_id": owner_id})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return serialize_doc(analysis)

@router.get("/client/{client_id}")
async def get_client_tones(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    owner_id = current_user["_id"]
    analyses = await db["tone_analyses"].find({
        "owner_id": owner_id, 
        "client_id": client_id
    }).sort("created_at", -1).to_list(100)
    return serialize_list(analyses)

@router.delete("/history/{id}")
async def delete_tone_analysis(
    id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database),
):
    owner_id = current_user["_id"]
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    result = await db["tone_analyses"].delete_one({"_id": obj_id, "owner_id": owner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return {"status": "success"}
