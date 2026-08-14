from pydantic import BaseModel, Field

class BudgetBase(BaseModel):
    category: str
    amount: float = Field(gt=0)
    period: str = "monthly"

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category: str | None = None
    amount: float | None = Field(default=None, gt=0)
    period: str | None = None

class BudgetOut(BudgetBase):
    id: int
