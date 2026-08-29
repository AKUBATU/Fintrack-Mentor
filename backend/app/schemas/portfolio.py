from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional
from datetime import date as dt_date

class StockTransactionBase(BaseModel):
    ticker: str
    type: Literal["BUY", "SELL"]
    shares: int = Field(gt=0)
    price: float = Field(gt=0)
    date: dt_date

class StockTransactionCreate(StockTransactionBase):
    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, value: str):
        value = value.strip().upper()
        if not value:
            raise ValueError("Ticker wajib diisi")
        return value

class StockTransactionOut(StockTransactionBase):
    id: int

class StockTransactionUpdate(BaseModel):
    ticker: Optional[str] = None
    type: Optional[Literal["BUY", "SELL"]] = None
    shares: Optional[int] = Field(default=None, gt=0)
    price: Optional[float] = Field(default=None, gt=0)
    date: Optional[dt_date] = None

    @field_validator("ticker")
    @classmethod
    def normalize_optional_ticker(cls, value: str | None):
        if value is None:
            return value
        value = value.strip().upper()
        if not value:
            raise ValueError("Ticker wajib diisi")
        return value

class DividendBase(BaseModel):
    ticker: str
    amount: float = Field(gt=0)
    record_date: dt_date
    payment_date: dt_date

class DividendCreate(DividendBase):
    pass

class DividendOut(DividendBase):
    id: int

class HoldingOut(BaseModel):
    ticker: str
    shares: int
    lots: float
    avg_price: float
    market_price: float | None = None
    market_value: float | None = None
    cost_basis: float
    unrealized_pl: float | None = None
    realized_pl: float | None = None

class PortfolioSummaryOut(BaseModel):
    total_cost_basis: float
    total_market_value: float | None = None
    total_unrealized_pl: float | None = None
    total_realized_pl: float
    total_dividends: float
    holdings: list[HoldingOut]
    max_drawdown: float | None = None
