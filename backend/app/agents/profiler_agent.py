"""
AI Psychographic Client Profiler Agent.

CONCEPT: This agent reads ANY text a client has sent (email, WhatsApp,
LinkedIn bio, proposal request) and uses behavioral NLP to predict:
- Will they pay on time?
- Will they respect scope?
- Are they going to be difficult to work with?
- What negotiation approach works best for this personality type?

The insight comes from research in behavioral linguistics:
- Vague language ("flexible", "ASAP", "simple") = unclear expectations = risk
- Price-first language = budget-constrained = scope creep risk
- Authority language ("we need", "you must") = demanding personality
- Collaborative language ("we'd love", "together") = good working relationship

This is NOT keyword matching. We use the LLM to do genuine NLP analysis
because the same word can mean different things in different contexts.
"""
import json
import re
from typing import Optional

from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_groq import ChatGroq

class RedFlag(BaseModel):
    phrase: str
    risk: str
    reason: str

class ProfilerExtraction(BaseModel):
    overall_risk_score: int
    overall_risk_label: str
    client_type: str
    payment_behavior: str
    communication_style: str
    scope_respect: str
    professionalism_level: str
    red_flags: list[RedFlag] = []
    green_flags: list[str] = []
    negotiation_approach: str
    recommended_actions: list[str] = []
    questions_to_ask: list[str] = []
    summary: str

from app.core.config import settings


PROFILER_SYSTEM_PROMPT = """You are an expert behavioral analyst and business psychologist
specializing in freelance client assessment. Your job is to analyze text written by a
potential client (email, WhatsApp message, LinkedIn bio, project brief, or any communication)
and produce a detailed psychographic risk profile.

You combine expertise in:
- Behavioral linguistics (how word choice reveals personality)
- Payment psychology (language patterns that predict late payment)
- Project scope dynamics (how vague language leads to scope creep)
- Negotiation psychology (what communication style this client has)

Analyze the text deeply. Look for:

RED FLAG PATTERNS (risks):
- "ASAP" / "urgent" without a specific date = unclear deadline = HIGH risk
- "budget is flexible" without a number = no real budget = HIGH scope creep risk
- "it's a simple project" = client undervalues the work = LOW professionalism
- "my nephew does this for free" / competitor comparisons = price pressure
- "I'll know it when I see it" = no clear vision = revision nightmare
- Multiple exclamation marks / overly casual = may not take contract seriously
- No mention of their business / goals = unclear about what they actually need
- "Can you do something similar to X website?" without more detail = copying mindset
- "We can figure out the details later" = avoidance of commitment = HIGH risk
- Price mentioned before scope = budget-first, value-second mindset
- "We're a startup" without context = often means limited budget + high expectations

GREEN FLAG PATTERNS (positive signals):
- Specific deadline with reason ("launch before Diwali because...")
- Budget range mentioned upfront with context
- References to previous successful projects with freelancers
- Asks about your process, timeline, milestones = professional buyer
- Mentions contract / payment terms proactively
- Clear description of what success looks like
- Asks about your experience relevant to their specific need

CLIENT PERSONALITY TYPES:
- "The Hustler Startup": Fast-moving, limited budget, scope creep risk, but loyal if happy
- "The Corporate Gatekeeper": Follows process, slow decisions, multiple approvals needed
- "The Creative Director": Strong vision, opinionated, revision-heavy, values aesthetics
- "The Analytical Business Owner": Data-driven, asks ROI questions, fair but demanding
- "The Impulse Buyer": Excited now, may lose interest, needs quick commitment
- "The Chronic Negotiator": Always pushes for discounts regardless of value
- "The Ghost Risk": Vague, non-committal, may disappear after initial contact
- "The Ideal Client": Clear, professional, respects your time and expertise

Respond ONLY with valid JSON in this exact shape (no markdown, no explanation outside JSON):
{
  "overall_risk_score": <1-10, where 10 is highest risk>,
  "overall_risk_label": "<Low Risk | Medium Risk | High Risk>",
  "client_type": "<one of the personality types above or a custom descriptive label>",
  "payment_behavior": "<specific prediction about payment punctuality and behavior>",
  "communication_style": "<Direct | Vague | Demanding | Collaborative | Professional | Impulsive>",
  "scope_respect": "<prediction about whether they will respect agreed scope>",
  "professionalism_level": "<High | Medium | Low>",
  "red_flags": [
    {
      "phrase": "<exact phrase or pattern from the text>",
      "risk": "<HIGH | MEDIUM | LOW>",
      "reason": "<why this is a red flag and what risk it signals>"
    }
  ],
  "green_flags": ["<positive signal 1>", "<positive signal 2>"],
  "negotiation_approach": "<specific, actionable advice on HOW to negotiate with THIS client>",
  "recommended_actions": [
    "<concrete action 1>",
    "<concrete action 2>",
    "<concrete action 3>"
  ],
  "questions_to_ask": [
    "<question to clarify risk 1>",
    "<question to clarify risk 2>",
    "<question to clarify risk 3>"
  ],
  "summary": "<2-3 sentence plain-language verdict on this client>"
}

Be specific and honest. If the text is very short, work with what you have but note the
limited data. Never fabricate information that isn't in the text."""





