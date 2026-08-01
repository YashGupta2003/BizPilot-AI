"""
Client Lifetime Value Predictor — API routes.

SYNCHRONIZATION:
- Reads invoices, contracts, meetings, disputes,
  whatsapp_reminders, client_profiles — the full data pipeline.
- Results feed back into Client 360 view.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.ltv_service import get_all_client_ltv, _calculate_client_ltv

router = APIRouter(prefix="/api/ltv", tags=["Client LTV Predictor"])


@router.get("/leaderboard")
async def get_ltv_leaderboard(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns all clients ranked by predicted 12-month revenue.
    The full data pipeline: invoices + contracts + meetings +
    disputes + reminders + risk profiles → LTV score → ranked list.
    """
    try:
        results = await get_all_client_ltv(db, current_user["_id"])
        return {
            "leaderboard": results,
            "total_clients": len(results),
            "total_predicted_12m": sum(r["predicted_12m_value"] for r in results),
            "champions": [r for r in results if r["segment"] == "Champion"],
            "at_risk": [r for r in results if r["segment"] == "At Risk"],
            "retainer_candidates": [r for r in results if r["retainer_tip"]["should_pitch"]],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/client/{client_id}")
async def get_client_ltv(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Returns LTV prediction for a single client."""
    client = await db.clients.find_one({
        "_id": ObjectId(client_id),
        "owner_id": current_user["_id"],
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")

    try:
        ltv = await _calculate_client_ltv(db, current_user["_id"], client)
        return ltv
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))