from datetime import date

from typing import Literal

from pydantic import BaseModel, Field

class BudgetBase(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    amount: float = Field(gt=0)
    period: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    fund_source: str = Field(default="all", min_length=1, max_length=20)
    reference_date: date = Field(default_factory=date.today)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=80)
    amount: float | None = Field(default=None, gt=0)
    period: Literal["daily", "weekly", "monthly", "yearly"] | None = None
    fund_source: str | None = Field(default=None, min_length=1, max_length=20)
    reference_date: date | None = None

class BudgetOut(BudgetBase):
    id: int
