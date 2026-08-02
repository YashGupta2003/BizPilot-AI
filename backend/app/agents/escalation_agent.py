"""
Automatic Late Payment Escalation Agent.

SYNCHRONIZATION — reads from ALL existing collections:
- invoices          → overdue amount, issue date, invoice number
- whatsapp_reminders → how many reminders already sent, last sent date
- contracts         → payment terms, late fee clauses to reference
- meetings          → verbal agreements to reference as evidence
- clients           → client contact info, company name
- client_profiles   → risk score to calibrate escalation tone
- disputes          → any existing dispute on this invoice

ESCALATION PIPELINE (automatic, based on invoice age):
Stage 1: 1-7 days overdue   → Gentle WhatsApp reminder (already built)
Stage 2: 8-14 days overdue  → Formal email demand letter
Stage 3: 15-21 days overdue → Legal demand letter (stronger tone)
Stage 4: 22-30 days overdue → Cease & Desist draft
Stage 5: 30+ days overdue   → Final notice before legal action

Each stage generates a different document and suggests different actions.
The freelancer approves before anything is sent.
"""
import json
import re
from datetime import datetime, date, timedelta
from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from app.core.config import settings


ESCALATION_STAGES = [
    {
        "stage": 1,
        "days_min": 1,
        "days_max": 7,
        "label": "Gentle Reminder",
        "color": "blue",
        "description": "Polite follow-up — assume it slipped their mind",
        "action": "Send WhatsApp reminder",
    },
    {
        "stage": 2,
        "days_min": 8,
        "days_max": 14,
        "label": "Formal Demand",
        "color": "yellow",
        "description": "Professional email with payment deadline",
        "action": "Send formal email",
    },
    {
        "stage": 3,
        "days_min": 15,
        "days_max": 21,
        "label": "Legal Demand Letter",
        "color": "orange",
        "description": "Firm legal-tone letter referencing contract",
        "action": "Send legal demand letter",
    },
    {
        "stage": 4,
        "days_min": 22,
        "days_max": 30,
        "label": "Cease & Desist",
        "color": "red",
        "description": "Formal C&D with intent to pursue legal action",
        "action": "Send cease & desist",
    },
    {
        "stage": 5,
        "days_min": 31,
        "days_max": 9999,
        "label": "Final Legal Notice",
        "color": "dark_red",
        "description": "Final notice before filing complaint/court action",
        "action": "Consult a lawyer",
    },
]


def _get_escalation_stage(days_overdue: int) -> dict:
    for stage in ESCALATION_STAGES:
        if stage["days_min"] <= days_overdue <= stage["days_max"]:
            return stage
    return ESCALATION_STAGES[-1]


STAGE_2_PROMPT = """You are drafting a formal payment demand email for a freelancer.
Tone: Professional, firm, not aggressive. Reference the specific invoice details.
Include: Invoice number, amount, original due date, days overdue, late fee if applicable.
End with a specific payment deadline (7 days from today).
Output only the email body (no subject line). Under 200 words."""

STAGE_3_PROMPT = """You are drafting a LEGAL DEMAND LETTER for a freelancer who has not been paid.
Tone: Formal legal language. Reference the contract and invoice as legal documents.
Include:
- "This letter serves as formal notice..."
- Specific invoice details and days overdue
- Reference to signed contract/agreement
- Specific payment deadline (5 days)
- Statement that non-payment will result in legal action
- Mention of late payment penalties
Output only the letter body. Under 300 words. No brackets or placeholders."""

STAGE_4_PROMPT = """You are drafting a CEASE AND DESIST letter for non-payment of freelance services.
Tone: Very formal legal language. This is a serious document.
Include:
- Formal opening referencing the freelance agreement
- Complete timeline of non-payment and ignored reminders
- Specific invoice amount and accumulated late fees
- DEMAND TO CEASE: using the delivered work until payment is received
- IP ownership clause (work remains freelancer's property until paid in full)
- 48-hour payment deadline
- Intent to file complaint with consumer forums / pursue legal remedies
Output only the letter body. Under 400 words. Professional legal format."""

