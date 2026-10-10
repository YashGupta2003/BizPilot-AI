from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.portfolio_service import generate_portfolio_insights

router = APIRouter(prefix="/api/portfolio", tags=["Portfolio ROI Tracker"])


@router.get("/insights")
async def get_portfolio_insights(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns revenue intelligence from invoice history.
    SYNC: reads invoices + clients collections.
    """
    try:
        insights = await generate_portfolio_insights(db, current_user["_id"])
        return insights
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")