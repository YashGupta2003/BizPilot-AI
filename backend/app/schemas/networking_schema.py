from pydantic import BaseModel
from typing import List, Optional

class NetworkingAnalysisRequest(BaseModel):
    client_id: Optional[str] = None
    context: Optional[str] = None

class ServiceGap(BaseModel):
    service_type: str
    demand_signals: List[str]
    confidence: str

class PartnerSuggestion(BaseModel):
    service_type: str
    why_needed: str
    referral_fee_percent: float
    collaboration_model: str
