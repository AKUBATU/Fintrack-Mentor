from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .api.router import api_router

app = FastAPI(title=settings.APP_NAME)

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