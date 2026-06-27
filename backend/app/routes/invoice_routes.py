"""
Invoice routes — combines MongoDB CRUD with the agentic AI invoice extractor.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from datetime import datetime, date
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_database
from app.core.deps import get_current_user, get_current_user_from_header_or_query
from app.schemas.invoice_schema import InvoiceCreate, InvoiceGenerateFromText, InvoiceStatusUpdate
from app.models.serializers import serialize_doc
from app.services.invoice_service import generate_invoice_number, calculate_invoice_totals, generate_invoice_pdf
from app.agents.invoice_agent import extract_invoice_items

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


def to_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid ID format")


async def _create_invoice_document(db, current_user, client_id: str, items: list, due_date, tax_percent: float, notes: str | None):
    client = await db.clients.find_one({"_id": to_object_id(client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    totals = calculate_invoice_totals(items, tax_percent)
    invoice_number = await generate_invoice_number(db, current_user["_id"])

    invoice_doc = {
        "owner_id": current_user["_id"],
        "client_id": client["_id"],
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "items": totals["items"],
        "subtotal": totals["subtotal"],
        "tax_percent": tax_percent,
        "tax_amount": totals["tax_amount"],
        "total": totals["total"],
        "currency": "INR",
        "status": "draft",
        "issue_date": str(date.today()),
        "due_date": str(due_date) if due_date else None,
        "notes": notes,
        "created_at": datetime.utcnow(),
    }

    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["_id"] = result.inserted_id
    return serialize_doc(invoice_doc)


@router.post("", response_model=dict)
async def create_invoice(payload: InvoiceCreate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    items = [item.model_dump() for item in payload.items]
    return await _create_invoice_document(
        db, current_user, payload.client_id, items, payload.due_date, payload.tax_percent, payload.notes
    )


@router.post("/generate-from-text", response_model=dict)
async def generate_invoice_from_text(payload: InvoiceGenerateFromText, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    """
    THE AGENTIC AI ENDPOINT.
    User sends: "3 hours of logo design for client at 1500/hr"
    We extract structured items via LLM, then create the invoice automatically.
    """
    client = await db.clients.find_one({"_id": to_object_id(payload.client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    items = await extract_invoice_items(payload.description, default_rate=client.get("default_rate"))

    return await _create_invoice_document(
        db, current_user, payload.client_id, items, payload.due_date, tax_percent=0, notes=payload.description
    )


@router.get("", response_model=list)
async def list_invoices(status: str | None = None, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    query = {"owner_id": current_user["_id"]}
    if status:
        query["status"] = status

    # sort(-1) on created_at = newest first
    cursor = db.invoices.find(query).sort("created_at", -1)
    invoices = await cursor.to_list(length=500)
    return [serialize_doc(inv) for inv in invoices]


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": to_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_doc(invoice)


@router.patch("/{invoice_id}/status", response_model=dict)
async def update_invoice_status(invoice_id: str, payload: InvoiceStatusUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    updated = await db.invoices.find_one_and_update(
        {"_id": to_object_id(invoice_id), "owner_id": current_user["_id"]},
        {"$set": {"status": payload.status}},
        return_document=True
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return serialize_doc(updated)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user_from_header_or_query), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": to_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_out = serialize_doc(invoice)
    filepath = generate_invoice_pdf(invoice_out, current_user.get("business_name", "My Business"), "data/invoices")
    return FileResponse(filepath, filename=f"{invoice_out['invoice_number']}.pdf", media_type="application/pdf")


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    result = await db.invoices.delete_one({"_id": to_object_id(invoice_id), "owner_id": current_user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}