STAGE_5_PROMPT = """You are drafting a FINAL LEGAL NOTICE before court action for non-payment.
Tone: Extremely formal. This is the last step before legal filing.
Include:
- Full formal header reference
- Complete evidence of non-payment (invoices, reminders, previous letters)
- Total amount due including all late fees calculated
- 24-hour final deadline
- Specific legal actions that WILL follow: civil suit, consumer forum complaint,
  professional network notifications
- Statement that this letter will be submitted as evidence
Output only the letter body. Under 500 words. Formal legal document style."""


def _get_stage_prompt(stage: int) -> str:
    prompts = {2: STAGE_2_PROMPT, 3: STAGE_3_PROMPT, 4: STAGE_4_PROMPT, 5: STAGE_5_PROMPT}
    return prompts.get(stage, STAGE_2_PROMPT)


def _calculate_late_fee(amount: float, days_overdue: int, rate_percent: float = 2.0) -> float:
    """2% per month late fee — standard in Indian freelance contracts."""
    months = days_overdue / 30
    return round(amount * (rate_percent / 100) * months, 2)


async def generate_escalation_document(
    stage: int,
    invoice: dict,
    client: dict,
    contracts: list,
    meetings: list,
    reminders: list,
    freelancer_name: str,
    business_name: str,
) -> dict:
    """Generates the appropriate escalation document for the given stage."""

    days_overdue = invoice.get("days_overdue", 0)
    amount = invoice.get("total", 0)
    late_fee = _calculate_late_fee(amount, days_overdue)
    total_due = amount + late_fee
    today = date.today().strftime("%B %d, %Y")
    deadline_5 = (date.today() + timedelta(days=5)).strftime("%B %d, %Y")
    deadline_7 = (date.today() + timedelta(days=7)).strftime("%B %d, %Y")
    deadline_2 = (date.today() + timedelta(days=2)).strftime("%B %d, %Y")
    deadline_1 = (date.today() + timedelta(days=1)).strftime("%B %d, %Y")

    # Build context for AI
    context = f"""
Freelancer: {freelancer_name} ({business_name})
Client: {client.get('name', 'Client')} / {client.get('company', '')}
Invoice Number: {invoice.get('invoice_number', 'N/A')}
Invoice Amount: ₹{amount:,.0f}
Late Fee Accrued: ₹{late_fee:,.0f}
Total Due: ₹{total_due:,.0f}
Original Due Date: {invoice.get('due_date', 'N/A')}
Days Overdue: {days_overdue}
Reminders Already Sent: {len(reminders)}
Date Today: {today}
Payment Deadline in Letter: {deadline_7 if stage == 2 else deadline_5 if stage == 3 else deadline_2 if stage == 4 else deadline_1}
"""
    if contracts:
        contract = contracts[0].get("contract", {})
        context += f"\nContract Reference: {contract.get('contract_title', 'Service Agreement')}"
        context += f"\nPayment Terms: {contract.get('payment_section', 'As agreed')[:150]}"
        context += f"\nLate Payment Clause: {contract.get('late_payment_section', '2% per month')[:150]}"

    if meetings:
        extracted = meetings[0].get("extracted", {})
        if extracted.get("total_price_agreed"):
            context += f"\nMeeting Record: Price of ₹{extracted['total_price_agreed']:,.0f} agreed on {meetings[0].get('created_at', '')}"

    # Use fallback if no API key
    if not settings.GROQ_API_KEY:
        return _fallback_document(stage, invoice, client, freelancer_name, business_name,
                                  amount, late_fee, total_due, today, deadline_7, len(reminders))

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)
    prompt = _get_stage_prompt(stage)

    try:
        response = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content=f"Generate the document for:\n{context}"),
        ])
        document_body = response.content.strip()
    except Exception as exc:
        document_body = f"AI generation failed: {exc}. Please use the template below."
        document_body += _fallback_document(stage, invoice, client, freelancer_name,
                                            business_name, amount, late_fee, total_due,
                                            today, deadline_7, len(reminders))["body"]

    subjects = {
        2: f"Payment Reminder — Invoice {invoice.get('invoice_number')} ({days_overdue} Days Overdue)",
        3: f"LEGAL DEMAND — Invoice {invoice.get('invoice_number')} — Immediate Payment Required",
        4: f"CEASE AND DESIST NOTICE — {invoice.get('invoice_number')} — Final Warning",
        5: f"FINAL LEGAL NOTICE — Invoice {invoice.get('invoice_number')} — Imminent Legal Action",
    }

    return {
        "stage": stage,
        "stage_label": _get_escalation_stage(days_overdue)["label"],
        "subject": subjects.get(stage, f"Payment Notice — {invoice.get('invoice_number')}"),
        "body": document_body,
        "invoice_number": invoice.get("invoice_number"),
        "amount": amount,
        "late_fee": late_fee,
        "total_due": total_due,
        "days_overdue": days_overdue,
        "client_name": client.get("name", "Client"),
        "client_email": client.get("email", ""),
        "client_phone": client.get("phone", ""),
    }


