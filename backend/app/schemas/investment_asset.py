from datetime import date
from typing import Optional

from pydantic import BaseModel, Field, field_validator


ASSET_TYPES = {
    "stock", "etf", "mutual_fund", "bond", "deposit", "cash", "crypto",
    "gold", "commodity", "property", "business", "private_equity", "p2p",
    "pension", "insurance_investment", "collectible", "forex", "derivative", "other",
}


class InvestmentAssetBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    symbol: str = Field(default="", max_length=40)
    asset_type: str
    quantity: float = Field(gt=0)
    average_price: float = Field(ge=0)
    current_price: float = Field(ge=0)
    currency: str = Field(default="IDR", min_length=3, max_length=10)
    exchange_rate_to_idr: float = Field(default=1, gt=0)
    acquired_date: Optional[date] = None
    notes: str = Field(default="", max_length=500)

    @field_validator("asset_type")
    @classmethod
    def validate_asset_type(cls, value: str):
        value = value.strip().lower()
        if value not in ASSET_TYPES:
            raise ValueError("Jenis instrumen tidak didukung")
        return value

    @field_validator("symbol", "currency")
    @classmethod
    def uppercase_fields(cls, value: str):
        return value.strip().upper()


class InvestmentAssetCreate(InvestmentAssetBase):
    pass


class InvestmentAssetUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    symbol: Optional[str] = Field(default=None, max_length=40)
    asset_type: Optional[str] = None
    quantity: Optional[float] = Field(default=None, gt=0)
    average_price: Optional[float] = Field(default=None, ge=0)
    current_price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=10)
    exchange_rate_to_idr: Optional[float] = Field(default=None, gt=0)
    acquired_date: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("asset_type")
    @classmethod
    def validate_optional_asset_type(cls, value: str | None):
        if value is None:
            return value
        value = value.strip().lower()
        if value not in ASSET_TYPES:
            raise ValueError("Jenis instrumen tidak didukung")
        return value


class InvestmentAssetOut(InvestmentAssetBase):
    id: int
    cost_basis: float
    market_value: float
    unrealized_pl: float
    unrealized_pl_percent: float


class AllocationOut(BaseModel):
    asset_type: str
    value: float
    percentage: float


class PortfolioHealthOut(BaseModel):
    score: int
    status: str
    total_value: float
    total_cost: float
    unrealized_pl: float
    diversification_score: int
    concentration_score: int
    liquidity_score: int
    risk_score: int
    largest_position_percentage: float
    allocations: list[AllocationOut]
    insights: list[str]
