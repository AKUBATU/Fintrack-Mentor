from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    APP_NAME: str = "FinTrack Mentor API"
    API_PREFIX: str = "/api"

    # DB: prefer PostgreSQL, fallback SQLite
    DATABASE_URL: str = Field(default="sqlite:///./dev.db")
    DATABASE_SCHEMA: str | None = None

    # JWT
    JWT_SECRET_KEY: str = Field(default="change-me-in-prod")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60*24*7)
    PASSWORD_RESET_EXPIRE_MINUTES: int = Field(default=30)

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    # Password reset email
    FRONTEND_URL: str = "http://localhost:5173"
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_FROM_EMAIL: str = "noreply@fintrack.local"
    SMTP_USE_TLS: bool = True
    PASSWORD_RESET_DEV_MODE: bool = False
    AUTO_CREATE_SCHEMA: bool = False

    # ML artifact locations
    PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
    ML_DIR: Path = PROJECT_ROOT / "ml"
    ARTIFACTS_DIR: Path = ML_DIR / "artifacts"
    TRAIN_CSV: Path = ML_DIR / "data" / "train.csv"
    RECEIPTS_DIR: Path = PROJECT_ROOT / "uploads" / "receipts"
    MAX_RECEIPT_SIZE_BYTES: int = 5 * 1024 * 1024

settings = Settings()
