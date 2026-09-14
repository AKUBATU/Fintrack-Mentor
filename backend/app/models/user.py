from sqlalchemy import Boolean, String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from ..core.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    stock_transactions = relationship("StockTransaction", back_populates="user", cascade="all, delete-orphan")
    dividends = relationship("Dividend", back_populates="user", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="user", cascade="all, delete-orphan")
    investment_assets = relationship("InvestmentAsset", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    preference = relationship("UserPreference", back_populates="user", cascade="all, delete-orphan", uselist=False)
    fund_accounts = relationship("FundAccount", back_populates="user", cascade="all, delete-orphan")
    fund_transfers = relationship("FundTransfer", back_populates="user", cascade="all, delete-orphan")
    transaction_categories = relationship("TransactionCategory", back_populates="user", cascade="all, delete-orphan")
