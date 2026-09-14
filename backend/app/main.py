from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from sqlalchemy import inspect, text
from uuid import uuid4
import logging
import time

from .core.config import settings
from .core.base import Base
from .core.db import engine
from . import models as _models  # noqa: F401 - register tables before create_all
from .models.chat_message import ChatMessage
from .models.stock_price import StockPrice
from .models.user_preference import UserPreference
from .models.fund_account import FundAccount
from .models.fund_transfer import FundTransfer
from .models.transaction_category import TransactionCategory
from .models.rate_limit import RateLimitBucket
from .api.router import api_router

app = FastAPI(title=settings.APP_NAME)
logger = logging.getLogger(__name__)


@app.on_event("startup")
def create_production_schema():
    # Schema changes belong to Alembic/deployment setup. Running multiple
    # metadata checks against a remote database on every serverless cold start
    # adds seconds before even lightweight routes such as /health can respond.
    if not settings.AUTO_CREATE_SCHEMA:
        return
    if engine.dialect.name == "postgresql" and settings.DATABASE_SCHEMA == "fintrack_app":
        with engine.begin() as connection:
            connection.execute(text("CREATE SCHEMA IF NOT EXISTS fintrack_app"))
    # Vercel does not run Alembic automatically. Keep the small chat-history
    # table available independently from the legacy AUTO_CREATE_SCHEMA flag.
    ChatMessage.__table__.create(bind=engine, checkfirst=True)
    StockPrice.__table__.create(bind=engine, checkfirst=True)
    UserPreference.__table__.create(bind=engine, checkfirst=True)
    FundAccount.__table__.create(bind=engine, checkfirst=True)
    FundTransfer.__table__.create(bind=engine, checkfirst=True)
    TransactionCategory.__table__.create(bind=engine, checkfirst=True)
    RateLimitBucket.__table__.create(bind=engine, checkfirst=True)
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql" and settings.DATABASE_SCHEMA == "fintrack_app":
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE fintrack_app.users ADD COLUMN IF NOT EXISTS "
                "email_verified BOOLEAN NOT NULL DEFAULT TRUE"
            ))
            for statement in (
                "CREATE INDEX IF NOT EXISTS ix_expenses_user_date ON fintrack_app.expenses (user_id, date)",
                "CREATE INDEX IF NOT EXISTS ix_budgets_user_reference_date ON fintrack_app.budgets (user_id, reference_date)",
                "CREATE INDEX IF NOT EXISTS ix_stock_transactions_user_date ON fintrack_app.stock_transactions (user_id, date)",
                "CREATE INDEX IF NOT EXISTS ix_chat_messages_user_session_date ON fintrack_app.chat_messages (user_id, session_date)",
            ):
                connection.execute(text(statement))
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

            preference_columns = (
                "base_currency VARCHAR(10) NOT NULL DEFAULT 'IDR'",
                "timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Jakarta'",
                "onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE",
            )
            for column_definition in preference_columns:
                connection.execute(text(
                    "ALTER TABLE fintrack_app.user_preferences ADD COLUMN IF NOT EXISTS "
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
        if "fund_source" not in budget_columns:
            preparer = engine.dialect.identifier_preparer
            table_name = preparer.quote("budgets")
            if schema:
                table_name = f"{preparer.quote_schema(schema)}.{table_name}"
            with engine.begin() as connection:
                if engine.dialect.name == "postgresql":
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) NOT NULL DEFAULT 'all'"
                    ))
                else:
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN fund_source VARCHAR(20) NOT NULL DEFAULT 'all'"
                    ))

    if "expenses" in inspector.get_table_names(schema=schema):
        expense_columns = {column["name"] for column in inspector.get_columns("expenses", schema=schema)}
        if "fund_source" not in expense_columns:
            preparer = engine.dialect.identifier_preparer
            table_name = preparer.quote("expenses")
            if schema:
                table_name = f"{preparer.quote_schema(schema)}.{table_name}"
            with engine.begin() as connection:
                if engine.dialect.name == "postgresql":
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS fund_source VARCHAR(20) NOT NULL DEFAULT 'bank'"
                    ))
                else:
                    connection.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN fund_source VARCHAR(20) NOT NULL DEFAULT 'bank'"
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
app.add_middleware(GZipMiddleware, minimum_size=1000)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid4().hex
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/") else response.headers.get("Cache-Control", "no-store")
    response.headers["X-Request-ID"] = request_id
    elapsed = time.perf_counter() - started
    if elapsed >= 2:
        logger.warning("slow_request id=%s path=%s duration=%.3f", request_id, request.url.path, elapsed)
    return response

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


@app.get("/ready")
def readiness():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"ok": True, "database": "reachable"}