def _fallback_document(stage, invoice, client, freelancer_name, business_name,
                        amount, late_fee, total_due, today, deadline, reminder_count):
    client_name = client.get("name", "Client")
    inv_num = invoice.get("invoice_number", "N/A")
    days = invoice.get("days_overdue", 0)

    bodies = {
        2: f"""Dear {client_name},

I hope this message finds you well. This is a formal reminder that Invoice {inv_num} for ₹{amount:,.0f} is now {days} days past due.

Despite {reminder_count} previous reminder(s), payment has not been received. I kindly request that you process this payment by {deadline}.

A late fee of ₹{late_fee:,.0f} has been added per our payment terms, bringing the total to ₹{total_due:,.0f}.

Please arrange payment immediately and confirm by email. If there is an issue, please contact me urgently.

Regards,
{freelancer_name}
{business_name}""",

        3: f"""LEGAL DEMAND NOTICE
Date: {today}
Re: Invoice {inv_num} — Overdue Payment

This letter serves as formal legal notice that Invoice {inv_num} for ₹{amount:,.0f} remains unpaid after {days} days, despite multiple reminders.

As per our signed service agreement, payment was due and remains outstanding. With accrued late fees, the total amount now owed is ₹{total_due:,.0f}.

YOU ARE HEREBY DEMANDED to remit payment of ₹{total_due:,.0f} within 5 days of this notice.

Failure to comply will result in legal action including filing a civil recovery suit without further notice.

{freelancer_name}
{business_name}""",

        4: f"""CEASE AND DESIST NOTICE
Date: {today}

To: {client_name}
Re: Unauthorized Use of Intellectual Property — Invoice {inv_num}

This letter serves as formal notice to CEASE AND DESIST from using any work product delivered under our service agreement for which full payment of ₹{total_due:,.0f} has not been received.

Under Indian IP law and our signed agreement, ownership of all delivered work remains with {freelancer_name} until full payment is received.

You have 48 hours to remit payment of ₹{total_due:,.0f}. Non-payment will result in immediate legal action.

{freelancer_name}
{business_name}""",

        5: f"""FINAL LEGAL NOTICE — WITHOUT PREJUDICE
Date: {today}

Re: Invoice {inv_num} — FINAL NOTICE BEFORE LEGAL ACTION

This is your FINAL notice. Invoice {inv_num} for ₹{amount:,.0f} plus late fees totaling ₹{total_due:,.0f} remains unpaid after {days} days.

All previous notices have been ignored. Legal proceedings WILL commence within 24 hours including:
1. Civil recovery suit in appropriate court
2. Complaint to consumer disputes forum
3. Formal complaints to professional associations

This letter will be presented as evidence of your refusal to pay.

{freelancer_name}
{business_name}""",
    }

    return {
        "subject": f"Notice — Invoice {inv_num}",
        "body": bodies.get(stage, bodies[2]),
    }


