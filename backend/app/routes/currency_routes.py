from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.deps import get_current_user
from app.schemas.currency_schema import GSTCalculationRequest
from app.services.currency_service import (
    get_rates_to_inr,
    calculate_invoice_taxes,
    get_sac_suggestions,
    SUPPORTED_CURRENCIES,
    GST_SLABS,
    SAC_GST_MAP,
)

router = APIRouter(prefix="/api/currency", tags=["Currency & GST"])


@router.get("/rates")
async def get_exchange_rates(current_user: dict = Depends(get_current_user)):
    try:
        rates = await get_rates_to_inr()
        return {
            "rates_to_inr": rates,
            "supported_currencies": SUPPORTED_CURRENCIES,
            "gst_slabs": GST_SLABS,
            "source": "live",
        }
    except Exception:
        raise HTTPException(status_code=502, detail="Internal server error")


@router.get("/supported")
async def get_supported_currencies(current_user: dict = Depends(get_current_user)):
    return {"currencies": SUPPORTED_CURRENCIES, "gst_slabs": GST_SLABS}


@router.post("/calculate-gst")
async def calculate_gst(
    payload: GSTCalculationRequest,
    current_user: dict = Depends(get_current_user),
):
    try:
        result = await calculate_invoice_taxes(
            subtotal_in_invoice_currency=payload.subtotal,
            currency=payload.currency,
            gst_rate=payload.gst_rate,
            is_export=payload.is_export,
            is_inter_state=payload.is_inter_state,
            sac_code=payload.sac_code,
        )
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/sac-search")
async def search_sac_codes(
    q: str = Query(..., min_length=2),
    current_user: dict = Depends(get_current_user),
):
    results = get_sac_suggestions(q)
    return {"results": results}


@router.get("/sac-list")
async def list_sac_codes(current_user: dict = Depends(get_current_user)):
    return {
        "sac_codes": [
            {"sac_code": code, **info}
            for code, info in SAC_GST_MAP.items()
        ]
    }