"""
Project Scope Drift Detector Agent.

SYNCHRONIZATION — reads from ALL existing collections:
- meetings      → original scope from meeting notes (SYNC: auto-fills locked scope)
- contracts     → scope section from generated contracts
- invoices      → project value to calculate extra billing amount
- clients       → client context for change order email
- disputes      → if scope drift led to a dispute, flag it

PIPELINE:
1. Freelancer locks scope (from meeting notes OR contract OR manual input)
2. Weekly: paste current tasks / client messages
3. AI compares new tasks against locked scope
4. Flags drift items with severity + estimated extra value
5. Drafts change order email automatically
"""
import json
import re
from datetime import datetime
from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq
from app.core.config import settings


SCOPE_LOCK_PROMPT = """You are a project scope analyzer for freelancers.
Extract the EXACT deliverables from the provided text (meeting notes, contract, or brief).
Be very specific — each deliverable should be a concrete, measurable item.

Respond ONLY with valid JSON:
{
  "deliverables": [
    {
      "item": "<specific deliverable>",
      "description": "<details>",
      "estimated_hours": <number or null>,
      "is_included": true
    }
  ],
  "explicitly_excluded": ["<thing NOT included 1>", "<thing NOT included 2>"],
  "revision_limit": <number or null>,
  "total_estimated_value": <number or null>,
  "currency": "<INR or USD etc>",
  "summary": "<1 sentence summary of the agreed scope>"
}"""


DRIFT_DETECTION_PROMPT = """You are a scope drift detector for freelancers.
Compare the ORIGINAL LOCKED SCOPE against the CURRENT TASKS/MESSAGES provided.
Identify any work that was NOT in the original scope.

Be very precise:
- Only flag items that are clearly OUTSIDE the original scope
- Don't flag items that are reasonable sub-tasks of agreed deliverables
- Consider explicitly excluded items as definite scope drift

Respond ONLY with valid JSON:
{
  "drift_detected": <true/false>,
  "drift_items": [
    {
      "description": "<what the client asked for / new task>",
      "severity": "<HIGH | MEDIUM | LOW>",
      "reason": "<why this is outside original scope>",
      "estimated_hours": <number>,
      "estimated_value": <number in original currency>,
      "source": "<exact quote or description from current input>"
    }
  ],
  "items_in_scope": ["<task that IS within scope 1>", "<task in scope 2>"],
  "total_extra_value": <sum of all drift item values>,
  "total_extra_hours": <sum of all drift item hours>,
  "scope_completion_percent": <0-100, how much of original scope is done>,
  "recommendation": "<what the freelancer should do — 1-2 sentences>",
  "urgency": "<IMMEDIATE | SOON | LOW>"
}"""


CHANGE_ORDER_PROMPT = """You are a professional business communication expert for freelancers.
Draft a polite but firm Change Order Request email based on the scope drift detected.

The email should:
1. Reference the original agreement
2. List the new/additional work requested clearly
3. State the additional cost and timeline impact
4. Ask client to approve the change order before proceeding
5. Be professional, not accusatory — assume client didn't realize this was extra work

Output ONLY the email body. Under 250 words. Professional tone."""


def _extract_json(raw: str) -> dict:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1:
        text = text[first:last + 1]
    return json.loads(text)


def _estimate_value_from_hours(hours: float, default_rate: float = 1500) -> float:
    """Estimate rupee value from hours at default rate."""
    return round(hours * default_rate, 2)


async def extract_scope_from_text(text: str) -> dict:
    """
    Extracts structured scope from any text — meeting notes,
    contract sections, project brief, WhatsApp conversation.
    SYNC: called with data from meetings or contracts collections.
    """
    if not settings.GROQ_API_KEY:
        return _fallback_scope_extraction(text)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)

    try:
        response = await llm.ainvoke([
            SystemMessage(content=SCOPE_LOCK_PROMPT),
            HumanMessage(content=f"Extract scope from:\n\n{text}"),
        ])
        data = _extract_json(response.content)
    except Exception:
        return _fallback_scope_extraction(text)

    data.setdefault("deliverables", [])
    data.setdefault("explicitly_excluded", [])
    data.setdefault("revision_limit", None)
    data.setdefault("total_estimated_value", None)
    data.setdefault("currency", "INR")
    data.setdefault("summary", "Scope extracted from provided text.")
    return data


def _fallback_scope_extraction(text: str) -> dict:
    lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
    deliverables = [{"item": l, "description": "", "estimated_hours": None, "is_included": True}
                    for l in lines[:10]]
    return {
        "deliverables": deliverables,
        "explicitly_excluded": [],
        "revision_limit": 2,
        "total_estimated_value": None,
        "currency": "INR",
        "summary": "Scope locked from provided text. Add GROQ_API_KEY for AI extraction.",
    }


