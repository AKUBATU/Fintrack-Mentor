"""add profile preferences and fund accounts

Revision ID: a0b1c2d3e4f5
Revises: f9a0b1c2d3e4
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dca_strategy", sa.Text(), nullable=False),
        sa.Column("dca_amount", sa.Float(), nullable=False),
        sa.Column("dca_frequency", sa.String(length=20), nullable=False),
        sa.Column("focus_stocks_json", sa.Text(), nullable=False),
        sa.Column("compounding_dividends", sa.Boolean(), nullable=False),
        sa.Column("bonus_week_rule", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_user_preferences_user_id"),
    )
    op.create_index("ix_user_preferences_user_id", "user_preferences", ["user_id"])
    op.create_table(
        "fund_accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("opening_balance", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "source", name="uq_fund_accounts_user_source"),
    )
    op.create_index("ix_fund_accounts_user_id", "fund_accounts", ["user_id"])
    op.create_table(
        "fund_transfers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("from_source", sa.String(length=20), nullable=False),
        sa.Column("to_source", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("notes", sa.String(length=300), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_fund_transfers_user_id", "fund_transfers", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_fund_transfers_user_id", table_name="fund_transfers")
    op.drop_table("fund_transfers")
    op.drop_index("ix_fund_accounts_user_id", table_name="fund_accounts")
    op.drop_table("fund_accounts")
    op.drop_index("ix_user_preferences_user_id", table_name="user_preferences")
    op.drop_table("user_preferences")
