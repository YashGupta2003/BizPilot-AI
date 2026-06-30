"""
Voice Transcription Agent — converts spoken audio into text using Groq's
hosted Whisper Large v3 model.
"""
from io import BytesIO
from openai import OpenAI
from app.core.config import settings

MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
SUPPORTED_AUDIO_EXTENSIONS = {".flac", ".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".ogg", ".wav", ".webm"}


class VoiceTranscriptionError(Exception):
    pass


def _get_client():
    if not settings.GROQ_API_KEY:
        return None
    return OpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")


def validate_audio_file(filename: str, file_bytes: bytes) -> None:
    if not filename or "." not in filename:
        raise VoiceTranscriptionError("Audio file has no recognizable extension.")

    ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_AUDIO_EXTENSIONS:
        raise VoiceTranscriptionError(
            f"Unsupported audio format '{ext}'. Supported: {', '.join(sorted(SUPPORTED_AUDIO_EXTENSIONS))}."
        )

    if len(file_bytes) == 0:
        raise VoiceTranscriptionError("The audio file is empty.")

    if len(file_bytes) > MAX_AUDIO_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        raise VoiceTranscriptionError(
            f"Audio file is {size_mb:.1f}MB, which exceeds the 25MB limit. Try a shorter clip."
        )


async def transcribe_audio(filename: str, file_bytes: bytes, language: str | None = None) -> dict:
    validate_audio_file(filename, file_bytes)

    client = _get_client()
    if client is None:
        raise VoiceTranscriptionError(
            "No GROQ_API_KEY configured in backend/.env — voice transcription needs an API key."
        )

    audio_buffer = BytesIO(file_bytes)
    audio_buffer.name = filename

    try:
        kwargs = {
            "file": audio_buffer,
            "model": "whisper-large-v3-turbo",
            "response_format": "json",
            "temperature": 0.0,
        }
        if language:
            kwargs["language"] = language

        result = client.audio.transcriptions.create(**kwargs)
    except Exception as exc:
        raise VoiceTranscriptionError(f"Transcription failed: {exc}")

    transcript = getattr(result, "text", "").strip()
    if not transcript:
        raise VoiceTranscriptionError(
            "No speech detected. Try recording again, speaking clearly."
        )

    return {
        "transcript": transcript,
        "language_detected": getattr(result, "language", None),
    }