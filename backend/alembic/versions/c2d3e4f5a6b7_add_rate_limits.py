"""add persistent request rate limits

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_table(
        "rate_limit_buckets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key_hash", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=40), nullable=False),
        sa.Column("window_started_at", sa.DateTime(), nullable=False),
        sa.Column("request_count", sa.Integer(), nullable=False, server_default="0"),
        sa.UniqueConstraint("key_hash", "action", name="uq_rate_limit_key_action"),
    )
    op.create_index("ix_rate_limit_buckets_key_hash", "rate_limit_buckets", ["key_hash"])
    op.create_index("ix_expenses_user_date", "expenses", ["user_id", "date"])
    op.create_index("ix_budgets_user_reference_date", "budgets", ["user_id", "reference_date"])
    op.create_index("ix_stock_transactions_user_date", "stock_transactions", ["user_id", "date"])
    op.create_index("ix_chat_messages_user_session_date", "chat_messages", ["user_id", "session_date"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_user_session_date", table_name="chat_messages")
    op.drop_index("ix_stock_transactions_user_date", table_name="stock_transactions")
    op.drop_index("ix_budgets_user_reference_date", table_name="budgets")
    op.drop_index("ix_expenses_user_date", table_name="expenses")
    op.drop_index("ix_rate_limit_buckets_key_hash", table_name="rate_limit_buckets")
    op.drop_table("rate_limit_buckets")
    op.drop_column("users", "email_verified")