def _fallback_profile(client_text: str) -> dict:
    """Returns a template-based profile when no API key is configured."""
    text_lower = client_text.lower()
    red_flags = []
    green_flags = []
    risk_score = 3

    if "asap" in text_lower or "urgent" in text_lower:
        red_flags.append({"phrase": "ASAP/urgent", "risk": "HIGH", "reason": "No specific deadline — unclear timeline expectations"})
        risk_score += 2
    if "flexible" in text_lower and "budget" in text_lower:
        red_flags.append({"phrase": "budget is flexible", "risk": "HIGH", "reason": "No real budget defined — scope creep risk"})
        risk_score += 2
    if "simple" in text_lower:
        red_flags.append({"phrase": "simple project", "risk": "MEDIUM", "reason": "Clients who say 'simple' often underestimate work"})
        risk_score += 1
    if "contract" in text_lower or "milestone" in text_lower:
        green_flags.append("Mentions contract or milestones — professional buyer")
    if "portfolio" in text_lower or "experience" in text_lower:
        green_flags.append("Asks about experience — values quality over price")

    risk_score = min(10, risk_score)
    risk_label = "High Risk" if risk_score >= 7 else "Medium Risk" if risk_score >= 4 else "Low Risk"

    return {
        "overall_risk_score": risk_score,
        "overall_risk_label": risk_label,
        "client_type": "Unknown — Add GROQ_API_KEY for deep analysis",
        "payment_behavior": "Cannot predict without AI analysis",
        "communication_style": "Vague" if risk_score >= 5 else "Professional",
        "scope_respect": "Uncertain — requires AI analysis",
        "professionalism_level": "Medium",
        "red_flags": red_flags,
        "green_flags": green_flags if green_flags else ["No strong positive signals detected"],
        "negotiation_approach": "Get scope and budget in writing before starting any work.",
        "recommended_actions": [
            "Ask for a specific budget number before proceeding",
            "Define deliverables in writing with clear revision limits",
            "Request 50% advance payment before starting",
        ],
        "questions_to_ask": [
            "What is your exact budget for this project?",
            "What is your specific deadline and why?",
            "Have you worked with freelancers before?",
        ],
        "summary": f"Basic analysis complete (risk score: {risk_score}/10). Add GROQ_API_KEY to backend/.env for full psychographic profiling.",
    }


class ProfilerError(Exception):
    pass


async def analyze_client_profile(client_text: str) -> dict:
    """
    Main entry point: analyzes client text and returns a full psychographic profile.
    """
    if not client_text.strip():
        raise ProfilerError("No client text provided. Paste an email, message, or bio to analyze.")

    if not settings.GROQ_API_KEY:
        return _fallback_profile(client_text)

    llm = ChatGroq(
        model=settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
        temperature=0.2,  # low temperature for consistent, analytical output
    )

    structured_llm = llm.with_structured_output(ProfilerExtraction)

    try:
        response = await structured_llm.ainvoke([
            SystemMessage(content=PROFILER_SYSTEM_PROMPT),
            HumanMessage(content=f"Analyze this client text:\n\n{client_text}"),
        ])
        data = response.model_dump()
    except Exception as exc:
        raise ProfilerError(f"AI analysis failed: {exc}")

    # Validate and sanitize required fields
    required_fields = [
        "overall_risk_score", "overall_risk_label", "client_type",
        "payment_behavior", "communication_style", "scope_respect",
        "professionalism_level", "red_flags", "green_flags",
        "negotiation_approach", "recommended_actions", "questions_to_ask", "summary"
    ]
    for field in required_fields:
        if field not in data:
            data[field] = [] if field in ("red_flags", "green_flags", "recommended_actions", "questions_to_ask") else "Not analyzed"

    # Clamp risk score
    try:
        data["overall_risk_score"] = max(1, min(10, int(data["overall_risk_score"])))
    except (ValueError, TypeError):
        data["overall_risk_score"] = 5

    return data