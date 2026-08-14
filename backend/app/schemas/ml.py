from __future__ import annotations

from datetime import date as dt_date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# -----------------------------
# Expense Categorization
# -----------------------------
class PredictCategoryIn(BaseModel):
    text: str = Field(..., min_length=1, description="Deskripsi pengeluaran")
    amount: Optional[float] = Field(None, ge=0, description="Nominal (opsional)")


class PredictCandidate(BaseModel):
    category: str
    score: float


class PredictCategoryOut(BaseModel):
    predicted_category: str
    confidence: float
    model_used: Optional[str] = None
    candidates: List[PredictCandidate] = []

    # hilangkan warning Pydantic v2 untuk field yang mirip "model_"
    model_config = ConfigDict(protected_namespaces=())


class FeedbackIn(BaseModel):
    text: str = Field(..., min_length=1)
    amount: Optional[float] = Field(None, ge=0)
    correct_category: str = Field(..., min_length=1)

    model_config = ConfigDict(protected_namespaces=())


# -----------------------------
# Anomaly Detection
# -----------------------------
class AnomalyItem(BaseModel):
    expense_id: int
    date: Optional[dt_date] = None
    category: Optional[str] = None
    amount: float
    z_score: Optional[float] = None
    ae_score: Optional[float] = None
    reason: str


class AnomalyOut(BaseModel):
    items: List[AnomalyItem]
