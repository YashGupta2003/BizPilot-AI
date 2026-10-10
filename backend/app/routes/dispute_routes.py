from app.core.exceptions import parse_object_id
"""
AI Invoice Dispute Resolver — API routes.

SYNCHRONIZATION:
- Reads invoices, contracts, meetings, reminders, client_profiles
  all linked by client_id — the full data pipeline in one call.
- Saves dispute record to 'disputes' collection for history.
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.dispute_agent import analyze_dispute, DisputeAnalysisError

router = APIRouter(prefix="/api/disputes", tags=["Dispute Resolver"])


class ResolveDisputeRequest(BaseModel):
    dispute_message: str
    client_id: Optional[str] = None
    client_name: Optional[str] = None


@router.post("/resolve")
async def resolve_dispute(
    payload: ResolveDisputeRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    THE INTEGRATION ENDPOINT.
    Reads from invoices + contracts + meetings + reminders + client_profiles
    all at once, passes everything to the AI, returns a complete dispute
    resolution package: analysis + professional response + escalation option.
    """
    owner_id = current_user["_id"]
    freelancer_name = current_user.get("name", "Freelancer")
    client_name = payload.client_name or "Client"

    # Resolve client
    client_id_obj = None
    if payload.client_id:
        try:
            client_id_obj = parse_object_id(payload.client_id)
            client_doc = await db.clients.find_one({
                "_id": client_id_obj,
                "owner_id": owner_id,
            })
            if client_doc:
                client_name = client_doc.get("name", client_name)
        except Exception:
            pass

    # SYNC: Gather all data for this client across all features
    invoices = []
    contracts = []
    meetings = []
    reminders = []
    client_profile = None

    if client_id_obj:
        # Invoices
        inv_cursor = db.invoices.find({
            "client_id": client_id_obj,
            "owner_id": owner_id,
        }).sort("created_at", -1)
        invoices = await inv_cursor.to_list(length=10)

        # Contracts
        con_cursor = db.contracts.find({
            "client_id": client_id_obj,
            "owner_id": owner_id,
        }).sort("created_at", -1)
        contracts = await con_cursor.to_list(length=3)

        # Meeting notes
        meet_cursor = db.meetings.find({
            "client_id": client_id_obj,
            "owner_id": owner_id,
        }).sort("created_at", -1)
        meetings = await meet_cursor.to_list(length=5)

        # Reminder history
        invoice_ids = [inv["_id"] for inv in invoices]
        rem_cursor = db.whatsapp_reminders.find({
            "invoice_id": {"$in": invoice_ids},
            "owner_id": owner_id,
        }).sort("sent_at", -1)
        reminders = await rem_cursor.to_list(length=10)

        # Client risk profile (most recent)
        client_profile = await db.client_profiles.find_one({
            "client_id": client_id_obj,
            "owner_id": owner_id,
        }, sort=[("analyzed_at", -1)])
    else:
        # No client_id — just grab recent invoices by name matching
        import re
        inv_cursor = db.invoices.find({
            "owner_id": owner_id,
            "client_name": {"$regex": re.escape(client_name), "$options": "i"},
        }).sort("created_at", -1)
        invoices = await inv_cursor.to_list(length=5)

    try:
        analysis = await analyze_dispute(
            dispute_message=payload.dispute_message,
            invoices=[dict(inv) for inv in invoices],
            contracts=[dict(c) for c in contracts],
            meetings=[dict(m) for m in meetings],
            reminders=[dict(r) for r in reminders],
            client_profile=dict(client_profile) if client_profile else None,
            client_name=client_name,
            freelancer_name=freelancer_name,
        )
    except DisputeAnalysisError as exc:
        raise HTTPException(status_code=502, detail="Internal server error")

    # Save dispute record
    record = {
        "owner_id": owner_id,
        "client_id": client_id_obj,
        "client_name": client_name,
        "dispute_message": payload.dispute_message,
        "analysis": analysis,
        "invoices_referenced": len(invoices),
        "contracts_referenced": len(contracts),
        "meetings_referenced": len(meetings),
        "created_at": datetime.utcnow(),
    }
    result = await db.disputes.insert_one(record)
    record["_id"] = result.inserted_id

    return {**serialize_doc(record), "analysis": analysis}


@router.get("/history")
async def list_disputes(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.disputes.find(
        {"owner_id": current_user["_id"]}
    ).sort("created_at", -1)
    records = await cursor.to_list(length=100)
    return serialize_list(records)


@router.delete("/{dispute_id}")
async def delete_dispute(
    dispute_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    result = await db.disputes.delete_one({
        "_id": parse_object_id(dispute_id),
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dispute not found.")
    return {"message": "Dispute deleted."}