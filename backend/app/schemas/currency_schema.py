from pydantic import BaseModel
from typing import Optional


class GSTCalculationRequest(BaseModel):
    subtotal: float
    currency: str = "INR"
    gst_rate: int = 18
    is_export: bool = False
    is_inter_state: bool = True
    sac_code: Optional[str] = None


class GSTCalculationOut(BaseModel):
    currency: str
    currency_symbol: str
    subtotal: float
    gst_rate: int
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_gst: float
    total_with_gst: float
    supply_type: str
    is_export: bool
    exchange_rate_to_inr: float
    subtotal_inr: float
    total_inr: float
    sac_code: str
    gst_compliance_note: str