"""
WhatsApp Payment Reminder Agent.

CONCEPT — why this is genuinely "agentic":
1. QUERIES the database to find overdue invoices autonomously
2. CALCULATES context (days overdue, previous reminder count)
3. REASONS about tone: 3-day overdue = gentle nudge, 30-day = firm message
4. DRAFTS a polished personalised WhatsApp message using Groq LLM
5. DECIDES not to re-remind if a reminder was already sent today

TWILIO SETUP (free, 5 minutes):
1. Sign up at https://console.twilio.com
2. Go to Messaging → Try it Out → Send a WhatsApp message
3. From your phone WhatsApp, send: join [your-sandbox-word] to +14155238886
4. Copy Account SID and Auth Token to backend/.env
"""
from datetime import datetime, date
from bson import ObjectId
from langchain_core.messages import SystemMessage, HumanMessage
from app.core.config import settings

REMINDER_SYSTEM_PROMPT = """You are a professional business communication assistant \
for a freelancer. Your job is to draft a short, polite WhatsApp payment reminder message.

Rules:
- Keep it under 160 words
- Be professional but warm — not aggressive or threatening
- Include: client's name, invoice number, amount due, days overdue
- End with a clear call to action (confirm payment or contact if any issue)
- Use Indian Rupee symbol (₹) for amounts
- Do NOT use formal letter salutations (Dear Sir/Ma'am) — WhatsApp is conversational
- Adjust tone based on days_overdue:
    * 1-7 days: very gentle, assume it slipped their mind
    * 8-20 days: polite but clear, mention you'd appreciate prompt payment
    * 21+ days: firm and direct, mention this needs immediate attention
- Output ONLY the message text, no subject line, no explanation, no quotes around it
"""

REMINDER_USER_PROMPT = """Draft a WhatsApp payment reminder with these details:
Client name: {client_name}
Invoice number: {invoice_number}
Amount due: ₹{amount}
Days overdue: {days_overdue}
Business name: {business_name}
Previous reminders sent: {reminder_count}
"""


async def _draft_reminder_message(
    client_name: str,
    invoice_number: str,
    amount: float,
    days_overdue: int,
    business_name: str,
    reminder_count: int,
) -> str:
    if not settings.GROQ_API_KEY:
        return (
            f"Hi {client_name},\n\n"
            f"Hope you're doing well! Just a gentle reminder that invoice "
            f"{invoice_number} for ₹{amount:,.0f} is {days_overdue} day(s) overdue.\n\n"
            f"Could you please arrange payment at your earliest convenience? "
            f"Do reach out if you have any questions.\n\n"
            f"Thanks,\n{business_name}"
        )

    from langchain_groq import ChatGroq
    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.4)

    user_prompt = REMINDER_USER_PROMPT.format(
        client_name=client_name,
        invoice_number=invoice_number,
        amount=f"{amount:,.0f}",
        days_overdue=days_overdue,
        business_name=business_name,
        reminder_count=reminder_count,
    )

    response = await llm.ainvoke([
        SystemMessage(content=REMINDER_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ])
    return response.content.strip()


async def get_overdue_invoices_for_reminder(db, owner_id: ObjectId) -> list[dict]:
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

    enriched = []
    for inv in invoices:
        due_date = inv.get("due_date")
        if not due_date:
            continue
        try:
            due_date_obj = date.fromisoformat(due_date)
        except ValueError:
            continue

        days_overdue = (today - due_date_obj).days
        if days_overdue <= 0:
            continue

        reminder_count = await db.whatsapp_reminders.count_documents({"invoice_id": inv["_id"]})
        already_sent_today = await db.whatsapp_reminders.find_one({
            "invoice_id": inv["_id"],
            "sent_date": today_str,
        })

        enriched.append({
            "invoice_id": str(inv["_id"]),
            "invoice_number": inv.get("invoice_number", ""),
            "client_id": str(inv.get("client_id", "")),
            "client_name": inv.get("client_name", ""),
            "total": inv.get("total", 0),
            "due_date": due_date,
            "days_overdue": days_overdue,
            "reminder_count": reminder_count,
            "already_sent_today": already_sent_today is not None,
        })

    return enriched


async def draft_reminder_previews(db, owner_id: ObjectId, business_name: str) -> list[dict]:
    overdue_invoices = await get_overdue_invoices_for_reminder(db, owner_id)

    previews = []
    for inv in overdue_invoices:
        message = await _draft_reminder_message(
            client_name=inv["client_name"],
            invoice_number=inv["invoice_number"],
            amount=inv["total"],
            days_overdue=inv["days_overdue"],
            business_name=business_name,
            reminder_count=inv["reminder_count"],
        )

        client_phone = None
        if inv["client_id"]:
            client_doc = await db.clients.find_one({"_id": ObjectId(inv["client_id"])})
            if client_doc:
                client_phone = client_doc.get("phone")

        previews.append({
            **inv,
            "drafted_message": message,
            "client_phone": client_phone,
            "can_send_whatsapp": bool(client_phone and settings.TWILIO_ACCOUNT_SID),
        })

    return previews


class WhatsAppSendError(Exception):
    pass


async def send_whatsapp_reminder(
    db,
    owner_id: ObjectId,
    invoice_id: str,
    client_phone: str,
    message: str,
) -> dict:
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        raise WhatsAppSendError(
            "Twilio credentials not configured. Add TWILIO_ACCOUNT_SID and "
            "TWILIO_AUTH_TOKEN to backend/.env"
        )

    phone = client_phone.strip().replace(" ", "").replace("-", "")
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")

    to_number = f"whatsapp:{phone}"

    try:
        from twilio.rest import Client as TwilioClient
        twilio_client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        sent_message = twilio_client.messages.create(
            from_=settings.TWILIO_WHATSAPP_FROM,
            to=to_number,
            body=message,
        )
        message_sid = sent_message.sid
    except Exception as exc:
        raise WhatsAppSendError(f"Twilio send failed: {exc}")

    today_str = str(date.today())
    record = {
        "owner_id": owner_id,
        "invoice_id": ObjectId(invoice_id),
        "client_phone": phone,
        "message": message,
        "twilio_message_sid": message_sid,
        "sent_date": today_str,
        "sent_at": datetime.utcnow(),
    }
    await db.whatsapp_reminders.insert_one(record)

    return {
        "success": True,
        "message_sid": message_sid,
        "sent_to": phone,
        "sent_at": today_str,
    }