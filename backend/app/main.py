from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .core.config import settings
from .core.base import Base
from .core.db import engine
from . import models as _models  # noqa: F401 - register tables before create_all
from .api.router import api_router

app = FastAPI(title=settings.APP_NAME)


@app.on_event("startup")
def create_production_schema():
    if settings.AUTO_CREATE_SCHEMA:
        if engine.dialect.name == "postgresql" and settings.DATABASE_SCHEMA == "fintrack_app":
            with engine.begin() as connection:
                connection.execute(text("CREATE SCHEMA IF NOT EXISTS fintrack_app"))
        Base.metadata.create_all(bind=engine)
        if engine.dialect.name == "postgresql" and settings.DATABASE_SCHEMA == "fintrack_app":
            with engine.begin() as connection:
                expense_columns = (
                    "transaction_type VARCHAR(10) NOT NULL DEFAULT 'expense'",
                    "merchant VARCHAR(120) NOT NULL DEFAULT ''",
                    "notes VARCHAR(500) NOT NULL DEFAULT ''",
                    "receipt_path VARCHAR(500)",
                    "predicted_category VARCHAR(80)",
                    "confidence DOUBLE PRECISION",
                    "model_used VARCHAR(40)",
                    "created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
                )
                for column_definition in expense_columns:
                    connection.execute(text(
                        "ALTER TABLE fintrack_app.expenses ADD COLUMN IF NOT EXISTS "
                        f"{column_definition}"
                    ))

# Origin yang diperbolehkan saat development
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    "http://localhost:5173",
    "http://127.0.0.1:5173",

    "http://localhost:5174",
    "http://127.0.0.1:5174",

    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

# Origin tambahan dari .env
env_origins = [
    origin.strip()
    for origin in (settings.CORS_ORIGINS or "").split(",")
    if origin.strip()
]

# Gabungkan default + .env agar default tidak hilang
allow_list = list(set(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    api_router,
    prefix=settings.API_PREFIX,
)


@app.get("/health")
def health():
    return {
        "ok": True,
        "name": settings.APP_NAME,
    }
