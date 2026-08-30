from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from .config import settings

connect_args = {}
engine_options = {"pool_pre_ping": True}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Serverless instances must not hold session-pooler connections between requests.
    engine_options["poolclass"] = NullPool

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, **engine_options)
if settings.DATABASE_SCHEMA and engine.dialect.name == "postgresql":
    engine = engine.execution_options(
        schema_translate_map={None: settings.DATABASE_SCHEMA}
    )
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
