"""
Smart Contract Clause Generator.

Generates legally-aware, project-specific freelance contracts using AI.

SYNCHRONIZATION:
- Reads from 'clients' collection to auto-fill client details
- Saves to 'contracts' collection (new)
- Links to invoice via project_type + client_id
- Risk Analyzer (risk_routes.py) can reference saved contracts
- Client Profiler can warn if client has a history of modifying contracts

CONTRACT SECTIONS GENERATED:
1. Parties and project scope
2. Payment terms + milestones + kill fee
3. Revision policy with hard limits
4. Intellectual property ownership
5. Confidentiality
6. Termination clause
7. Late payment penalties
8. Dispute resolution
"""
import json
import re
from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from app.core.config import settings


CONTRACT_SYSTEM_PROMPT = """You are an expert legal drafting assistant specializing in
freelance service agreements. You generate professional, legally-sound contracts that
PROTECT THE FREELANCER while remaining fair to the client.

You understand:
- Freelance law in India and internationally
- IP ownership for creative/technical work
- Payment protection mechanisms (kill fees, advance payments, milestones)
- Scope management (how to limit revisions contractually)
- Jurisdiction-specific clauses (Indian law vs US law vs UK law)

Generate a COMPLETE, ready-to-sign freelance contract based on the project details provided.

CONTRACT REQUIREMENTS:
1. Use clear, professional language — not overly legalese but legally sound
2. Include ALL standard protective clauses for a freelancer
3. Make payment terms crystal clear with specific dates/percentages
4. Define exactly what is and isn't included in scope
5. Include a kill fee (typically 25-50% of remaining balance if client cancels)
6. Specify IP ownership transfer only upon FULL payment received
7. Limit revisions to a specific number (e.g., 2 rounds included)
8. Include a late payment penalty clause (typically 1.5-2% per month)
9. Add a dispute resolution clause appropriate to the jurisdiction

Respond ONLY with valid JSON in this exact shape:
{
  "contract_title": "<e.g. Web Development Service Agreement>",
  "parties_section": "<full text of the Parties section>",
  "scope_section": "<full text describing exactly what is and is NOT included>",
  "payment_section": "<full payment terms with amounts, dates, milestones>",
  "revisions_section": "<revision policy with hard limits>",
  "ip_section": "<intellectual property ownership clause>",
  "confidentiality_section": "<confidentiality obligations>",
  "kill_fee_section": "<kill fee and cancellation policy>",
  "late_payment_section": "<late payment penalties>",
  "termination_section": "<how either party can terminate>",
  "dispute_section": "<dispute resolution process>",
  "governing_law": "<which jurisdiction's law governs this contract>",
  "plain_english_summary": {
    "what_you_get": ["<key protection 1>", "<key protection 2>", "<key protection 3>"],
    "payment_flow": "<simple description of when money flows>",
    "what_to_watch": ["<risk to watch for 1>", "<risk to watch for 2>"]
  },
  "recommended_advance_percent": <number like 50>,
  "recommended_kill_fee_percent": <number like 30>,
  "total_sections": <number of sections>,
  "risk_level_for_freelancer": "<Low | Medium | High>",
  "risk_notes": "<why this project type has this risk level>"
}"""


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1:
        text = text[first:last + 1]
    return json.loads(text)


def _fallback_contract(
    project_type: str,
    client_name: str,
    freelancer_name: str,
    amount: float,
    currency: str,
    duration_weeks: int,
    milestones: int,
    client_country: str,
) -> dict:
    """Template contract when no API key is configured."""
    advance = round(amount * 0.5, 2)
    milestone_amount = round(amount * 0.3, 2)
    final = round(amount * 0.2, 2)
    kill_fee = round(amount * 0.3, 2)

    return {
        "contract_title": f"{project_type} Service Agreement",
        "parties_section": f"This agreement is between {freelancer_name} ('Freelancer') and {client_name} ('Client').",
        "scope_section": f"Freelancer agrees to provide {project_type} services as discussed. Any work outside this scope requires a separate agreement.",
        "payment_section": f"Total: {currency} {amount:,.0f}. 50% advance ({currency} {advance:,.0f}) before work begins. 30% ({currency} {milestone_amount:,.0f}) at midpoint. 20% ({currency} {final:,.0f}) on delivery.",
        "revisions_section": "Two (2) rounds of revisions are included. Additional revisions billed at hourly rate.",
        "ip_section": "All intellectual property transfers to Client only upon receipt of full payment.",
        "confidentiality_section": "Both parties agree to keep project details confidential for 2 years.",
        "kill_fee_section": f"If Client cancels after work begins, a kill fee of {currency} {kill_fee:,.0f} (30%) is due immediately.",
        "late_payment_section": "Invoices unpaid after 14 days incur a 2% monthly late fee.",
        "termination_section": "Either party may terminate with 7 days written notice. All completed work must be paid for.",
        "dispute_section": f"Disputes resolved by mediation in {client_country}. Governing law: {client_country}.",
        "governing_law": client_country,
        "plain_english_summary": {
            "what_you_get": [
                "50% payment upfront before any work starts",
                "Kill fee protects you if client cancels mid-project",
                "IP only transfers after full payment received",
            ],
            "payment_flow": f"₹{advance:,.0f} before start → ₹{milestone_amount:,.0f} at midpoint → ₹{final:,.0f} on delivery",
            "what_to_watch": [
                "Ensure client signs before starting ANY work",
                "Document all revision requests in writing",
            ],
        },
        "recommended_advance_percent": 50,
        "recommended_kill_fee_percent": 30,
        "total_sections": 10,
        "risk_level_for_freelancer": "Medium",
        "risk_notes": "Add GROQ_API_KEY for project-specific legal risk analysis.",
    }


class ContractError(Exception):
    pass


async def generate_contract(
    project_type: str,
    client_name: str,
    freelancer_name: str,
    amount: float,
    currency: str,
    duration_weeks: int,
    milestones: int,
    client_country: str,
    project_description: str = "",
    special_requirements: str = "",
) -> dict:
    """Generates a complete freelance contract using AI."""

    if not settings.GROQ_API_KEY:
        return _fallback_contract(
            project_type, client_name, freelancer_name,
            amount, currency, duration_weeks, milestones, client_country
        )

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)

    prompt = f"""Generate a freelance contract for:
- Project Type: {project_type}
- Client Name: {client_name}
- Freelancer Name: {freelancer_name}
- Total Amount: {currency} {amount:,.0f}
- Duration: {duration_weeks} weeks
- Number of Milestones: {milestones}
- Client Country/Jurisdiction: {client_country}
- Project Description: {project_description or 'Standard ' + project_type + ' project'}
- Special Requirements: {special_requirements or 'None'}

Make it strongly protective of the freelancer while remaining professional and fair."""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=CONTRACT_SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ])
    except Exception as exc:
        raise ContractError(f"AI contract generation failed: {exc}")

    try:
        data = _extract_json(response.content)
    except (json.JSONDecodeError, ValueError) as exc:
        raise ContractError(f"Could not parse AI response: {exc}")

    required = ["contract_title", "parties_section", "payment_section", "ip_section"]
    for field in required:
        if field not in data:
            raise ContractError(f"AI response missing required field: {field}")

    return data