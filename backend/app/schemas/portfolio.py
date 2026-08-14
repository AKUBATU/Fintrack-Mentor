from pydantic import BaseModel, Field
from datetime import date

class StockTransactionBase(BaseModel):
    ticker: str
    type: str  # BUY/SELL
    shares: int = Field(gt=0)
    price: float = Field(gt=0)
    date: date

class StockTransactionCreate(StockTransactionBase):
    pass

class StockTransactionOut(StockTransactionBase):
    id: int

class DividendBase(BaseModel):
    ticker: str
    amount: float = Field(gt=0)
    record_date: date
    payment_date: date

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
