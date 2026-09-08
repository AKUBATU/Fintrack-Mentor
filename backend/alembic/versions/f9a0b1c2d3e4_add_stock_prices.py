"""add stock prices

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stock_prices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(length=20), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "ticker", name="uq_stock_prices_user_ticker"),
    )
    op.create_index("ix_stock_prices_user_id", "stock_prices", ["user_id"])
    op.create_index("ix_stock_prices_ticker", "stock_prices", ["ticker"])


def downgrade() -> None:
    op.drop_index("ix_stock_prices_ticker", table_name="stock_prices")
    op.drop_index("ix_stock_prices_user_id", table_name="stock_prices")
    op.drop_table("stock_prices")
