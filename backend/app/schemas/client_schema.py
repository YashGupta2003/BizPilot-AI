from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class ClientCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    default_rate: Optional[float] = None  # ₹ per hour, used by the invoice agent


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    default_rate: Optional[float] = None


class ClientOut(BaseModel):
    id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    default_rate: Optional[float] = None
    total_invoiced: float = 0
    total_paid: float = 0
    total_pending: float = 0
