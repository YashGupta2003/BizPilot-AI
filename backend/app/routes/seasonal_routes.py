from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.seasonal_planner_service import (
    generate_seasonal_plan,
    get_seasonal_insights,
    save_seasonal_plan,
    get_seasonal_history
)

router = APIRouter(prefix="/api/seasonal", tags=["Seasonal Revenue Planner"])

@router.get("/plan")
async def get_seasonal_plan_route(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        owner_id = current_user["_id"]
        return await generate_seasonal_plan(db, owner_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/insights")
async def get_seasonal_insights_route(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        owner_id = current_user["_id"]
        return await get_seasonal_insights(db, owner_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/save-plan")
async def save_seasonal_plan_route(
    plan_data: dict,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        owner_id = current_user["_id"]
        return await save_seasonal_plan(db, owner_id, plan_data)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/history")
async def get_seasonal_history_route(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    try:
        owner_id = current_user["_id"]
        return await get_seasonal_history(db, owner_id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
