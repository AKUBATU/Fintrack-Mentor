from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.base import Base


class TransactionCategory(Base):
    __tablename__ = "transaction_categories"
    __table_args__ = (UniqueConstraint("user_id", "transaction_type", "name", name="uq_user_category_type_name"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)

    user = relationship("User", back_populates="transaction_categories")
