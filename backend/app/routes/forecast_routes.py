"""
Predictive Cash Flow Forecasting — API route.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.forecast_service import generate_cash_flow_forecast, InsufficientDataError

router = APIRouter(prefix="/api/forecast", tags=["Cash Flow Forecasting"])


@router.get("/cash-flow", response_model=dict)
async def get_cash_flow_forecast(
    months: int = Query(3, ge=1, le=6, description="How many future months to forecast (1-6)"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns historical monthly revenue (from paid invoices) plus a predicted
    forecast for the next `months` months, with an honest confidence rating.
    """
    try:
        result = await generate_cash_flow_forecast(db, current_user["_id"], forecast_months=months)
    except InsufficientDataError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return result