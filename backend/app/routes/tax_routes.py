"""
Freelancer Tax Filing Assistant — API routes.

GET  /api/tax/report           → full tax report for current/specified FY
GET  /api/tax/checklist        → just the filing checklist
GET  /api/tax/advance-tax      → advance tax schedule only
GET  /api/tax/gst-quarters     → GST quarterly breakdown
GET  /api/tax/form-26as        → Form 26AS TDS summary
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_database
from app.core.deps import get_current_user
from app.services.tax_service import generate_tax_report, get_current_fy

router = APIRouter(prefix="/api/tax", tags=["Tax Filing Assistant"])


@router.get("/report")
async def get_tax_report(
    fy_start: int = Query(None, description="Financial year start, e.g. 2024 for FY 2024-25"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Complete tax filing report.
    SYNC: reads invoices + clients — the full revenue pipeline.
    """
    if not fy_start:
        fy_start, fy_end = get_current_fy()
    else:
        fy_end = fy_start + 1

    try:
        report = await generate_tax_report(db, current_user["_id"], fy_start, fy_end)
        return report
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/checklist")
async def get_checklist(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Just the filing checklist — for dashboard widget."""
    fy_start, fy_end = get_current_fy()
    try:
        report = await generate_tax_report(db, current_user["_id"], fy_start, fy_end)
        return {
            "checklist": report["checklist"],
            "urgent_count": report["urgent_count"],
            "current_quarter": report["current_quarter"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))