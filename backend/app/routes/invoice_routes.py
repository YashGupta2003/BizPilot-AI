from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from datetime import datetime, date, timezone
from bson import ObjectId

from app.core.database import get_database
from app.core.deps import get_current_user, get_current_user_or_signed_url
from app.core.exceptions import parse_object_id
from app.schemas.invoice_schema import InvoiceCreate, InvoiceGenerateFromText, InvoiceStatusUpdate
from app.models.serializers import serialize_doc
from app.services.invoice_service import generate_invoice_number, calculate_invoice_totals, generate_invoice_pdf, effective_status, from_paise
from app.agents.invoice_agent import extract_invoice_items
from app.utils import ist_today

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


async def _create_invoice_document(db, current_user, client_id: str, items: list, due_date, tax_percent: float, notes: str | None, currency: str = "INR"):
    client = await db.clients.find_one({"_id": parse_object_id(client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    totals = calculate_invoice_totals(items, tax_percent)
    invoice_number = await generate_invoice_number(db, current_user["_id"])
    
    total_paise = totals["total_paise"]

    invoice_doc = {
        "owner_id": current_user["_id"],
        "client_id": client["_id"],
        "client_name": client["name"],
        "invoice_number": invoice_number,
        "items": totals["items"],
        
        # New paise amounts
        "subtotal_paise": totals["subtotal_paise"],
        "tax_percent": tax_percent,
        "tax_amount_paise": totals["tax_amount_paise"],
        "total_paise": total_paise,
        "amount_paid_paise": 0,
        "balance_due_paise": total_paise,
        
        # Legacy float fields (for backward compatibility)
        "subtotal": totals["subtotal"],
        "tax_amount": totals["tax_amount"],
        "total": totals["total"],
        "amount_paid": 0.0,
        "balance_due": totals["total"],
        
        "currency": currency,
        "status": "draft",
        "issue_date": str(ist_today()),
        "due_date": str(due_date) if due_date else None,
        "notes": notes,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.invoices.insert_one(invoice_doc)
    invoice_doc["_id"] = result.inserted_id
    
    out = serialize_doc(invoice_doc)
    out["status"] = effective_status(invoice_doc, ist_today())
    return out


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_invoice(payload: InvoiceCreate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    items = [item.model_dump() for item in payload.items]
    return await _create_invoice_document(
        db, current_user, payload.client_id, items, payload.due_date, payload.tax_percent, payload.notes, payload.currency
    )


@router.post("/generate-from-text", response_model=dict)
async def generate_invoice_from_text(payload: InvoiceGenerateFromText, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    client = await db.clients.find_one({"_id": parse_object_id(payload.client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    items = await extract_invoice_items(payload.description, default_rate=client.get("default_rate"))

    return await _create_invoice_document(
        db, current_user, payload.client_id, items, payload.due_date, tax_percent=0, notes=payload.description
    )


@router.get("", response_model=list)
async def list_invoices(status: str | None = None, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    query = {"owner_id": current_user["_id"]}
    cursor = db.invoices.find(query).sort("created_at", -1)
    invoices = await cursor.to_list(length=500)
    
    today = ist_today()
    results = []
    for inv in invoices:
        inv["status"] = effective_status(inv, today)
        if status and inv["status"] != status:
            continue
        results.append(serialize_doc(inv))
        
    return results


@router.get("/{invoice_id}", response_model=dict)
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice["status"] = effective_status(invoice, ist_today())
    return serialize_doc(invoice)


@router.patch("/{invoice_id}/status", response_model=dict)
async def update_invoice_status(invoice_id: str, payload: InvoiceStatusUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    current_status = invoice.get("status")
    new_status = payload.status
    
    # Simple state machine
    valid_transitions = {
        "draft": ["sent", "cancelled"],
        "sent": ["cancelled"], # paid and partially_paid are handled by payments
        "partially_paid": ["cancelled"],
        "paid": [],
        "cancelled": []
    }
    
    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(status_code=400, detail=f"Cannot transition from {current_status} to {new_status}")
        
    updated = await db.invoices.find_one_and_update(
        {"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]},
        {"$set": {"status": new_status}},
        return_document=True
    )
    
    updated["status"] = effective_status(updated, ist_today())
    return serialize_doc(updated)


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, current_user: dict = Depends(get_current_user_or_signed_url), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice_out = serialize_doc(invoice)
    # Ensure owner_id is in invoice_out for tempfile generation
    invoice_out["owner_id"] = str(current_user["_id"])
    
    filepath = generate_invoice_pdf(invoice_out, current_user.get("business_name", "My Business"), "data/invoices")
    return FileResponse(filepath, filename=f"{invoice_out['invoice_number']}.pdf", media_type="application/pdf")


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be deleted")
        
    await db.invoices.delete_one({"_id": invoice["_id"]})
    return {"message": "Invoice deleted successfully"}

@router.put("/{invoice_id}", response_model=dict)
async def update_draft_invoice(invoice_id: str, payload: InvoiceCreate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.get("status") != "draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be edited")
        
    client = await db.clients.find_one({"_id": parse_object_id(payload.client_id), "owner_id": current_user["_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    items = [item.model_dump() for item in payload.items]
    totals = calculate_invoice_totals(items, payload.tax_percent)
    total_paise = totals["total_paise"]

    update_fields = {
        "client_id": client["_id"],
        "client_name": client["name"],
        "items": totals["items"],
        "subtotal_paise": totals["subtotal_paise"],
        "tax_percent": payload.tax_percent,
        "tax_amount_paise": totals["tax_amount_paise"],
        "total_paise": total_paise,
        "balance_due_paise": total_paise,
        "subtotal": totals["subtotal"],
        "tax_amount": totals["tax_amount"],
        "total": totals["total"],
        "balance_due": totals["total"],
        "currency": payload.currency,
        "due_date": str(payload.due_date) if payload.due_date else None,
        "notes": payload.notes,
        "updated_at": datetime.now(timezone.utc),
    }

    updated = await db.invoices.find_one_and_update(
        {"_id": invoice["_id"]},
        {"$set": update_fields},
        return_document=True
    )
    
    updated["status"] = effective_status(updated, ist_today())
    return serialize_doc(updated)

from pydantic import BaseModel

class PaymentCreate(BaseModel):
    amount: float
    method: str
    note: str | None = None
    paid_at: date | None = None

@router.post("/{invoice_id}/payments", response_model=dict)
async def add_payment(invoice_id: str, payload: PaymentCreate, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    from app.services.invoice_service import to_paise
    
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.get("status") in ("draft", "cancelled"):
        raise HTTPException(status_code=400, detail="Cannot add payment to draft or cancelled invoices")
        
    amount_paise = to_paise(payload.amount)
    if amount_paise <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
        
    balance = invoice.get("balance_due_paise", 0)
    if amount_paise > balance:
        raise HTTPException(status_code=400, detail=f"Amount exceeds balance due ({from_paise(balance)})")
        
    payment = {
        "invoice_id": invoice["_id"],
        "owner_id": current_user["_id"],
        "amount_paise": amount_paise,
        "method": payload.method,
        "note": payload.note,
        "paid_at": str(payload.paid_at) if payload.paid_at else str(ist_today()),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.payments.insert_one(payment)
    
    new_paid = invoice.get("amount_paid_paise", 0) + amount_paise
    new_balance = invoice.get("total_paise", 0) - new_paid
    new_status = "paid" if new_balance == 0 else "partially_paid"
    
    updated = await db.invoices.find_one_and_update(
        {"_id": invoice["_id"]},
        {
            "$set": {
                "amount_paid_paise": new_paid,
                "balance_due_paise": new_balance,
                "amount_paid": from_paise(new_paid),
                "balance_due": from_paise(new_balance),
                "status": new_status
            }
        },
        return_document=True
    )
    
    updated["status"] = effective_status(updated, ist_today())
    return serialize_doc(updated)

@router.get("/{invoice_id}/payments", response_model=list)
async def get_payments(invoice_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_database)):
    # Verify invoice belongs to user
    invoice = await db.invoices.find_one({"_id": parse_object_id(invoice_id), "owner_id": current_user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    cursor = db.payments.find({"invoice_id": invoice["_id"]}).sort("created_at", -1)
    payments = await cursor.to_list(length=100)
    
    results = []
    for p in payments:
        doc = serialize_doc(p)
        doc["amount"] = from_paise(p["amount_paise"])
        results.append(doc)
    return results
