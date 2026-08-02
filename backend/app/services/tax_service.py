"""
Freelancer Tax Filing Assistant — India Specific.

SYNCHRONIZATION — reads from ALL existing collections:
- invoices      → total revenue, GST collected, TDS deducted
- clients       → client PAN for TDS tracking (if stored in notes)
- contracts     → payment terms, currency for export determination
- currency data → foreign currency invoices = export = 0% GST

TAX RULES IMPLEMENTED (FY 2024-25):
1. ADVANCE TAX (Section 208, IT Act)
   - Due if tax liability > ₹10,000 in a year
   - Installments: 15 Jun (15%), 15 Sep (45%), 15 Dec (75%), 15 Mar (100%)
   - Tax rate: 30% on income above ₹10L (new regime) or slab-based (old)
   - Freelancers use Section 44ADA (presumptive) if turnover < ₹75L:
     50% of gross receipts = presumptive income

2. GST (Goods and Services Tax)
   - Registration required if turnover > ₹20L (services)
   - Quarterly filing if turnover < ₹5Cr (QRMP scheme)
   - Rate: 18% for most freelance services (SAC 9983)
   - Export/foreign currency invoices: 0% (zero-rated)
   - Filing dates: 22nd/24th of month after quarter end

3. TDS (Tax Deducted at Source)
   - Section 194J: Professional services — 10% TDS
   - Section 194C: Contractors — 1-2% TDS
   - Companies deduct TDS before paying freelancers
   - Freelancer must track to claim credit in ITR

4. FORM 26AS
   - Annual Tax Statement — shows all TDS deducted
   - Must reconcile with your records before filing ITR
"""
import numpy as np
from datetime import datetime, date, timedelta
from typing import Optional


# ── FINANCIAL YEAR UTILITIES ─────────────────────────────────────

def get_current_fy() -> tuple[int, int]:
    """Returns (start_year, end_year) for current Indian Financial Year."""
    today = date.today()
    if today.month >= 4:
        return today.year, today.year + 1
    else:
        return today.year - 1, today.year


def get_fy_dates(fy_start: int, fy_end: int) -> tuple[date, date]:
    return date(fy_start, 4, 1), date(fy_end, 3, 31)


def get_quarter_dates(fy_start: int, quarter: int) -> tuple[date, date, date]:
    """
    Returns (start, end, filing_due) for a given quarter.
    Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar
    """
    quarters = {
        1: (date(fy_start, 4, 1),  date(fy_start, 6, 30),  date(fy_start, 7, 22)),
        2: (date(fy_start, 7, 1),  date(fy_start, 9, 30),  date(fy_start, 10, 22)),
        3: (date(fy_start, 10, 1), date(fy_start, 12, 31), date(fy_start + 1, 1, 22)),
        4: (date(fy_start + 1, 1, 1), date(fy_start + 1, 3, 31), date(fy_start + 1, 4, 22)),
    }
    return quarters[quarter]


def get_current_quarter(fy_start: int) -> int:
    today = date.today()
    if date(fy_start, 4, 1) <= today <= date(fy_start, 6, 30):
        return 1
    elif date(fy_start, 7, 1) <= today <= date(fy_start, 9, 30):
        return 2
    elif date(fy_start, 10, 1) <= today <= date(fy_start, 12, 31):
        return 3
    else:
        return 4


ADVANCE_TAX_INSTALLMENTS = [
    {"installment": 1, "cumulative_percent": 15, "due_date_fn": lambda fy_start: date(fy_start, 6, 15), "label": "1st Installment"},
    {"installment": 2, "cumulative_percent": 45, "due_date_fn": lambda fy_start: date(fy_start, 9, 15), "label": "2nd Installment"},
    {"installment": 3, "cumulative_percent": 75, "due_date_fn": lambda fy_start: date(fy_start, 12, 15), "label": "3rd Installment"},
    {"installment": 4, "cumulative_percent": 100, "due_date_fn": lambda fy_start: date(fy_start + 1, 3, 15), "label": "4th Installment (Final)"},
]

GST_SLABS = {0: 0, 5: 0.05, 12: 0.12, 18: 0.18, 28: 0.28}
DEFAULT_GST_RATE = 18  # Most freelancer services


# ── DATA AGGREGATION ─────────────────────────────────────────────

