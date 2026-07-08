from pydantic import BaseModel
from typing import Optional


class StartSessionRequest(BaseModel):
    scenario_id: str
    service_type: str = "Web Development"
    asking_rate: float = 5000
    currency: str = "INR"


class NegotiationMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None
    coach_triggered: bool = False


class SendMessageRequest(BaseModel):
    session_id: str
    message: str


class ScoreBreakdown(BaseModel):
    assertiveness: int
    professionalism: int
    value_articulation: int
    pushback_handling: int
    outcome_score: int
    overall: float
    grade: str
    strengths: list[str]
    improvements: list[str]
    final_verdict: str


class NegotiationSessionOut(BaseModel):
    session_id: str
    scenario_id: str
    scenario_name: str
    scenario_difficulty: str
    service_type: str
    asking_rate: float
    currency: str
    status: str
    messages: list[NegotiationMessage]
    score: Optional[ScoreBreakdown] = None
    turn_count: int = 0