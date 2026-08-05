"""
Invoice business logic, separated from the route handlers (clean architecture pattern:
routes handle HTTP, services handle business rules, this keeps things testable).
"""
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
import os


async def generate_invoice_number(db, owner_id) -> str:
    """
    Creates invoice numbers like INV-2026-0001, incrementing per user per year.
    CONCEPT: We count existing invoices for this user this year using count_documents.
    """
    year = datetime.utcnow().year
    count = await db.invoices.count_documents({
        "owner_id": owner_id,
        "invoice_number": {"$regex": f"^INV-{year}-"}
    })
    next_number = count + 1
    return f"INV-{year}-{next_number:04d}"


def calculate_invoice_totals(items: list, tax_percent: float) -> dict:
    """items is a list of dicts with quantity, rate (amount computed here)."""
    from decimal import Decimal, ROUND_HALF_UP
    subtotal = Decimal("0")
    computed_items = []
    
    # Convert tax percent to decimal
    tax_rate = Decimal(str(tax_percent)) / Decimal("100")
    
    for item in items:
        qty = Decimal(str(item["quantity"]))
        rate = Decimal(str(item["rate"]))
        amount = (qty * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        computed_items.append({**item, "amount": float(amount)})
        subtotal += amount

    tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total = (subtotal + tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "items": computed_items,
        "subtotal": float(subtotal),
        "tax_amount": float(tax_amount),
        "total": float(total),
    }


def generate_invoice_pdf(invoice: dict, business_name: str, output_dir: str) -> str:
    """
    Creates a simple professional PDF invoice using reportlab.
    Returns the file path of the generated PDF.
    """
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, f"{invoice['invoice_number']}.pdf")

    c = canvas.Canvas(filepath, pagesize=A4)
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
    c.drawString(165 * mm, y, f"{invoice['currency']} {invoice['total']:.2f}")

    if invoice.get("notes"):
        y -= 15 * mm
        c.setFont("Helvetica", 9)
        c.drawString(20 * mm, y, f"Notes: {invoice['notes']}")

    c.save()
    return filepath
