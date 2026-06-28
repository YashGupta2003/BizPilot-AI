"""
Schemas for the Smart Contract Risk Analyzer feature.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RiskFlag(BaseModel):
    """A single flagged risk found in a contract."""
    category: str = Field(..., description="e.g. 'Payment Terms', 'Cancellation Policy', 'Revisions'")
    severity: str = Field(..., description="'high', 'medium', or 'low'")
    finding: str = Field(..., description="Plain-language description of the risk")
    recommendation: str = Field(..., description="What the freelancer should do about it")


class AnalyzeContractRequest(BaseModel):
    filename: str
    client_id: Optional[str] = None


class ContractRiskReportOut(BaseModel):
    id: str
    filename: str
    client_id: Optional[str] = None
    overall_risk_level: str  # 'high', 'medium', 'low'
    summary: str
    flags: list[RiskFlag]
    missing_clauses: list[str]
    analyzed_at: str