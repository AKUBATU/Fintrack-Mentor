from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
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
