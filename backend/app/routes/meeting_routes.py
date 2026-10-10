from app.core.exceptions import parse_object_id
"""
Meeting Notes → Deliverable Extractor — API routes.

SYNCHRONIZATION:
- POST /api/meetings/extract      → extract + generate email + create invoice draft
- GET  /api/meetings/list         → list past meetings
- GET  /api/meetings/{id}         → get one meeting
- DELETE /api/meetings/{id}       → delete meeting
"""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_database
from app.core.deps import get_current_user
from app.models.serializers import serialize_doc, serialize_list
from app.agents.meeting_agent import (
    extract_meeting_data, generate_scope_email, MeetingExtractionError
)
from app.services.invoice_service import (
    generate_invoice_number, calculate_invoice_totals
)

router = APIRouter(prefix="/api/meetings", tags=["Meeting Notes Extractor"])


class ExtractMeetingRequest(BaseModel):
    notes: str
    client_id: Optional[str] = None


@router.post("/extract")
async def extract_meeting(
    payload: ExtractMeetingRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """
    Full pipeline:
    1. AI extracts deliverables, price, timeline from raw notes
    2. Generates professional scope confirmation email
    3. Creates a DRAFT invoice with extracted line items (SYNC with invoices)
    4. Updates client notes if client_id provided (SYNC with clients)
    5. Saves meeting record to MongoDB
    """
    if len(payload.notes.strip()) < 20:
        raise HTTPException(status_code=400, detail="Please provide more meeting notes.")

    try:
        extracted = await extract_meeting_data(payload.notes)
    except MeetingExtractionError as exc:
        raise HTTPException(status_code=502, detail="Internal server error")

    freelancer_name = current_user.get("name", "Freelancer")
    business_name = current_user.get("business_name", "My Business")
    scope_email = await generate_scope_email(extracted, freelancer_name, business_name)

    # SYNC: resolve client_id
    client_id_obj = None
    client_name = extracted.get("client_name") or "Unknown Client"
    invoice_id = None
    invoice_number = None

    if payload.client_id:
        client_doc = await db.clients.find_one({
            "_id": parse_object_id(payload.client_id),
            "owner_id": current_user["_id"],
        })
        
        if client_doc:
            client_id_obj = client_doc["_id"]
            client_name = client_doc.get("name", client_name)

            # SYNC: Update client notes with meeting summary
            existing_notes = client_doc.get("notes", "") or ""
            meeting_note = f"\n\n[Meeting {datetime.utcnow().strftime('%Y-%m-%d')}] {extracted.get('meeting_summary', '')}"
            await db.clients.update_one(
                {"_id": client_id_obj},
                {"$set": {"notes": existing_notes + meeting_note}}
            )

    # SYNC: Auto-create draft invoice from extracted deliverables
    deliverables = extracted.get("deliverables", [])
    total_price = extracted.get("total_price_agreed")

    if deliverables and client_id_obj:
        invoice_items = []
        if total_price and len(deliverables) > 0:
            # Distribute total price across deliverables evenly
            from decimal import Decimal
            per_item = float(round(Decimal(str(total_price)) / Decimal(str(len(deliverables))), 2))
            for d in deliverables:
                invoice_items.append({
                    "description": d["item"],
                    "quantity": d.get("quantity", 1),
                    "rate": per_item,
                    "amount": float(Decimal(str(per_item)) * Decimal(str(d.get("quantity", 1)))),
                })
        else:
            for d in deliverables:
                rate = 0
                if d.get("estimated_hours") and extracted.get("hourly_rate"):
                    from decimal import Decimal
                    rate = float(Decimal(str(d["estimated_hours"])) * Decimal(str(extracted["hourly_rate"])))
                from decimal import Decimal
                invoice_items.append({
                    "description": d["item"],
                    "quantity": d.get("quantity", 1),
                    "rate": rate,
                    "amount": float(Decimal(str(rate)) * Decimal(str(d.get("quantity", 1)))),
                })

        if invoice_items:
            invoice_number = await generate_invoice_number(db, current_user["_id"])
            totals = calculate_invoice_totals(invoice_items, 0)
            invoice_doc = {
                "owner_id": current_user["_id"],
                "client_id": client_id_obj,
                "client_name": client_name,
                "invoice_number": invoice_number,
                "items": totals["items"],
                "subtotal": totals["subtotal"],
                "tax_percent": 0,
                "tax_amount": 0,
                "total": totals["total"],
                "currency": extracted.get("currency", "INR"),
                "status": "draft",
                "issue_date": str(datetime.utcnow().date()),
                "due_date": extracted.get("project_deadline"),
                "notes": f"Auto-created from meeting on {datetime.utcnow().strftime('%Y-%m-%d')}. {extracted.get('meeting_summary', '')}",
                "created_at": datetime.utcnow(),
            }
            inv_result = await db.invoices.insert_one(invoice_doc)
            invoice_id = str(inv_result.inserted_id)

    # Save meeting record
    meeting_doc = {
        "owner_id": current_user["_id"],
        "client_id": client_id_obj,
        "client_name": client_name,
        "raw_notes": payload.notes[:3000],
        "extracted": extracted,
        "scope_email": scope_email,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
        "created_at": datetime.utcnow(),
    }
    result = await db.meetings.insert_one(meeting_doc)
    meeting_doc["_id"] = result.inserted_id

    return {
        **serialize_doc(meeting_doc),
        "extracted": extracted,
        "scope_email": scope_email,
        "invoice_id": invoice_id,
        "invoice_number": invoice_number,
    }


@router.get("/list")
async def list_meetings(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.meetings.find({"owner_id": current_user["_id"]}).sort("created_at", -1)
    records = await cursor.to_list(length=100)
    return serialize_list(records)


@router.get("/{meeting_id}")
async def get_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    record = await db.meetings.find_one({
        "_id": parse_object_id(meeting_id),
        "owner_id": current_user["_id"],
    })
    if not record:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return serialize_doc(record)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    result = await db.meetings.delete_one({
        "_id": parse_object_id(meeting_id),
        "owner_id": current_user["_id"],
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meeting not found.")
    return {"message": "Meeting deleted."}