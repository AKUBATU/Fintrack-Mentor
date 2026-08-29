from __future__ import annotations

from datetime import date as dt_date
from typing import Any, Optional
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExpenseBase(BaseModel):
    amount: float = Field(gt=0)
    transaction_type: Literal["income", "expense"] = "expense"
    category: str = Field(min_length=1, max_length=80)
    payment_method: str = Field(min_length=1, max_length=40)
    merchant: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=500)
    predicted_category: Optional[str] = None
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    date: dt_date

    # Hilangkan warning "protected namespace model_"
    model_config = ConfigDict(protected_namespaces=())


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    transaction_type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    merchant: Optional[str] = None
    notes: Optional[str] = None
    predicted_category: Optional[str] = None
    confidence: Optional[float] = None
    model_used: Optional[str] = None
    date: Optional[dt_date] = None

    model_config = ConfigDict(protected_namespaces=())


class ExpenseOut(ExpenseBase):
    id: int
    has_receipt: bool = False

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ReceiptScanOut(BaseModel):
    merchant: str = ""
    date: Optional[dt_date] = None
    amount: Optional[float] = None
    payment_method: str
    category: str
    notes: str = ""
    receipt_number: str = ""
    tax: Optional[float] = None
    discount: Optional[float] = None
    line_items: list[dict[str, Any]] = Field(default_factory=list)
    raw_text: str = ""