async def get_all_escalations(db, owner_id) -> list[dict]:
    """
    MAIN PIPELINE FUNCTION.
    Scans ALL overdue invoices and determines the correct escalation
    stage for each one based on days overdue + reminder history.
    This is the "autonomous" part — it figures out what stage each
    invoice is at without the freelancer having to track it manually.
    """
    today = date.today()
    today_str = str(today)

    pipeline = [
        {
            "$match": {
                "owner_id": owner_id,
                "status": {"$in": ["overdue", "sent"]},
                "due_date": {"$ne": None, "$lt": today_str},
            }
        },
        {"$sort": {"due_date": 1}},
    ]
    invoices = await db.invoices.aggregate(pipeline).to_list(length=100)

    results = []
    for inv in invoices:
        due_date_str = inv.get("due_date", "")
        try:
            due_date_obj = date.fromisoformat(due_date_str)
        except ValueError:
            continue
        days_overdue = (today - due_date_obj).days
        if days_overdue <= 0:
            continue

        inv["days_overdue"] = days_overdue
        stage_info = _get_escalation_stage(days_overdue)
        late_fee = _calculate_late_fee(inv.get("total", 0), days_overdue)

        # Get reminder history
        reminders = await db.whatsapp_reminders.find(
            {"invoice_id": inv["_id"], "owner_id": owner_id}
        ).to_list(length=20)

        # Get client info
        client = {}
        if inv.get("client_id"):
            client_doc = await db.clients.find_one({"_id": inv["client_id"]})
            if client_doc:
                client = dict(client_doc)

        # Get client risk profile
        risk_profile = None
        if inv.get("client_id"):
            risk_profile = await db.client_profiles.find_one(
                {"client_id": inv["client_id"], "owner_id": owner_id},
                sort=[("analyzed_at", -1)],
            )

        # Get contracts
        contracts = []
        if inv.get("client_id"):
            con_cursor = db.contracts.find(
                {"client_id": inv["client_id"], "owner_id": owner_id}
            )
            contracts = await con_cursor.to_list(length=3)

        # Check for existing dispute
        dispute = await db.disputes.find_one({
            "client_id": inv.get("client_id"),
            "owner_id": owner_id,
        })

        # Calculate urgency based on risk profile
        urgency = "NORMAL"
        if risk_profile:
            risk_score = risk_profile.get("profile", {}).get("overall_risk_score", 5)
            if risk_score >= 8:
                urgency = "HIGH"  # escalate faster for high-risk clients

        results.append({
            "invoice_id": str(inv["_id"]),
            "invoice_number": inv.get("invoice_number", ""),
            "client_id": str(inv.get("client_id", "")),
            "client_name": inv.get("client_name", client.get("name", "Unknown")),
            "client_email": client.get("email", ""),
            "client_phone": client.get("phone", ""),
            "client_company": client.get("company", ""),
            "amount": inv.get("total", 0),
            "late_fee": late_fee,
            "total_due": round(inv.get("total", 0) + late_fee, 2),
            "due_date": due_date_str,
            "days_overdue": days_overdue,
            "reminders_sent": len(reminders),
            "last_reminder_date": reminders[0].get("sent_date") if reminders else None,
            "stage": stage_info["stage"],
            "stage_label": stage_info["label"],
            "stage_color": stage_info["color"],
            "stage_description": stage_info["description"],
            "stage_action": stage_info["action"],
            "has_contract": len(contracts) > 0,
            "has_dispute": dispute is not None,
            "urgency": urgency,
            "risk_score": risk_profile.get("profile", {}).get("overall_risk_score", 5) if risk_profile else 5,
        })

    results.sort(key=lambda x: (x["stage"], x["days_overdue"]), reverse=True)
    return results