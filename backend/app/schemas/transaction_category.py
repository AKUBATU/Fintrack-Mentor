from typing import Literal

from pydantic import BaseModel, Field


class TransactionCategoryCreate(BaseModel):
    transaction_type: Literal["income", "expense"]
    name: str = Field(min_length=1, max_length=80)


class TransactionCategoryOut(TransactionCategoryCreate):
    id: int
