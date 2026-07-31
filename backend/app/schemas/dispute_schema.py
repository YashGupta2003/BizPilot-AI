from pydantic import BaseModel, Field
from typing import Optional


class DisputeRequest(BaseModel):
    client_id: str
    invoice_id: Optional[str] = None
    dispute_message: str = Field(..., description="The exact message the client sent disputing the work/invoice")


class DisputeResponse(BaseModel):
    analysis: str = Field(..., description="Internal analysis of who is right based on the facts")
    recommended_action: str = Field(..., description="e.g., 'Offer discount', 'Clarify terms', 'Firm pushback'")
    draft_response: str = Field(..., description="A professional, ready-to-send email response to the client")
