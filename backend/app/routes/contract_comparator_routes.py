from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.contract_comparator_agent import compare_contracts, ContractComparisonError

router = APIRouter(prefix="/api/contract-compare", tags=["Contract Comparator"])

class CompareContractsRequest(BaseModel):
    your_contract: str
    client_contract: str
    client_id: Optional[str] = None
    contract_id: Optional[str] = None

@router.post("/analyze")
async def analyze_contracts(
    request: CompareContractsRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyzes differences between two contracts and identifies red flags.
    Enriches with client profile and past dispute data if client_id is provided.
    Loads baseline contract if contract_id is provided.
    """
    owner_id = current_user["_id"]
    
    your_contract_text = request.your_contract
    
    # If contract_id provided, load the actual text from DB
    if request.contract_id:
        try:
            baseline = await db.contracts.find_one({"_id": ObjectId(request.contract_id), "owner_id": owner_id})
            if baseline and baseline.get("contract_text"):
                your_contract_text = baseline["contract_text"]
        except Exception:
            pass # fallback to what was passed in request
            
    client_context = None
    dispute_context = None
    
    if request.client_id:
        try:
            client = await db.clients.find_one({"_id": ObjectId(request.client_id), "owner_id": owner_id})
            if client:
                client_context = {
                    "risk_score": client.get("risk_score", "low"),
                    "notes": client.get("notes", "")
                }
                
            # Check for disputes
            disputes = await db.disputes.find({"client_id": str(request.client_id), "owner_id": owner_id}).to_list(length=100)
            if disputes:
                reasons = [d.get("reason", "unknown") for d in disputes if d.get("reason")]
                dispute_context = {
                    "count": len(disputes),
                    "common_reasons": list(set(reasons))[:3]
                }
        except Exception:
            pass
            
    try:
        analysis_result = await compare_contracts(
            your_contract=your_contract_text,
            client_contract=request.client_contract,
            client_context=client_context,
            dispute_context=dispute_context
        )
    except ContractComparisonError as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    # Save to history
    comparison_doc = {
        "owner_id": owner_id,
        "created_at": datetime.utcnow(),
        "client_id": request.client_id,
        "contract_id": request.contract_id,
        "your_contract": your_contract_text,
        "client_contract": request.client_contract,
        "analysis": analysis_result
    }
    
    result = await db.contract_comparisons.insert_one(comparison_doc)
    comparison_doc["_id"] = result.inserted_id
    
    return serialize_doc(comparison_doc)


@router.get("/history")
async def get_comparison_history(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """List all contract comparisons for the current user."""
    owner_id = current_user["_id"]
    comparisons = await db.contract_comparisons.find({"owner_id": owner_id}).sort("created_at", -1).to_list(length=100)
    return serialize_list(comparisons)


@router.get("/{comparison_id}")
async def get_comparison(
    comparison_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific contract comparison."""
    owner_id = current_user["_id"]
    try:
        comparison = await db.contract_comparisons.find_one({"_id": ObjectId(comparison_id), "owner_id": owner_id})
        if not comparison:
            raise HTTPException(status_code=404, detail="Comparison not found")
        return serialize_doc(comparison)
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Invalid comparison ID")


@router.delete("/{comparison_id}")
async def delete_comparison(
    comparison_id: str,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Delete a contract comparison."""
    owner_id = current_user["_id"]
    try:
        result = await db.contract_comparisons.delete_one({"_id": ObjectId(comparison_id), "owner_id": owner_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Comparison not found")
        return {"success": True}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail="Invalid comparison ID")