async def aggregate_invoices_for_tax(db, owner_id, fy_start: int, fy_end: int) -> dict:
    """
    Aggregates all invoice data for a financial year.
    SYNC: reads invoices + clients collections.
    """
    fy_start_date = date(fy_start, 4, 1)
    fy_end_date = date(fy_end, 3, 31)
    fy_start_dt = datetime(fy_start, 4, 1)
    fy_end_dt = datetime(fy_end, 3, 31, 23, 59, 59)

    cursor = db.invoices.find({
        "owner_id": owner_id,
        "created_at": {"$gte": fy_start_dt, "$lte": fy_end_dt},
    })
    invoices = await cursor.to_list(length=2000)

    total_invoiced = 0
    total_received = 0
    gst_collected = 0
    tds_deducted_estimate = 0
    foreign_currency_revenue = 0
    inr_revenue = 0

    quarterly_revenue = {1: 0, 2: 0, 3: 0, 4: 0}
    quarterly_gst = {1: 0, 2: 0, 3: 0, 4: 0}
    quarterly_invoices = {1: [], 2: [], 3: [], 4: []}

    client_tds_map = {}

    for inv in invoices:
        amount = inv.get("total", 0)
        status = inv.get("status", "draft")
        currency = inv.get("currency", "INR")
        tax_amount = inv.get("tax_amount", 0)
        tax_percent = inv.get("tax_percent", 0)
        created = inv.get("created_at")

        total_invoiced += amount
        if status == "paid":
            total_received += amount

        # GST tracking
        is_export = currency != "INR"
        if not is_export and tax_percent > 0:
            gst_collected += tax_amount

        # Revenue split
        if is_export:
            foreign_currency_revenue += amount
        else:
            inr_revenue += amount

        # Quarter assignment
        if isinstance(created, datetime):
            inv_date = created.date()
            q = _get_quarter_for_date(inv_date, fy_start)
            if q:
                quarterly_revenue[q] += amount
                if not is_export and tax_percent > 0:
                    quarterly_gst[q] += tax_amount
                quarterly_invoices[q].append({
                    "invoice_number": inv.get("invoice_number", ""),
                    "amount": amount,
                    "gst": tax_amount,
                    "client_name": inv.get("client_name", ""),
                    "status": status,
                    "currency": currency,
                })

        # TDS estimation: companies deduct 10% TDS on professional services
        # We estimate based on client records
        client_id = str(inv.get("client_id", ""))
        if client_id and status == "paid":
            if client_id not in client_tds_map:
                client_tds_map[client_id] = {
                    "client_name": inv.get("client_name", "Unknown"),
                    "total_paid": 0,
                    "estimated_tds": 0,
                }
            client_tds_map[client_id]["total_paid"] += amount
            # Estimate TDS at 10% (Section 194J — professional services)
            client_tds_map[client_id]["estimated_tds"] = round(
                client_tds_map[client_id]["total_paid"] * 0.10, 2
            )

    tds_deducted_estimate = sum(c["estimated_tds"] for c in client_tds_map.values())

    return {
        "total_invoiced": round(total_invoiced, 2),
        "total_received": round(total_received, 2),
        "gst_collected": round(gst_collected, 2),
        "tds_deducted_estimate": round(tds_deducted_estimate, 2),
        "foreign_currency_revenue": round(foreign_currency_revenue, 2),
        "inr_revenue": round(inr_revenue, 2),
        "invoice_count": len(invoices),
        "quarterly_revenue": quarterly_revenue,
        "quarterly_gst": quarterly_gst,
        "quarterly_invoices": quarterly_invoices,
        "client_tds_breakdown": list(client_tds_map.values()),
        "fy_label": f"FY {fy_start}-{str(fy_end)[-2:]}",
    }


def _get_quarter_for_date(d: date, fy_start: int) -> Optional[int]:
    if date(fy_start, 4, 1) <= d <= date(fy_start, 6, 30):
        return 1
    elif date(fy_start, 7, 1) <= d <= date(fy_start, 9, 30):
        return 2
    elif date(fy_start, 10, 1) <= d <= date(fy_start, 12, 31):
        return 3
    elif date(fy_start + 1, 1, 1) <= d <= date(fy_start + 1, 3, 31):
        return 4
    return None


# ── TAX CALCULATIONS ─────────────────────────────────────────────

