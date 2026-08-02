"""
Late Payment Escalation Agent — API routes.

GET  /api/escalation/overview          → all overdue invoices with escalation stage
POST /api/escalation/generate/{inv_id} → generate escalation document for one invoice
POST /api/escalation/log-sent/{inv_id} → log that a document was sent
GET  /api/escalation/history           → list all escalation documents sent
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime, date
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.escalation_agent import (
    get_all_escalations, generate_escalation_document,
    _get_escalation_stage, _calculate_late_fee
)

router = APIRouter(prefix="/api/escalation", tags=["Payment Escalation Agent"])


class GenerateDocRequest(BaseModel):
    stage: Optional[int] = None  # override auto-detected stage


class LogSentRequest(BaseModel):
    stage: int
    method: str = "email"  # "email" | "whatsapp" | "post"
    notes: str = ""


@router.get("/overview")
async def get_escalation_overview(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    THE PIPELINE ENTRY POINT.
    Scans all overdue invoices, determines escalation stage for each,
    returns ranked list sorted by urgency.
    SYNC: reads invoices + reminders + clients + profiles + contracts + disputes.
    """
    try:
        escalations = await get_all_escalations(db, current_user["_id"])
        total_overdue = sum(e["amount"] for e in escalations)
        total_with_fees = sum(e["total_due"] for e in escalations)

        stage_counts = {}
        for e in escalations:
            label = e["stage_label"]
            stage_counts[label] = stage_counts.get(label, 0) + 1

        return {
            "escalations": escalations,
            "total_overdue_amount": round(total_overdue, 2),
            "total_with_late_fees": round(total_with_fees, 2),
            "total_count": len(escalations),
            "stage_breakdown": stage_counts,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/generate/{invoice_id}")
async def generate_document(
    invoice_id: str,
    payload: GenerateDocRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Generates the correct escalation document for one invoice.
    SYNC: cross-references contracts, meetings, reminders, client profile.
    """
    owner_id = current_user["_id"]
    freelancer_name = current_user.get("name", "Freelancer")
    business_name = current_user.get("business_name", "My Business")

    invoice = await db.invoices.find_one({
        "_id": ObjectId(invoice_id),
        "owner_id": owner_id,
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    today = date.today()
    due_date_str = invoice.get("due_date", "")
    if not due_date_str:
        raise HTTPException(status_code=400, detail="Invoice has no due date set.")

    try:
        due_date_obj = date.fromisoformat(due_date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid due date format.")

    days_overdue = (today - due_date_obj).days
    if days_overdue <= 0:
        raise HTTPException(status_code=400, detail="This invoice is not yet overdue.")

    invoice["days_overdue"] = days_overdue
    stage = payload.stage or _get_escalation_stage(days_overdue)["stage"]

    # SYNC: gather all related data
    client = {}
    if invoice.get("client_id"):
        client_doc = await db.clients.find_one({"_id": invoice["client_id"]})
        if client_doc:
            client = dict(client_doc)

    contracts = []
    meetings = []
    reminders = []
    if invoice.get("client_id"):
        con_cursor = db.contracts.find({"client_id": invoice["client_id"], "owner_id": owner_id})
        contracts = await con_cursor.to_list(length=3)

        meet_cursor = db.meetings.find({"client_id": invoice["client_id"], "owner_id": owner_id})
        meetings = await meet_cursor.to_list(length=3)

        reminders = await db.whatsapp_reminders.find(
            {"invoice_id": invoice["_id"], "owner_id": owner_id}
        ).to_list(length=20)

    try:
        doc = await generate_escalation_document(
            stage=stage,
            invoice=invoice,
            client=client,
            contracts=contracts,
            meetings=meetings,
            reminders=reminders,
            freelancer_name=freelancer_name,
            business_name=business_name,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    return doc


@router.post("/log-sent/{invoice_id}")
async def log_escalation_sent(
    invoice_id: str,
    payload: LogSentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Records that an escalation document was sent."""
    record = {
        "owner_id": current_user["_id"],
        "invoice_id": ObjectId(invoice_id),
        "stage": payload.stage,
        "method": payload.method,
        "notes": payload.notes,
        "sent_at": datetime.utcnow(),
        "sent_date": str(date.today()),
    }
    result = await db.escalation_logs.insert_one(record)
    record["_id"] = result.inserted_id
    return serialize_doc(record)


@router.get("/history")
async def get_escalation_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.escalation_logs.find(
        {"owner_id": current_user["_id"]}
    ).sort("sent_at", -1)
    records = await cursor.to_list(length=200)
    return serialize_list(records)