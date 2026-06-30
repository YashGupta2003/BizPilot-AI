"""
Schemas for the Voice-to-Invoice feature.
"""
from pydantic import BaseModel
from typing import Optional


class VoiceTranscriptionOut(BaseModel):
    transcript: str
    language_detected: Optional[str] = None


class VoiceInvoicePreview(BaseModel):
    description: str
    quantity: float
    rate: float
    amount: float


class VoiceToInvoiceOut(BaseModel):
    transcript: str
    items: list[VoiceInvoicePreview]
    client_id: Optional[str] = None
    client_name: Optional[str] = None
    matched_client_automatically: bool = False