def calculate_presumptive_tax(gross_receipts: float) -> dict:
    """
    Section 44ADA: Presumptive taxation for professionals.
    If gross receipts < ₹75L, declare 50% as income.
    Tax on that income using new tax regime slabs (FY 2024-25).
    """
    presumptive_income = gross_receipts * 0.50

    # New Tax Regime slabs (FY 2024-25)
    new_regime_slabs = [
        (0, 300000, 0),
        (300001, 600000, 0.05),
        (600001, 900000, 0.10),
        (900001, 1200000, 0.15),
        (1200001, 1500000, 0.20),
        (1500001, float('inf'), 0.30),
    ]

    # Old Tax Regime slabs
    old_regime_slabs = [
        (0, 250000, 0),
        (250001, 500000, 0.05),
        (500001, 1000000, 0.20),
        (1000001, float('inf'), 0.30),
    ]

    def calc_tax(income, slabs):
        tax = 0
        for low, high, rate in slabs:
            if income <= low:
                break
            taxable = min(income, high) - low
            tax += taxable * rate
        return round(tax, 2)

    new_regime_tax = calc_tax(presumptive_income, new_regime_slabs)
    old_regime_tax = calc_tax(presumptive_income, old_regime_slabs)

    # Health & Education Cess 4%
    new_regime_total = round(new_regime_tax * 1.04, 2)
    old_regime_total = round(old_regime_tax * 1.04, 2)

    return {
        "gross_receipts": round(gross_receipts, 2),
        "presumptive_income": round(presumptive_income, 2),
        "new_regime_tax": new_regime_tax,
        "new_regime_total_with_cess": new_regime_total,
        "old_regime_tax": old_regime_tax,
        "old_regime_total_with_cess": old_regime_total,
        "recommended_regime": "new" if new_regime_total <= old_regime_total else "old",
        "recommended_tax": min(new_regime_total, old_regime_total),
        "is_44ada_eligible": gross_receipts <= 7500000,  # ₹75L limit
    }


def calculate_advance_tax(
    estimated_annual_tax: float,
    tds_already_deducted: float,
    fy_start: int,
) -> list[dict]:
    """
    Calculates advance tax installments.
    Net tax = estimated_annual_tax - TDS deducted
    If net tax < ₹10,000, no advance tax required.
    """
    net_tax = max(0, estimated_annual_tax - tds_already_deducted)
    advance_tax_required = net_tax >= 10000  # Section 208 threshold

    today = date.today()
    installments = []

    for inst in ADVANCE_TAX_INSTALLMENTS:
        due_date = inst["due_date_fn"](fy_start)
        cumulative_amount = round(net_tax * inst["cumulative_percent"] / 100, 2)

        # Calculate this installment's amount
        prev_cumulative = 0
        if inst["installment"] > 1:
            prev = ADVANCE_TAX_INSTALLMENTS[inst["installment"] - 2]
            prev_cumulative = round(net_tax * prev["cumulative_percent"] / 100, 2)
        this_installment = round(cumulative_amount - prev_cumulative, 2)

        is_overdue = due_date < today
        is_upcoming = due_date >= today and (due_date - today).days <= 30

        installments.append({
            "installment": inst["installment"],
            "label": inst["label"],
            "due_date": due_date.strftime("%d %B %Y"),
            "due_date_iso": due_date.isoformat(),
            "cumulative_percent": inst["cumulative_percent"],
            "cumulative_amount": cumulative_amount,
            "this_installment_amount": this_installment,
            "is_overdue": is_overdue,
            "is_upcoming": is_upcoming,
            "days_until_due": (due_date - today).days if not is_overdue else None,
        })

    return {
        "required": advance_tax_required,
        "net_tax_after_tds": round(net_tax, 2),
        "threshold": 10000,
        "installments": installments,
        "message": (
            "Advance tax required — pay in installments below."
            if advance_tax_required
            else f"Net tax after TDS is ₹{net_tax:,.0f} (below ₹10,000 threshold). No advance tax required."
        ),
    }


def calculate_quarterly_gst(
    quarterly_revenue: dict,
    quarterly_gst: dict,
    fy_start: int,
) -> list[dict]:
    """GST quarterly filing details with due dates."""
    quarter_names = {1: "Q1 (Apr-Jun)", 2: "Q2 (Jul-Sep)", 3: "Q3 (Oct-Dec)", 4: "Q4 (Jan-Mar)"}
    quarter_due_dates = {
        1: date(fy_start, 7, 22),
        2: date(fy_start, 10, 22),
        3: date(fy_start + 1, 1, 22),
        4: date(fy_start + 1, 4, 22),
    }

    today = date.today()
    quarters = []
    for q in range(1, 5):
        revenue = quarterly_revenue.get(q, 0)
        gst = quarterly_gst.get(q, 0)
        due_date = quarter_due_dates[q]

        quarters.append({
            "quarter": q,
            "label": quarter_names[q],
            "revenue": round(revenue, 2),
            "gst_collected": round(gst, 2),
            "gst_payable": round(gst, 2),  # simplified (no input credit calculation)
            "filing_due": due_date.strftime("%d %B %Y"),
            "filing_due_iso": due_date.isoformat(),
            "is_overdue": due_date < today,
            "is_upcoming": due_date >= today and (due_date - today).days <= 30,
            "status": "overdue" if due_date < today else "upcoming" if (due_date - today).days <= 30 else "future",
        })

    return quarters


