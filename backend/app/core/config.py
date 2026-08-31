"""
Central configuration for the whole backend.
Everything reads settings from here instead of scattering os.getenv() calls everywhere.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
import logging


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "bizpilot_db"

    # JWT
    JWT_SECRET_KEY: str = "dev_secret_change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # LLM keys
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Twilio WhatsApp (for Payment Reminder Agent)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"

    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode='after')
    def validate_jwt_secret(self) -> 'Settings':
        if self.ENVIRONMENT != 'development':
            if self.JWT_SECRET_KEY == "dev_secret_change_me" or len(self.JWT_SECRET_KEY) < 32:
                logging.warning("INSECURE JWT SECRET KEY FOR PRODUCTION!")
        return self


# Single shared instance — import this everywhere else
settings = Settings()
