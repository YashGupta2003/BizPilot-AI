"""
Meeting Notes → Deliverable Extractor Agent.

SYNCHRONIZATION:
- Reads 'clients' collection to link meeting to a client
- Creates invoice line items in 'invoices' collection (NEW invoice auto-created)
- Updates client 'notes' field with meeting summary
- Saves meeting record to 'meetings' collection (new)

PIPELINE:
Raw messy notes → AI extracts structured data → scope email drafted
                → invoice line items created → client notes updated
"""
import json
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from app.core.config import settings

class Deliverable(BaseModel):
    item: str
    description: str
    quantity: int = 1
    estimated_hours: Optional[float] = None
    deadline: Optional[str] = None

class MeetingExtraction(BaseModel):
    client_name: Optional[str] = None
    project_name: Optional[str] = None
    deliverables: list[Deliverable] = []
    total_price_agreed: Optional[float] = None
    currency: str = "INR"
    hourly_rate: Optional[float] = None
    revision_count: int = 2
    project_start_date: Optional[str] = None
    project_deadline: Optional[str] = None
    payment_terms: Optional[str] = None
    advance_percent: int = 50
    next_steps: list[str] = []
    client_requirements: list[str] = []
    things_not_included: list[str] = []
    concerns_flagged: list[str] = []
    meeting_summary: Optional[str] = None


MEETING_EXTRACTION_PROMPT = """You are an expert project manager and business analyst
for freelancers. You read raw, messy meeting notes or call transcripts and extract
all the important business information.

Extract EVERYTHING that was agreed upon, discussed, or mentioned:

OUTPUT as valid JSON only (no markdown):
{
  "client_name": "<client name if mentioned, else null>",
  "project_name": "<project name or description>",
  "deliverables": [
    {
      "item": "<specific deliverable>",
      "description": "<details about this deliverable>",
      "quantity": <number, default 1>,
      "estimated_hours": <number or null>,
      "deadline": "<deadline string or null>"
    }
  ],
  "total_price_agreed": <number or null>,
  "currency": "<INR | USD | EUR | GBP, default INR>",
  "hourly_rate": <number or null>,
  "revision_count": <number of revisions agreed, default 2>,
  "project_start_date": "<date string or null>",
  "project_deadline": "<date string or null>",
  "payment_terms": "<how payment will be made>",
  "advance_percent": <advance percentage agreed, default 50>,
  "next_steps": ["<next step 1>", "<next step 2>"],
  "client_requirements": ["<requirement 1>", "<requirement 2>"],
  "things_not_included": ["<what is explicitly OUT of scope>"],
  "concerns_flagged": ["<any red flags or concerns mentioned>"],
  "meeting_summary": "<2-3 sentence professional summary of what was discussed and agreed>"
}

Rules:
- Extract ONLY what is actually mentioned in the notes
- If price is not mentioned, set total_price_agreed to null
- Be specific with deliverables — each item should be a concrete, billable deliverable
- If hourly rate and hours are mentioned, calculate total
- Flag any concerns or vague commitments in concerns_flagged"""


SCOPE_EMAIL_PROMPT = """You are a professional business communication expert for freelancers.
Based on the extracted meeting data, write a professional Scope Confirmation Email.

This email should:
1. Thank the client for the meeting
2. Confirm all deliverables clearly in a numbered list
3. Confirm the agreed price, payment terms, and timeline
4. State revision limits clearly
5. Mention what is NOT included (important for scope protection)
6. Ask them to confirm by replying to this email
7. End professionally

Write ONLY the email body (no subject line, that comes separately).
Keep it professional, clear, and under 300 words.
Use bullet points for deliverables and next steps."""





