from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.schemas.networking_schema import NetworkingAnalysisRequest
from app.services.networking_service import analyze_networking_opportunities
from app.agents.networking_agent import generate_networking_recommendations

router = APIRouter(prefix="/api/networking", tags=["Networking"])

@router.get("/opportunities")
async def get_opportunities(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    owner_id = str(current_user["_id"])
    
    # 1. Analyze gaps
    gap_data = await analyze_networking_opportunities(db, owner_id)
    
    # 2. Get AI recommendations
    current_services_list = list(gap_data.get("current_services", {}).keys())
    ai_recommendations = await generate_networking_recommendations(gap_data, current_services_list)
    
    # 3. Compile full analysis
    full_analysis = {
        "owner_id": ObjectId(owner_id),
        "created_at": datetime.utcnow(),
        "gap_analysis": gap_data,
        "recommendations": ai_recommendations.get("recommendations", []),
        "revenue_opportunity": ai_recommendations.get("revenue_opportunity", 0)
    }
    
    # Save analysis to history
    result = await db["networking_analyses"].insert_one(full_analysis)
    full_analysis["_id"] = result.inserted_id
    
    return serialize_doc(full_analysis)

@router.post("/analyze")
async def analyze_for_client(
    req: NetworkingAnalysisRequest,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    owner_id = str(current_user["_id"])
    
    # 1. Analyze gaps
    gap_data = await analyze_networking_opportunities(db, owner_id, req.client_id)
    
    # 2. Get AI recommendations
    current_services_list = list(gap_data.get("current_services", {}).keys())
    ai_recommendations = await generate_networking_recommendations(gap_data, current_services_list)
    
    full_analysis = {
        "owner_id": ObjectId(owner_id),
        "client_id": ObjectId(req.client_id) if req.client_id else None,
        "created_at": datetime.utcnow(),
        "gap_analysis": gap_data,
        "recommendations": ai_recommendations.get("recommendations", []),
        "revenue_opportunity": ai_recommendations.get("revenue_opportunity", 0)
    }
    
    result = await db["networking_analyses"].insert_one(full_analysis)
    full_analysis["_id"] = result.inserted_id
    
    return serialize_doc(full_analysis)

@router.get("/history")
async def get_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    owner_id = current_user["_id"]
    cursor = db["networking_analyses"].find({"owner_id": owner_id}).sort("created_at", -1)
    analyses = await cursor.to_list(length=100)
    return serialize_list(analyses)

@router.delete("/history/{id}")
async def delete_analysis(
    id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    owner_id = current_user["_id"]
    result = await db["networking_analyses"].delete_one({"_id": ObjectId(id), "owner_id": owner_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analysis not found")
        
    return {"status": "success"}
