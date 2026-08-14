from __future__ import annotations

from datetime import date as dt_date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ExpenseBase(BaseModel):
    description: str
    amount: float
    category: Optional[str] = None
    predicted_category: Optional[str] = None
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    date: Optional[dt_date] = None

    # Hilangkan warning "protected namespace model_"
    model_config = ConfigDict(protected_namespaces=())


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    predicted_category: Optional[str] = None
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    date: Optional[dt_date] = None

    model_config = ConfigDict(protected_namespaces=())


class ExpenseOut(ExpenseBase):
    id: int
    user_id: int

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
