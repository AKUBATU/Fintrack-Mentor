from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from .core.config import settings
from .core.base import Base
from .core.db import engine
from . import models as _models  # noqa: F401 - register tables before create_all
from .models.chat_message import ChatMessage
from .api.router import api_router

app = FastAPI(title=settings.APP_NAME)


@app.on_event("startup")
def create_production_schema():
    # Vercel does not run Alembic automatically. Keep the small chat-history
    # table available independently from the legacy AUTO_CREATE_SCHEMA flag.
    ChatMessage.__table__.create(bind=engine, checkfirst=True)
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

    # Vercel does not execute Alembic migrations. Keep existing budget tables
    # compatible while preserving the creation date as their initial period.
    schema = settings.DATABASE_SCHEMA if engine.dialect.name == "postgresql" else None
    inspector = inspect(engine)
    if "budgets" in inspector.get_table_names(schema=schema):
        budget_columns = {column["name"] for column in inspector.get_columns("budgets", schema=schema)}
        if "reference_date" not in budget_columns:
            preparer = engine.dialect.identifier_preparer
            table_name = preparer.quote("budgets")
            if schema:
                table_name = f"{preparer.quote_schema(schema)}.{table_name}"
            with engine.begin() as connection:
                if engine.dialect.name == "postgresql":
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS reference_date DATE"))
                    connection.execute(text(f"UPDATE {table_name} SET reference_date = CAST(created_at AS DATE) WHERE reference_date IS NULL"))
                else:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN reference_date DATE"))
                    connection.execute(text(f"UPDATE {table_name} SET reference_date = DATE(created_at) WHERE reference_date IS NULL"))

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
