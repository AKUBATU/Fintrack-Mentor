from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from pathlib import Path

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True, extra="ignore")

    APP_NAME: str = "FinTrack Mentor API"
    API_PREFIX: str = "/api"

    # DB: prefer PostgreSQL, fallback SQLite
    DATABASE_URL: str = Field(default="sqlite:///./dev.db")

    # JWT
    JWT_SECRET_KEY: str = Field(default="change-me-in-prod")
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60*24*7)

    # CORS
    CORS_ORIGINS: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    # OpenAI
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ML artifact locations
    PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]
    ML_DIR: Path = PROJECT_ROOT / "ml"
    ARTIFACTS_DIR: Path = ML_DIR / "artifacts"
    TRAIN_CSV: Path = ML_DIR / "data" / "train.csv"

settings = Settings()
