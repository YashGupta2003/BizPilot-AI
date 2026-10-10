"""
Voice-to-Invoice API route.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.core.database import get_database
from app.core.deps import get_current_user
from app.agents.voice_transcription_agent import transcribe_audio, VoiceTranscriptionError
from app.agents.voice_invoice_agent import process_voice_invoice

router = APIRouter(prefix="/api/voice", tags=["Voice to Invoice"])


@router.post("/to-invoice", response_model=dict)
async def voice_to_invoice(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(400, 'Audio file too large. Max 25MB')

    try:
        transcription_result = await transcribe_audio(audio.filename, audio_bytes)
    except VoiceTranscriptionError as exc:
        raise HTTPException(status_code=422, detail="Internal server error")

    transcript = transcription_result["transcript"]
    preview = await process_voice_invoice(db, current_user["_id"], transcript)
    return preview