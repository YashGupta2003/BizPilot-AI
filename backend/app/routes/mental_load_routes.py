"""
Freelancer Mental Load Index — API Routes.

SYNCHRONIZATION:
- Reads from ALL feature collections via mental_load_service
- Saves snapshots to 'mental_load_snapshots' collection
- Feeds data to: activity feed, dashboard alerts, burnout predictor
- Connected to: invoices, contracts, proposals, disputes, scope_projects,
  meetings, income_goals, escalation_logs, whatsapp_reminders, tone_analyses
"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.mental_load_service import (
    calculate_mental_load_score,
    get_mental_load_history,
    get_mental_load_items,
)

router = APIRouter(prefix="/api/mental-load", tags=["Mental Load Index"])


@router.get("/score")
async def get_mental_load_score(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns the current Mental Load Index score with full breakdown.
    Queries 10+ collections to build a holistic cognitive load picture.
    Also saves a snapshot for historical trend tracking.
    """
    try:
        return await calculate_mental_load_score(db, current_user["_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate mental load: {str(e)}")


@router.get("/history")
async def get_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns historical mental load snapshots for trend analysis.
    Used by the MentalLoadPage to show the AreaChart of load over time.
    """
    try:
        return await get_mental_load_history(db, current_user["_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.get("/items")
async def get_open_items(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns ALL open items across the platform, grouped by category
    and ranked by urgency/impact for the triage view.
    """
    try:
        return await get_mental_load_items(db, current_user["_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch items: {str(e)}")
