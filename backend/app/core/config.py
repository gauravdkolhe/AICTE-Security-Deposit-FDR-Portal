import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    DEBUG: bool = True
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Database: Use DATABASE_URL if provided, else SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./crednex.db")

    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "crednex-aicte-secure-token-key-2026-production-32-chars")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM: str = "noreply@aicte-fdr.gov.in"

    # File Storage
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE_MB: int = 10

    # Seed credentials (dev only)
    SEED_ADMIN_EMAIL: str = "admin@aicte.gov.in"
    SEED_ADMIN_PASSWORD: str = "Admin@12345"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
