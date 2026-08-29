"""add generic investment assets

Revision ID: b5c6d7e8f9a0
Revises: a4b5c6d7e8f9
"""
from alembic import op
import sqlalchemy as sa

revision = "b5c6d7e8f9a0"
down_revision = "a4b5c6d7e8f9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "investment_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("symbol", sa.String(length=40), nullable=False, server_default=""),
        sa.Column("asset_type", sa.String(length=40), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("average_price", sa.Float(), nullable=False),
        sa.Column("current_price", sa.Float(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="IDR"),
        sa.Column("exchange_rate_to_idr", sa.Float(), nullable=False, server_default="1"),
        sa.Column("acquired_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_investment_assets_user_id", "investment_assets", ["user_id"])
    op.create_index("ix_investment_assets_asset_type", "investment_assets", ["asset_type"])


def downgrade() -> None:
    op.drop_index("ix_investment_assets_asset_type", table_name="investment_assets")
    op.drop_index("ix_investment_assets_user_id", table_name="investment_assets")
    op.drop_table("investment_assets")