def _fallback_extraction(notes: str) -> dict:
    """Basic extraction when no API key configured."""
    return {
        "client_name": None,
        "project_name": "Project from meeting notes",
        "deliverables": [
            {"item": "As discussed in meeting", "description": notes[:200],
             "quantity": 1, "estimated_hours": None, "deadline": None}
        ],
        "total_price_agreed": None,
        "currency": "INR",
        "hourly_rate": None,
        "revision_count": 2,
        "project_start_date": None,
        "project_deadline": None,
        "payment_terms": "50% advance, 50% on delivery",
        "advance_percent": 50,
        "next_steps": ["Send scope confirmation email", "Receive advance payment"],
        "client_requirements": [],
        "things_not_included": [],
        "concerns_flagged": ["Add GROQ_API_KEY for AI-powered extraction"],
        "meeting_summary": "Meeting notes saved. Add GROQ_API_KEY to backend/.env for AI extraction.",
    }


class MeetingExtractionError(Exception):
    pass


async def extract_meeting_data(notes: str) -> dict:
    """Extracts structured data from raw meeting notes."""
    if not settings.GROQ_API_KEY:
        return _fallback_extraction(notes)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)

    structured_llm = llm.with_structured_output(MeetingExtraction)

    try:
        response = await structured_llm.ainvoke([
            SystemMessage(content=MEETING_EXTRACTION_PROMPT),
            HumanMessage(content=f"Extract from these meeting notes:\n\n{notes}"),
        ])
        data = response.model_dump()
    except Exception as exc:
        raise MeetingExtractionError(f"AI extraction failed: {exc}")

    # Ensure required fields exist
    data.setdefault("deliverables", [])
    data.setdefault("next_steps", [])
    data.setdefault("currency", "INR")
    data.setdefault("revision_count", 2)
    data.setdefault("advance_percent", 50)
    data.setdefault("concerns_flagged", [])
    data.setdefault("things_not_included", [])

    return data


async def generate_scope_email(
    extracted_data: dict,
    freelancer_name: str,
    business_name: str,
) -> dict:
    """Generates a professional scope confirmation email."""
    if not settings.GROQ_API_KEY:
        client = extracted_data.get("client_name", "Client")
        deliverables = extracted_data.get("deliverables", [])
        items_text = "\n".join([f"• {d['item']}" for d in deliverables])
        price = extracted_data.get("total_price_agreed")
        price_text = f"Total: {extracted_data.get('currency', 'INR')} {price:,.0f}" if price else "Price: TBD"

        body = f"""Hi {client},

Thank you for our meeting today. Here's a summary of what we discussed:

Deliverables:
{items_text}

{price_text}
Revisions: {extracted_data.get('revision_count', 2)} rounds included
Payment: {extracted_data.get('payment_terms', '50% advance, 50% on delivery')}

Please reply to confirm you're happy with this scope before we begin.

Best regards,
{freelancer_name}
{business_name}"""

        return {
            "subject": f"Scope Confirmation — {extracted_data.get('project_name', 'Our Project')}",
            "body": body,
        }

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.4)

    context = f"""
Freelancer: {freelancer_name} ({business_name})
Client: {extracted_data.get('client_name', 'Client')}
Project: {extracted_data.get('project_name', '')}
Deliverables: {json.dumps(extracted_data.get('deliverables', []))}
Total Price: {extracted_data.get('currency', 'INR')} {extracted_data.get('total_price_agreed', 'TBD')}
Payment Terms: {extracted_data.get('payment_terms', '50% advance')}
Deadline: {extracted_data.get('project_deadline', 'TBD')}
Revisions: {extracted_data.get('revision_count', 2)} rounds
Not Included: {', '.join(extracted_data.get('things_not_included', []))}
Next Steps: {', '.join(extracted_data.get('next_steps', []))}
"""

    response = await llm.ainvoke([
        SystemMessage(content=SCOPE_EMAIL_PROMPT),
        HumanMessage(content=context),
    ])

    project_name = extracted_data.get("project_name", "Our Project")
    client_name = extracted_data.get("client_name", "Client")
    subject = f"Scope Confirmation — {project_name} | {client_name}"

    return {"subject": subject, "body": response.content.strip()}