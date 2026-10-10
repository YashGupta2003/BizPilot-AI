"""
Smart Contract Risk Analyzer — API routes.

Two endpoints:
- POST /api/risk/analyze        -> runs analysis on an already-uploaded document, saves the report
- GET  /api/risk/reports        -> lists all saved risk reports for the logged-in user
- GET  /api/risk/reports/{id}   -> fetches one specific report
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.risk_schema import AnalyzeContractRequest
from app.models.serializers import serialize_doc, serialize_list
from app.rag.retriever import get_full_document_text
from app.agents.risk_analyzer_agent import analyze_contract_risk, RiskAnalysisError

router = APIRouter(prefix="/api/risk", tags=["Contract Risk Analyzer"])


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")


@router.post("/analyze", response_model=dict)
async def analyze_contract(
    payload: AnalyzeContractRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Runs the risk analyzer on a document that was already uploaded via
    /api/chat/upload-document (so its chunks already exist in MongoDB).
    """
    owner_id = current_user["_id"]

    full_text = await get_full_document_text(db, owner_id, payload.filename)
    if not full_text.strip():
        raise HTTPException(
            status_code=404,
            detail=f"No content found for '{payload.filename}'. Upload it first via the document upload feature.",
        )

    if payload.client_id:
        client_doc = await db.clients.find_one({"_id": to_object_id(payload.client_id), "owner_id": owner_id})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Client not found")

    try:
        analysis = await analyze_contract_risk(full_text)
    except RiskAnalysisError as exc:
        # A clean, predictable error for the frontend instead of a raw 500 —
        # this happens if no GROQ_API_KEY is set, or the LLM's output couldn't
        # be parsed as valid JSON even after our cleanup attempts.
        raise HTTPException(status_code=502, detail="Internal server error")

    report_doc = {
        "owner_id": owner_id,
        "filename": payload.filename,
        "client_id": to_object_id(payload.client_id) if payload.client_id else None,
        "overall_risk_level": analysis["overall_risk_level"],
        "summary": analysis["summary"],
        "flags": analysis["flags"],
        "missing_clauses": analysis["missing_clauses"],
        "analyzed_at": datetime.utcnow(),
    }

    # Replace any previous report for this exact filename (re-analyzing
    # should update the existing report, not pile up duplicates).
    await db.contract_risk_reports.delete_many({"owner_id": owner_id, "filename": payload.filename})
    result = await db.contract_risk_reports.insert_one(report_doc)
    report_doc["_id"] = result.inserted_id

    return serialize_doc(report_doc)


@router.get("/reports", response_model=list)
async def list_risk_reports(current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    cursor = db.contract_risk_reports.find({"owner_id": current_user["_id"]}).sort("analyzed_at", -1)
    reports = await cursor.to_list(length=200)
    return serialize_list(reports)


@router.get("/reports/{report_id}", response_model=dict)
async def get_risk_report(report_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    report = await db.contract_risk_reports.find_one({
        "_id": to_object_id(report_id),
        "owner_id": current_user["_id"],
    })
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return serialize_doc(report)


@router.delete("/reports/{report_id}")
async def delete_risk_report(report_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    result = await db.contract_risk_reports.delete_one({
        "_id": to_object_id(report_id),
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"message": "Report deleted successfully"}