from fastapi import APIRouter, Depends, HTTPException
from app.core.config import settings

from app.core.database import get_database
from app.core.deps import get_current_user
from app.schemas.whatsapp_schema import SendReminderRequest
from app.agents.whatsapp_agent import (
    draft_reminder_previews,
    send_whatsapp_reminder,
    WhatsAppSendError,
)
from app.models.serializers import serialize_list

router = APIRouter(prefix="/api/reminders", tags=["WhatsApp Payment Reminders"])


@router.get("/overdue-previews", response_model=list)
async def get_overdue_previews(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    business_name = current_user.get("business_name", "My Business")
    previews = await draft_reminder_previews(db, current_user["_id"], business_name)
    return previews


@router.post("/send", response_model=dict)
async def send_reminder(
    payload: SendReminderRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    try:
        result = await send_whatsapp_reminder(
            db,
            current_user["_id"],
            payload.invoice_id,
            payload.message,
        )
    except WhatsAppSendError:
        raise HTTPException(status_code=502, detail="Failed to send WhatsApp reminder")
    return result


@router.get("/history", response_model=list)
async def get_reminder_history(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    cursor = db.whatsapp_reminders.find(
        {"owner_id": current_user["_id"]}
    ).sort("sent_at", -1)
    records = await cursor.to_list(length=500)
    return serialize_list(records)


from fastapi import Request
from twilio.request_validator import RequestValidator

@router.post("/twilio-status-callback")
async def twilio_status_callback(request: Request, db=Depends(get_database)):
    form = await request.form()
    message_sid = form.get("MessageSid")
    message_status = form.get("MessageStatus")
    
    if not message_sid:
        raise HTTPException(status_code=400, detail="Missing MessageSid")
        
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    signature = request.headers.get("X-Twilio-Signature", "")
    
    # Twilio expects the full URL with scheme
    url = str(request.url)
    # The validator requires a dictionary of the POST variables
    post_vars = dict(form)
    
    # Skip validation in dev if auth token is missing, but otherwise validate
    if settings.TWILIO_AUTH_TOKEN and not validator.validate(url, post_vars, signature):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")
        
    await db.whatsapp_reminders.update_one(
        {"twilio_message_sid": message_sid},
        {"$set": {"delivery_status": message_status}}
    )
    return {"status": "ok"}