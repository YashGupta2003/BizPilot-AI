from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/history")
async def get_pricing_history_route(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Returns your historical pricing patterns by service type."""
    try:
        return await get_pricing_history(db, current_user["_id"])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))