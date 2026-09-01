from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatIn(BaseModel):
    message: str = Field(..., min_length=1)
    # opsional: kamu bisa kirim context ringan dari frontend kalau mau
    context: Optional[str] = None


class ChatOut(BaseModel):
    reply: str
    # opsional: untuk debug/skripsi (alat apa yang dipakai)
    tools_used: Optional[List[str]] = None


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
