from pydantic import BaseModel
from typing import Optional


class ProfileClientRequest(BaseModel):
    client_text: str  # email, WhatsApp message, LinkedIn bio — anything the freelancer pastes
    client_id: Optional[str] = None  # optionally link to a saved client


class RedFlag(BaseModel):
    phrase: str
    risk: str       # "HIGH" | "MEDIUM" | "LOW"
    reason: str


class ClientProfileOut(BaseModel):
    # Overall
    overall_risk_score: int         # 1-10 (10 = very risky client)
    overall_risk_label: str         # "Low Risk" | "Medium Risk" | "High Risk"
    client_type: str                # e.g. "Budget-Conscious Startup", "Demanding Corporate"

    # Behavioral predictions
    payment_behavior: str           # "Likely to pay on time" | "Risk of delayed payment" etc.
    communication_style: str        # "Direct" | "Vague" | "Demanding" | "Professional"
    scope_respect: str              # "Likely to respect scope" | "High scope creep risk"
    professionalism_level: str      # "High" | "Medium" | "Low"

    # Red flags found in the text
    red_flags: list[RedFlag]

    # Positive signals
    green_flags: list[str]

    # Actionable advice
    negotiation_approach: str       # specific advice for THIS type of client
    recommended_actions: list[str]  # concrete next steps
    questions_to_ask: list[str]     # questions to clarify risk before signing

    # Summary
    summary: str                    # 2-3 sentence plain-language verdict