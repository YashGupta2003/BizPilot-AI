from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    rate: float
    amount: Optional[float] = None  # auto-computed = quantity * rate


class InvoiceCreate(BaseModel):
    client_id: str
    items: List[InvoiceItem]
    due_date: Optional[date] = None
    tax_percent: float = 0
    notes: Optional[str] = None
    currency: str = "INR"


class InvoiceGenerateFromText(BaseModel):
    """Used by the AI agent route — user describes work in plain English."""
    client_id: str
    description: str = Field(..., description="e.g. '3 hours of logo design at 1500/hr'")
    due_date: Optional[date] = None


class InvoiceStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(draft|sent|paid|overdue|cancelled)$")


class InvoiceOut(BaseModel):
    id: str
    invoice_number: str
    client_id: str
    client_name: str
    items: List[InvoiceItem]
    
    subtotal_paise: int = 0
    tax_percent: float
    tax_amount_paise: int = 0
    total_paise: int = 0
    amount_paid_paise: int = 0
    balance_due_paise: int = 0
    
    subtotal: float
    tax_amount: float
    total: float
    amount_paid: float = 0
    balance_due: float = 0
    
    status: str
    currency: str
    issue_date: str
    due_date: Optional[str] = None
    notes: Optional[str] = None
