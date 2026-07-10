"""
Application settings loaded from environment variables.
"""
import os
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
from dotenv import load_dotenv

# Load .env file from project root (no-op if file doesn't exist, e.g. in production)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../.env"))
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TenantSense AI"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "change-me-in-production"
    DEBUG: bool = True

    # PostgreSQL
    DATABASE_URL: str = "postgresql+asyncpg://tenantsense:password@localhost:5432/tenantsense_db"

    # MongoDB
    MONGO_URL: str = "mongodb://tenantsense:password@localhost:27017/tenantsense_logs"
    MONGO_DB: str = "tenantsense_logs"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    # JWT
    JWT_SECRET_KEY: str = "change-jwt-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Gemini API
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # ML
    ML_MODEL_PATH: str = "machine_learning/models/xgboost_model.pkl"
    ML_SCALER_PATH: str = "machine_learning/models/scaler.pkl"
    ML_THRESHOLD: float = 0.5

    # CORS
    # Accepts a comma-separated string (e.g. from Render env vars) OR a JSON list.
    # Example: "https://myapp.vercel.app,http://localhost:3000"
    ALLOWED_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
        # Allow ALLOWED_ORIGINS to be set as a comma-separated string
        # (pydantic-settings v2 compatible)


settings = Settings()
