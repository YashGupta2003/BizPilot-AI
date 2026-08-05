"""
AI Invoice Dispute Resolver Agent.

SYNCHRONIZATION — this agent reads from ALL existing collections:
- invoices      → find the disputed invoice, payment status, amount
- contracts     → pull relevant clauses (payment terms, revision policy, kill fee)
- meetings      → extract what was agreed verbally in meeting notes
- whatsapp_reminders → show reminder history (proves follow-up was done)
- client_profiles → use risk profile to calibrate response tone

RESPONSE TYPES:
1. FIRM DENIAL    → client is wrong, evidence is clear, professional pushback
2. FAIR RESOLUTION → client has a partial point, suggest compromise
3. LEGAL ESCALATION → client is being dishonest/abusive, escalate tone
4. CLARIFICATION   → not enough info, ask clarifying questions first

The agent reads ALL the freelancer's data for this client and uses it
as evidence in the response — this is what makes it unique.
"""
import json
import re
from typing import Optional
from pydantic import BaseModel
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

class DisputeExtraction(BaseModel):
    dispute_type: str
    client_has_valid_point: bool
    validity_reason: str
    recommended_response_type: str
    evidence_found: list[str] = []
    response_subject: str
    response_body: str
    escalation_letter: Optional[str] = None
    suggested_resolution: Optional[str] = None
    red_flags: list[str] = []
    next_steps: list[str] = []
from app.core.config import settings


DISPUTE_ANALYSIS_PROMPT = """You are an expert business dispute resolution specialist
for freelancers. You help freelancers respond to client disputes professionally,
firmly, and with evidence.

You have access to the freelancer's full business data for this client:
- Invoice records (what was billed, when, payment status)
- Contract clauses (what was agreed legally)
- Meeting notes (what was discussed and confirmed)
- Reminder history (proof of professional follow-up)
- Client risk profile (how risky/difficult this client is)

Analyze the dispute message and all provided context, then respond with JSON:
{
  "dispute_type": "<PAYMENT_DENIAL | QUALITY_COMPLAINT | SCOPE_DISPUTE | REFUND_REQUEST | TIMELINE_COMPLAINT | OTHER>",
  "client_has_valid_point": <true/false>,
  "validity_reason": "<why client does or does not have a valid point>",
  "recommended_response_type": "<FIRM_DENIAL | FAIR_RESOLUTION | LEGAL_ESCALATION | CLARIFICATION>",
  "evidence_found": [
    "<specific evidence point 1 from the data>",
    "<specific evidence point 2 from the data>"
  ],
  "response_subject": "<email subject line>",
  "response_body": "<full professional response email body — firm but respectful, references evidence>",
  "escalation_letter": "<optional — formal legal-tone letter if LEGAL_ESCALATION>",
  "suggested_resolution": "<if client has valid point — what fair compromise to offer>",
  "red_flags": ["<warning signs in this dispute>"],
  "next_steps": ["<what the freelancer should do next>"]
}

RESPONSE TONE GUIDELINES:
- FIRM_DENIAL: Professional, confident, evidence-based. Not aggressive. "As per our agreement..."
- FAIR_RESOLUTION: Empathetic but clear. Acknowledge their concern, propose specific resolution.
- LEGAL_ESCALATION: Formal legal language. Reference specific clauses. Mention legal options.
- CLARIFICATION: Calm, professional. Ask specific questions before taking position.

Always reference specific evidence from the provided data.
Never be rude, never apologize unnecessarily, never make promises not in the contract."""





