from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

FundSource = Literal["bank", "cash"]


class FundAccountUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    opening_balance: float = Field(ge=0)


class FundAccountOut(FundAccountUpdate):
    source: FundSource
    balance: float


class FundTransferCreate(BaseModel):
    from_source: FundSource
    to_source: FundSource
    amount: float = Field(gt=0)
    date: date
    notes: str = Field(default="", max_length=300)


class FundTransferOut(FundTransferCreate):
    id: int
