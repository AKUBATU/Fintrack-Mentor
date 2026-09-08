from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.base import Base


class UserPreference(Base):
    __tablename__ = "user_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_preferences_user_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    dca_strategy: Mapped[str] = mapped_column(Text, default="Balanced", nullable=False)
    dca_amount: Mapped[float] = mapped_column(Float, default=500000, nullable=False)
    dca_frequency: Mapped[str] = mapped_column(String(20), default="weekly", nullable=False)
    focus_stocks_json: Mapped[str] = mapped_column(Text, default='["BBRI", "BMRI"]', nullable=False)
    compounding_dividends: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    bonus_week_rule: Mapped[str] = mapped_column(Text, default="Jika ada bonus, tambah 1x DCA", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="preference")