def _build_context_summary(
    dispute_message: str,
    invoices: list,
    contracts: list,
    meetings: list,
    reminders: list,
    client_profile: Optional[dict],
    client_name: str,
    freelancer_name: str,
) -> str:
    """Builds a rich context string from all available data for the LLM."""

    context = f"""DISPUTE MESSAGE FROM CLIENT ({client_name}):
"{dispute_message}"

FREELANCER: {freelancer_name}

--- INVOICE DATA ---
"""
    if invoices:
        for inv in invoices[:5]:
            context += f"- Invoice {inv.get('invoice_number', 'N/A')}: ₹{inv.get('total', 0):,.0f} | Status: {inv.get('status', 'unknown')} | Date: {inv.get('issue_date', 'N/A')}\n"
            items = inv.get('items', [])
            for item in items[:3]:
                context += f"  • {item.get('description', '')} — Qty: {item.get('quantity', 1)} × ₹{item.get('rate', 0):,.0f}\n"
    else:
        context += "No invoices found for this client.\n"

    context += "\n--- CONTRACT DATA ---\n"
    if contracts:
        for c in contracts[:2]:
            contract = c.get('contract', {})
            context += f"- Contract: {contract.get('contract_title', 'N/A')}\n"
            context += f"  Payment terms: {contract.get('payment_section', 'N/A')[:200]}\n"
            context += f"  Revisions: {contract.get('revisions_section', 'N/A')[:150]}\n"
            context += f"  Kill fee: {contract.get('kill_fee_section', 'N/A')[:150]}\n"
            context += f"  IP clause: {contract.get('ip_section', 'N/A')[:150]}\n"
    else:
        context += "No contracts on file for this client.\n"

    context += "\n--- MEETING NOTES ---\n"
    if meetings:
        for m in meetings[:3]:
            extracted = m.get('extracted', {})
            context += f"- Meeting: {extracted.get('project_name', 'N/A')}\n"
            context += f"  Agreed price: {extracted.get('currency', 'INR')} {extracted.get('total_price_agreed', 'N/A')}\n"
            context += f"  Revisions agreed: {extracted.get('revision_count', 'N/A')}\n"
            context += f"  Deadline: {extracted.get('project_deadline', 'N/A')}\n"
            deliverables = extracted.get('deliverables', [])
            if deliverables:
                context += f"  Deliverables agreed: {', '.join([d.get('item', '') for d in deliverables[:5]])}\n"
    else:
        context += "No meeting notes on file.\n"

    context += "\n--- REMINDER HISTORY ---\n"
    if reminders:
        context += f"Total reminders sent: {len(reminders)}\n"
        for r in reminders[:3]:
            context += f"- Sent on {r.get('sent_date', 'N/A')} to {r.get('client_phone', 'N/A')}\n"
    else:
        context += "No payment reminders sent yet.\n"

    context += "\n--- CLIENT RISK PROFILE ---\n"
    if client_profile:
        profile = client_profile.get('profile', {})
        context += f"Risk score: {profile.get('overall_risk_score', 5)}/10\n"
        context += f"Client type: {profile.get('client_type', 'Unknown')}\n"
        context += f"Payment behavior prediction: {profile.get('payment_behavior', 'Unknown')}\n"
        red_flags = profile.get('red_flags', [])
        if red_flags:
            context += f"Known red flags: {', '.join([f.get('phrase', '') for f in red_flags[:3]])}\n"
    else:
        context += "No psychographic profile available for this client.\n"

    return context


def _fallback_response(dispute_message: str, client_name: str, freelancer_name: str) -> dict:
    """Template response when no API key configured."""
    return {
        "dispute_type": "OTHER",
        "client_has_valid_point": False,
        "validity_reason": "Add GROQ_API_KEY for AI analysis of this dispute.",
        "recommended_response_type": "FIRM_DENIAL",
        "evidence_found": ["Invoice records on file", "Contract terms agreed"],
        "response_subject": f"Re: Your concern about our project",
        "response_body": f"""Dear {client_name},

Thank you for reaching out. I take all concerns seriously and want to resolve this professionally.

Regarding your message: "{dispute_message[:100]}..."

As per our signed agreement, the work was delivered as specified. I'm happy to review the specifics with you.

Could you please clarify exactly which aspect you're referring to so I can address it with the relevant documentation?

I look forward to resolving this quickly.

Best regards,
{freelancer_name}""",
        "escalation_letter": None,
        "suggested_resolution": "Please add GROQ_API_KEY to backend/.env for AI-powered dispute analysis.",
        "red_flags": [],
        "next_steps": [
            "Add GROQ_API_KEY for full AI dispute analysis",
            "Gather all relevant invoices and contracts",
            "Respond professionally and promptly",
        ],
    }


class DisputeAnalysisError(Exception):
    pass


async def analyze_dispute(
    dispute_message: str,
    invoices: list,
    contracts: list,
    meetings: list,
    reminders: list,
    client_profile: Optional[dict],
    client_name: str,
    freelancer_name: str,
) -> dict:
    """Main entry point — analyzes dispute and generates response."""

    if not settings.GROQ_API_KEY:
        return _fallback_response(dispute_message, client_name, freelancer_name)

    llm = ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
        temperature=0.2,
    )

    context = _build_context_summary(
        dispute_message, invoices, contracts, meetings,
        reminders, client_profile, client_name, freelancer_name,
    )

    structured_llm = llm.with_structured_output(DisputeExtraction)

    try:
        response = await structured_llm.ainvoke([
            SystemMessage(content=DISPUTE_ANALYSIS_PROMPT),
            HumanMessage(content=context),
        ])
        data = response.model_dump()
    except Exception as exc:
        raise DisputeAnalysisError(f"AI analysis failed: {exc}")

    # Ensure all required fields exist
    data.setdefault("dispute_type", "OTHER")
    data.setdefault("client_has_valid_point", False)
    data.setdefault("recommended_response_type", "FIRM_DENIAL")
    data.setdefault("evidence_found", [])
    data.setdefault("response_subject", "Re: Your concern")
    data.setdefault("response_body", "")
    data.setdefault("escalation_letter", None)
    data.setdefault("suggested_resolution", None)
    data.setdefault("red_flags", [])
    data.setdefault("next_steps", [])

    return data