def generate_filing_checklist(
    tax_data: dict,
    gst_quarters: list,
    advance_tax: dict,
    current_quarter: int,
) -> list[dict]:
    """Generates a prioritized filing checklist for the current quarter."""
    today = date.today()
    checklist = []

    # 1. Advance tax checks
    if advance_tax["required"]:
        for inst in advance_tax["installments"]:
            due_date = date.fromisoformat(inst["due_date_iso"])
            if (due_date - today).days <= 45 or inst["is_overdue"]:
                checklist.append({
                    "priority": "HIGH" if inst["is_overdue"] or inst["is_upcoming"] else "MEDIUM",
                    "category": "Advance Tax",
                    "task": f"Pay {inst['label']} — ₹{inst['this_installment_amount']:,.0f}",
                    "due": inst["due_date"],
                    "is_overdue": inst["is_overdue"],
                    "action": "Pay at tax.gov.in → Pay Tax → Self Assessment Tax",
                })

    # 2. GST filing checks
    for q in gst_quarters:
        if q["status"] in ("overdue", "upcoming") and q["gst_collected"] > 0:
            checklist.append({
                "priority": "HIGH" if q["is_overdue"] else "MEDIUM",
                "category": "GST Filing",
                "task": f"File GSTR-1 and GSTR-3B for {q['label']} — GST payable ₹{q['gst_payable']:,.0f}",
                "due": q["filing_due"],
                "is_overdue": q["is_overdue"],
                "action": "Login to GST portal → File Returns → GSTR-1 then GSTR-3B",
            })

    # 3. TDS reconciliation
    if tax_data.get("tds_deducted_estimate", 0) > 0:
        checklist.append({
            "priority": "MEDIUM",
            "category": "TDS Reconciliation",
            "task": f"Verify TDS of ₹{tax_data['tds_deducted_estimate']:,.0f} in Form 26AS",
            "due": "Before ITR filing",
            "is_overdue": False,
            "action": "Login to incometax.gov.in → View Form 26AS → Match with your records",
        })

    # 4. ITR filing
    checklist.append({
        "priority": "MEDIUM",
        "category": "Income Tax Return",
        "task": "File ITR-4 (presumptive income) by 31 July",
        "due": "31 July",
        "is_overdue": False,
        "action": "File ITR-4 on incometax.gov.in using Section 44ADA (50% presumptive income)",
    })

    # 5. Invoicing hygiene
    if tax_data.get("total_invoiced", 0) > 0 and tax_data.get("total_received", 0) < tax_data.get("total_invoiced", 0) * 0.7:
        checklist.append({
            "priority": "MEDIUM",
            "category": "Revenue Collection",
            "task": f"Follow up on unpaid invoices — ₹{tax_data['total_invoiced'] - tax_data['total_received']:,.0f} outstanding",
            "due": "Immediately",
            "is_overdue": True,
            "action": "Go to Reminders → Send WhatsApp reminders for overdue invoices",
        })

    # Sort: overdue first, then by priority
    priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    checklist.sort(key=lambda x: (not x["is_overdue"], priority_order.get(x["priority"], 2)))

    return checklist


# ── MASTER FUNCTION ───────────────────────────────────────────────

