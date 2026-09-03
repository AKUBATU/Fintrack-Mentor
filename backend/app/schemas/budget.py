from datetime import date

from pydantic import BaseModel, Field

class BudgetBase(BaseModel):
    category: str
    amount: float = Field(gt=0)
    period: str = "monthly"
    reference_date: date = Field(default_factory=date.today)

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: str | None = None
    amount: float | None = Field(default=None, gt=0)
    period: str | None = None
    reference_date: date | None = None

class BudgetOut(BudgetBase):
    id: int
