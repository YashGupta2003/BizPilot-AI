from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.burnout_service import generate_burnout_prediction, BurnoutAnalysisError

router = APIRouter(prefix="/api/burnout", tags=["Burnout Predictor"])


@router.get("/prediction")
async def get_burnout_prediction(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Returns a full burnout risk and income stability prediction
    based on the user's invoice history.
    Synchronized with: invoices collection, clients collection.
    """
    try:
        result = await generate_burnout_prediction(db, current_user["_id"])
        return result
    except BurnoutAnalysisError as exc:
        raise HTTPException(status_code=404, detail=str(exc))