async def detect_scope_drift(
    locked_scope: dict,
    current_input: str,
    hourly_rate: float = 1500,
) -> dict:
    """
    Compares current tasks/messages against the locked scope.
    Returns detected drift items with estimated extra cost.
    """
    if not current_input.strip():
        return {"drift_detected": False, "drift_items": [], "total_extra_value": 0}

    if not settings.GROQ_API_KEY:
        return _fallback_drift_detection(current_input, locked_scope, hourly_rate)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.1)

    scope_summary = f"""ORIGINAL LOCKED SCOPE:
Summary: {locked_scope.get('summary', 'N/A')}

Deliverables included:
{chr(10).join([f"- {d['item']}: {d.get('description', '')}" for d in locked_scope.get('deliverables', [])])}

Explicitly NOT included:
{chr(10).join([f"- {e}" for e in locked_scope.get('explicitly_excluded', [])]) or "Nothing specified"}

Revision limit: {locked_scope.get('revision_limit', 'Not specified')}
Total agreed value: {locked_scope.get('currency', 'INR')} {locked_scope.get('total_estimated_value', 'Not specified')}
Hourly rate: {locked_scope.get('currency', 'INR')} {hourly_rate}/hour

CURRENT TASKS / CLIENT MESSAGES:
{current_input}"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=DRIFT_DETECTION_PROMPT),
            HumanMessage(content=scope_summary),
        ])
        data = _extract_json(response.content)
    except Exception:
        return _fallback_drift_detection(current_input, locked_scope, hourly_rate)

    # Ensure estimated values are calculated
    for item in data.get("drift_items", []):
        if not item.get("estimated_value") and item.get("estimated_hours"):
            item["estimated_value"] = _estimate_value_from_hours(
                item["estimated_hours"], hourly_rate
            )

    data["total_extra_value"] = sum(
        item.get("estimated_value", 0) for item in data.get("drift_items", [])
    )
    data["total_extra_hours"] = sum(
        item.get("estimated_hours", 0) for item in data.get("drift_items", [])
    )

    data.setdefault("items_in_scope", [])
    data.setdefault("scope_completion_percent", 0)
    data.setdefault("recommendation", "Review the flagged items with your client.")
    data.setdefault("urgency", "SOON")

    return data


def _fallback_drift_detection(current_input: str, locked_scope: dict, hourly_rate: float) -> dict:
    """Basic keyword-based drift detection when no API key."""
    scope_keywords = set()
    for d in locked_scope.get("deliverables", []):
        scope_keywords.update(d.get("item", "").lower().split())

    drift_signals = [
        "also", "additionally", "by the way", "can you also", "one more thing",
        "forgot to mention", "while you're at it", "could you add", "we need",
        "new feature", "new page", "new section", "extra", "bonus",
    ]

    detected = []
    lines = current_input.split('\n')
    for line in lines:
        line_lower = line.lower()
        if any(signal in line_lower for signal in drift_signals):
            detected.append({
                "description": line.strip()[:200],
                "severity": "MEDIUM",
                "reason": "Contains scope-expansion language",
                "estimated_hours": 4,
                "estimated_value": _estimate_value_from_hours(4, hourly_rate),
                "source": line.strip()[:200],
            })

    return {
        "drift_detected": len(detected) > 0,
        "drift_items": detected[:5],
        "items_in_scope": [],
        "total_extra_value": sum(d["estimated_value"] for d in detected),
        "total_extra_hours": sum(d["estimated_hours"] for d in detected),
        "scope_completion_percent": 50,
        "recommendation": "Add GROQ_API_KEY for detailed AI drift analysis." if not settings.GROQ_API_KEY else "",
        "urgency": "SOON" if detected else "LOW",
    }


async def generate_change_order_email(
    drift_data: dict,
    locked_scope: dict,
    client_name: str,
    freelancer_name: str,
    project_name: str,
) -> dict:
    """Generates a professional change order request email."""
    if not settings.GROQ_API_KEY:
        return _fallback_change_order(drift_data, client_name, freelancer_name, project_name)

    llm = ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0.3)

    context = f"""
Client: {client_name}
Freelancer: {freelancer_name}
Project: {project_name}
Original scope summary: {locked_scope.get('summary', 'As agreed')}

Scope drift detected:
{chr(10).join([f"- {item['description']} (est. {item.get('estimated_hours', 2)}h, ₹{item.get('estimated_value', 0):,.0f})" for item in drift_data.get('drift_items', [])])}

Total additional cost: ₹{drift_data.get('total_extra_value', 0):,.0f}
Total additional hours: {drift_data.get('total_extra_hours', 0)}h
"""

    try:
        response = await llm.ainvoke([
            SystemMessage(content=CHANGE_ORDER_PROMPT),
            HumanMessage(content=context),
        ])
        body = response.content.strip()
    except Exception:
        return _fallback_change_order(drift_data, client_name, freelancer_name, project_name)

    return {
        "subject": f"Change Order Request — {project_name}",
        "body": body,
    }


def _fallback_change_order(drift_data, client_name, freelancer_name, project_name):
    items = drift_data.get("drift_items", [])
    items_text = "\n".join([f"• {item['description']} — est. ₹{item.get('estimated_value', 0):,.0f}" for item in items])
    total = drift_data.get("total_extra_value", 0)
    hours = drift_data.get("total_extra_hours", 0)

    body = f"""Hi {client_name},

I hope the project is going well! As we continue working together, I wanted to flag some additional work requests that fall outside our original agreed scope.

Additional work identified:
{items_text}

These items would require approximately {hours} additional hours, at an additional cost of ₹{total:,.0f}.

To proceed with this additional work, I'd need your approval on a Change Order for the above amount. Once approved, I'll incorporate these changes into the timeline.

Our original agreed scope remains on track and will be delivered as planned.

Could you please reply to confirm your approval of this change order?

Best regards,
{freelancer_name}"""

    return {
        "subject": f"Change Order Request — {project_name}",
        "body": body,
    }