async def generate_tax_report(db, owner_id, fy_start: int = None, fy_end: int = None) -> dict:
    """
    THE MAIN PIPELINE FUNCTION.
    Generates a complete tax filing report for a freelancer.
    """
    if not fy_start or not fy_end:
        fy_start, fy_end = get_current_fy()

    current_quarter = get_current_quarter(fy_start)

    # Aggregate invoice data (SYNC with invoices + clients)
    tax_data = await aggregate_invoices_for_tax(db, owner_id, fy_start, fy_end)

    # Presumptive tax calculation (Section 44ADA)
    presumptive = calculate_presumptive_tax(tax_data["total_received"])

    # Advance tax schedule
    advance_tax = calculate_advance_tax(
        presumptive["recommended_tax"],
        tax_data["tds_deducted_estimate"],
        fy_start,
    )

    # GST quarterly breakdown
    gst_quarters = calculate_quarterly_gst(
        tax_data["quarterly_revenue"],
        tax_data["quarterly_gst"],
        fy_start,
    )

    # Filing checklist
    checklist = generate_filing_checklist(
        tax_data, gst_quarters, advance_tax, current_quarter
    )

    # Form 26AS summary
    form_26as = {
        "estimated_tds": tax_data["tds_deducted_estimate"],
        "client_breakdown": tax_data["client_tds_breakdown"],
        "note": "These are estimates. Verify actual amounts at incometax.gov.in → View Form 26AS",
        "section": "Section 194J (Professional Services) — 10% TDS",
    }

    # Plain English summary (what the freelancer actually needs to know right now)
    urgent_items = [c for c in checklist if c["is_overdue"] or c["priority"] == "HIGH"]
    plain_summary = _generate_plain_summary(
        tax_data, presumptive, advance_tax, gst_quarters, urgent_items, current_quarter, fy_start
    )

    return {
        "fy_label": f"FY {fy_start}-{str(fy_end)[-2:]}",
        "fy_start": fy_start,
        "fy_end": fy_end,
        "current_quarter": current_quarter,
        "tax_data": tax_data,
        "presumptive_tax": presumptive,
        "advance_tax": advance_tax,
        "gst_quarters": gst_quarters,
        "checklist": checklist,
        "form_26as": form_26as,
        "plain_summary": plain_summary,
        "urgent_count": len(urgent_items),
        "generated_at": datetime.utcnow().isoformat(),
    }


def _generate_plain_summary(
    tax_data, presumptive, advance_tax, gst_quarters,
    urgent_items, current_quarter, fy_start
) -> list[dict]:
    """Plain-language bullets that any freelancer can understand."""
    bullets = []

    # Revenue summary
    bullets.append({
        "icon": "💰",
        "text": f"You've earned ₹{tax_data['total_received']:,.0f} in FY {fy_start}-{str(fy_start + 1)[-2:]}. "
                f"Your presumptive income (50%) = ₹{presumptive['presumptive_income']:,.0f}.",
    })

    # Tax liability
    if presumptive["is_44ada_eligible"]:
        bullets.append({
            "icon": "📊",
            "text": f"Under Section 44ADA (presumptive), your estimated tax is ₹{presumptive['recommended_tax']:,.0f} "
                    f"({presumptive['recommended_regime'].title()} regime recommended).",
        })
    else:
        bullets.append({
            "icon": "⚠️",
            "text": f"Your turnover exceeds ₹75L — you cannot use Section 44ADA. Consult a CA for audit requirements.",
        })

    # TDS
    if tax_data["tds_deducted_estimate"] > 0:
        bullets.append({
            "icon": "🏦",
            "text": f"Estimated TDS deducted by clients: ₹{tax_data['tds_deducted_estimate']:,.0f}. "
                    f"This reduces your advance tax liability.",
        })

    # Advance tax
    if advance_tax["required"]:
        upcoming = [i for i in advance_tax["installments"] if i["is_upcoming"]]
        if upcoming:
            next_inst = upcoming[0]
            bullets.append({
                "icon": "📅",
                "text": f"Next advance tax due: ₹{next_inst['this_installment_amount']:,.0f} by {next_inst['due_date']}. Pay at tin.tin.nsdl.com.",
            })
    else:
        bullets.append({
            "icon": "✅",
            "text": f"No advance tax required — your net tax after TDS is below ₹10,000.",
        })

    # GST
    current_q = next((q for q in gst_quarters if q["quarter"] == current_quarter), None)
    if current_q and current_q["gst_collected"] > 0:
        bullets.append({
            "icon": "🧾",
            "text": f"Q{current_quarter} GST collected: ₹{current_q['gst_collected']:,.0f}. "
                    f"Filing due: {current_q['filing_due']}. File GSTR-1 and GSTR-3B on gstin.gov.in.",
        })

    # Export
    if tax_data["foreign_currency_revenue"] > 0:
        bullets.append({
            "icon": "🌍",
            "text": f"Foreign currency revenue: ₹{tax_data['foreign_currency_revenue']:,.0f} — "
                    f"zero-rated for GST (export of services). No GST on these invoices.",
        })

    return bullets