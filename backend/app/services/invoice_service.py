"""
Invoice business logic, separated from the route handlers (clean architecture pattern:
routes handle HTTP, services handle business rules, this keeps things testable).
"""
from datetime import datetime, timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
import os


async def generate_invoice_number(db, owner_id: str) -> str:
    """
    Creates consecutive invoice numbers like INV/2026-27/0001 atomically.
    """
    from app.utils import ist_today, get_indian_fy
    from app.core.exceptions import parse_object_id
    from pymongo import ReturnDocument
    
    today = ist_today()
    fy = get_indian_fy(today)
    owner_obj_id = parse_object_id(str(owner_id))
    
    counter = await db.counters.find_one_and_update(
        {"owner_id": owner_obj_id, "fy": fy},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    
    seq = counter["seq"]
    return f"INV/{fy}/{seq:04d}"


from decimal import Decimal, ROUND_HALF_UP

def to_paise(amount: float | Decimal | int) -> int:
    return int((Decimal(str(amount)) * Decimal('100')).quantize(Decimal('1'), rounding=ROUND_HALF_UP))

def from_paise(paise: int) -> float:
    return float((Decimal(str(paise)) / Decimal('100')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

def calculate_invoice_totals(items: list, tax_percent: float) -> dict:
    """items is a list of dicts with quantity, rate."""
    subtotal_paise = 0
    computed_items = []
    
    # Convert tax percent to decimal
    tax_rate = Decimal(str(tax_percent)) / Decimal("100")
    
    for item in items:
        qty = Decimal(str(item["quantity"]))
        rate = Decimal(str(item["rate"]))
        amount = (qty * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        amount_paise = to_paise(amount)
        computed_items.append({**item, "amount": from_paise(amount_paise), "amount_paise": amount_paise})
        subtotal_paise += amount_paise

    subtotal_dec = Decimal(str(subtotal_paise)) / Decimal('100')
    tax_amount = (subtotal_dec * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    tax_amount_paise = to_paise(tax_amount)
    
    total_paise = subtotal_paise + tax_amount_paise

    return {
        "items": computed_items,
        "subtotal": from_paise(subtotal_paise),
        "subtotal_paise": subtotal_paise,
        "tax_amount": from_paise(tax_amount_paise),
        "tax_amount_paise": tax_amount_paise,
        "total": from_paise(total_paise),
        "total_paise": total_paise,
    }

def effective_status(invoice: dict, today_ist: date) -> str:
    status = invoice.get("status", "draft")
    if status in ("sent", "partially_paid"):
        due_date_str = invoice.get("due_date")
        balance_due = invoice.get("balance_due", 0)
        
        if due_date_str and balance_due > 0:
            try:
                due_date_obj = date.fromisoformat(due_date_str)
                if due_date_obj < today_ist:
                    return "overdue"
            except ValueError:
                pass
    return status

def generate_invoice_pdf(invoice: dict, business_name: str, output_dir: str) -> str:
    """
    Creates a simple professional PDF invoice using reportlab.
    Returns the file path of the generated PDF.
    """
    import tempfile
    
    owner_dir = os.path.join(output_dir, str(invoice["owner_id"]))
    os.makedirs(owner_dir, exist_ok=True)
    filepath = os.path.join(owner_dir, f"{invoice['invoice_number']}.pdf")
    temp_fd, temp_path = tempfile.mkstemp(dir=owner_dir, suffix=".pdf")
    os.close(temp_fd)

    c = canvas.Canvas(temp_path, pagesize=A4)
    width, height = A4

    # Header
    c.setFont("Helvetica-Bold", 20)
    c.drawString(20 * mm, height - 25 * mm, business_name)
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, height - 32 * mm, "Invoice")

    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 20 * mm, height - 25 * mm, invoice["invoice_number"])
    c.setFont("Helvetica", 10)
    c.drawRightString(width - 20 * mm, height - 32 * mm, f"Issue date: {invoice['issue_date']}")
    if invoice.get("due_date"):
        c.drawRightString(width - 20 * mm, height - 38 * mm, f"Due date: {invoice['due_date']}")

    # Client
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20 * mm, height - 50 * mm, "Billed to:")
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, height - 56 * mm, invoice["client_name"])

    # Table header
    y = height - 75 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Description")
    c.drawString(120 * mm, y, "Qty")
    c.drawString(140 * mm, y, "Rate")
    c.drawString(165 * mm, y, "Amount")
    c.line(20 * mm, y - 2 * mm, width - 20 * mm, y - 2 * mm)

    # Table rows
    c.setFont("Helvetica", 10)
    y -= 8 * mm
    for item in invoice["items"]:
        if y < 40 * mm:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - 40 * mm
        c.drawString(20 * mm, y, str(item["description"])[:55])
        c.drawString(120 * mm, y, str(item["quantity"]))
        c.drawString(140 * mm, y, f"{item['rate']:.2f}")
        c.drawString(165 * mm, y, f"{item['amount']:.2f}")
        y -= 7 * mm

    # Totals
    y -= 5 * mm
    c.line(120 * mm, y, width - 20 * mm, y)
    y -= 7 * mm
    c.drawString(140 * mm, y, "Subtotal:")
    c.drawString(165 * mm, y, f"{invoice['subtotal']:.2f}")
    y -= 7 * mm
    c.drawString(140 * mm, y, f"Tax ({invoice['tax_percent']}%):")
    c.drawString(165 * mm, y, f"{invoice['tax_amount']:.2f}")
    y -= 7 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(140 * mm, y, "Total:")
    currency_str = invoice.get("currency", "").replace("₹", "Rs.")
    c.drawString(165 * mm, y, f"{currency_str} {invoice['total']:.2f}")

    if invoice.get("notes"):
        y -= 15 * mm
        c.setFont("Helvetica", 9)
        c.drawString(20 * mm, y, f"Notes: {invoice['notes']}")

    c.save()
    os.replace(temp_path, filepath)
    return filepath
