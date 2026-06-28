"""
Smart Contract Risk Analyzer Agent.

CONCEPT: This is different from the RAG Q&A agent. RAG answers a SPECIFIC
question using a few relevant chunks. This agent is PROACTIVE — it reads the
ENTIRE contract (not just top-k similar chunks) and actively looks for
problems the freelancer didn't even know to ask about, like missing clauses
or unfavorable terms.

We ask the LLM to return strict JSON describing what it found, then validate
that JSON with Pydantic before it ever reaches the database or the frontend.
If the LLM's output doesn't parse, we fail safely with a clear error instead
of crashing or saving garbage data.
"""
import json
import re
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

from app.core.config import settings
from app.schemas.risk_schema import RiskFlag

# Categories we specifically ask the model to check — this keeps the analysis
# focused and consistent across different contracts, rather than letting the
# LLM wander and produce wildly different structures each time.
RISK_CATEGORIES = [
    "Payment Terms",
    "Advance Payment",
    "Cancellation Policy",
    "Revisions / Scope Creep",
    "Intellectual Property Rights",
    "Late Payment Penalty",
    "Termination Clause",
    "Confidentiality",
    "Liability",
]

RISK_ANALYZER_PROMPT = """You are a Contract Risk Analyzer for freelancers. You read \
a contract or service agreement and proactively flag risks that could harm the \
freelancer financially or legally — BEFORE they sign it.

Check specifically for these categories: {categories}

For EACH category, decide: is there a clause covering it, is it present but \
unfavorable to the freelancer, or is it missing entirely?

Respond with ONLY valid JSON (no markdown fences, no explanation outside the JSON), \
in exactly this shape:

{{
  "overall_risk_level": "high" | "medium" | "low",
  "summary": "2-3 sentence plain-language summary of the contract's overall risk for the freelancer",
  "flags": [
    {{
      "category": "one of the categories above",
      "severity": "high" | "medium" | "low",
      "finding": "what you found, in plain language, quoting the relevant idea (not verbatim long text)",
      "recommendation": "a specific, actionable suggestion for the freelancer"
    }}
  ],
  "missing_clauses": ["list of category names that are completely absent from the contract"]
}}

Rules:
- Only include a flag in "flags" if something is actually unfavorable, ambiguous, or risky. \
Do NOT flag a clause just because it exists and is fair to both parties.
- "missing_clauses" should list categories that have NO mention anywhere in the contract at all.
- If the contract is genuinely fair and low-risk, say so honestly in the summary and keep "flags" short.
- Never invent clauses that aren't in the text. Base every finding only on the actual contract content given.
"""


def _get_llm():
    if not settings.GROQ_API_KEY:
        return None
    return ChatGroq(model=settings.GROQ_MODEL, api_key=settings.GROQ_API_KEY, temperature=0)


def _extract_json(raw: str) -> dict:
    """
    LLMs sometimes wrap JSON in markdown fences or add stray text before/after
    the JSON object even when explicitly told not to. This strips common
    wrapping patterns and extracts the first complete {...} block, so a small
    formatting slip from the model doesn't break the whole feature.
    """
    text = raw.strip()
    text = re.sub(r"^```(?:json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()

    # If there's still leading/trailing noise, grab the outermost JSON object.
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    return json.loads(text)


class RiskAnalysisError(Exception):
    """Raised when the LLM's output can't be parsed into a valid risk report."""
    pass


async def analyze_contract_risk(document_text: str) -> dict:
    """
    Runs the full document through the risk-analyzer LLM and returns a
    validated dict matching ContractRiskReportOut's shape (minus the
    id/filename/analyzed_at fields, which the route layer fills in).

    Raises RiskAnalysisError if the LLM output can't be parsed/validated,
    so the caller can return a clean 502 to the frontend instead of crashing.
    """
    llm = _get_llm()
    if llm is None:
        raise RiskAnalysisError(
            "No GROQ_API_KEY configured in backend/.env — the risk analyzer needs an LLM to run."
        )

    # Very long contracts: cap input size so we stay within the model's
    # context window and keep latency reasonable. 12000 chars is generous
    # for a typical freelance service agreement (roughly 8-10 pages).
    trimmed_text = document_text.strip()[:12000]

    prompt = RISK_ANALYZER_PROMPT.format(categories=", ".join(RISK_CATEGORIES))

    response = await llm.ainvoke([
        SystemMessage(content=prompt),
        HumanMessage(content=f"Contract text:\n\n{trimmed_text}"),
    ])

    try:
        parsed = _extract_json(response.content)
    except (json.JSONDecodeError, ValueError) as exc:
        raise RiskAnalysisError(f"Could not parse the AI's analysis as valid JSON: {exc}")

    # Validate structure before trusting it — this is the safety net against
    # the LLM hallucinating a slightly different shape.
    try:
        overall_risk_level = str(parsed["overall_risk_level"]).lower()
        if overall_risk_level not in {"high", "medium", "low"}:
            overall_risk_level = "medium"

        summary = str(parsed["summary"])

        flags_raw = parsed.get("flags", [])
        flags = []
        for f in flags_raw:
            flag = RiskFlag(
                category=str(f.get("category", "General")),
                severity=str(f.get("severity", "medium")).lower() if str(f.get("severity", "medium")).lower() in {"high", "medium", "low"} else "medium",
                finding=str(f.get("finding", "")),
                recommendation=str(f.get("recommendation", "")),
            )
            flags.append(flag.model_dump())

        missing_clauses = [str(c) for c in parsed.get("missing_clauses", [])]

    except (KeyError, TypeError) as exc:
        raise RiskAnalysisError(f"The AI's analysis was missing an expected field: {exc}")

    return {
        "overall_risk_level": overall_risk_level,
        "summary": summary,
        "flags": flags,
        "missing_clauses": missing_clauses,
    }