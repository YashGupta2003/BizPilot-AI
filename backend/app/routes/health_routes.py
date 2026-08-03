from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.health_service import get_all_client_health, calculate_client_health

router = APIRouter(prefix="/api/health", tags=["Client Health Score"])


@router.get("/all")
async def get_all_health_scores(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Full health dashboard — all clients scored and ranked.
    SYNC: reads invoices + reminders + disputes + escalations +
    scope_projects + contracts + meetings + client_profiles.
    """
    try:
        scores = await get_all_client_health(db, current_user["_id"])
        at_risk = [c for c in scores if c["health_score"] < 40]
        champions = [c for c in scores if c["health_score"] >= 80]
        return {
            "scores": scores,
            "total_clients": len(scores),
            "champions_count": len(champions),
            "at_risk_count": len(at_risk),
            "avg_health": round(
                sum(c["health_score"] for c in scores) / len(scores), 1
            ) if scores else 0,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/client/{client_id}")
async def get_client_health_score(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Health score for a single client — used by Client 360."""
    client = await db.clients.find_one({
        "_id": ObjectId(client_id),
        "owner_id": current_user["_id"],
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client not found.")
    try:
        health = await calculate_client_health(db, current_user["_id"], client)
        return health
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))