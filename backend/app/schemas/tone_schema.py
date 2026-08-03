from pydantic import BaseModel, Field
from typing import Optional, List

class ToneAnalysisRequest(BaseModel):
    client_id: Optional[str] = None
    communication_text: str
    communication_type: str = Field(default="email")

class ToneScore(BaseModel):
    dimension: str
    score: int
    trend: str

class ToneAlert(BaseModel):
    level: str
    message: str
    recommendation: str
