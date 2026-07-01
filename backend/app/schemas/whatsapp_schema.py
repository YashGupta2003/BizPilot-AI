from pydantic import BaseModel
from typing import Optional


class ReminderPreview(BaseModel):
    invoice_id: str
    invoice_number: str
    client_name: str
    client_phone: Optional[str] = None
    total: float
    due_date: str
    days_overdue: int
    reminder_count: int
    already_sent_today: bool
    drafted_message: str
    can_send_whatsapp: bool


class SendReminderRequest(BaseModel):
    invoice_id: str
    client_phone: str
    message: str


class ReminderSentOut(BaseModel):
    success: bool
    message_sid: Optional[str] = None
    sent_to: str
    sent_at: str