from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId
from typing import Optional
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.pricing_service import get_pricing_suggestion, get_pricing_history

router = APIRouter(prefix="/api/pricing", tags=["Smart Pricing Engine"])


class PricingRequest(BaseModel):
    service_type: str
    client_type: str = "Unknown"
    complexity: str = "standard"
    client_id: Optional[str] = None
    deliverable_count: int = 3


@router.post("/suggest")
async def suggest_price(
    payload: PricingRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    SYNC: reads invoices + proposals + client_profiles +
    disputes + scope_projects + contracts to suggest optimal price.
    """
    if payload.client_id:
        try:
            client_id_obj = ObjectId(payload.client_id)
        except (InvalidId, Exception):
            raise HTTPException(status_code=400, detail="Invalid ID format")
        client_doc = await db.clients.find_one({"_id": client_id_obj, "owner_id": current_user["_id"]})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")
            
    try:
        suggestion = await get_pricing_suggestion(
            db=db,
            owner_id=current_user["_id"],
            service_type=payload.service_type,
            client_type=payload.client_type,
            complexity=payload.complexity,
            client_id=payload.client_id,
            deliverable_count=payload.deliverable_count,
        )
        return suggestion
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/history")
async def get_pricing_history_route(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Returns your historical pricing patterns by service type."""
    try:
        return await get_pricing_history(db, current_user["_id"])
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")