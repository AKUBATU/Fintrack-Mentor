"""public personalization

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0b1c2d3e4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("user_preferences", sa.Column("base_currency", sa.String(length=10), nullable=False, server_default="IDR"))
    op.add_column("user_preferences", sa.Column("timezone", sa.String(length=60), nullable=False, server_default="Asia/Jakarta"))
    op.add_column("user_preferences", sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table(
        "transaction_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_type", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.UniqueConstraint("user_id", "transaction_type", "name", name="uq_user_category_type_name"),
    )
    op.create_index("ix_transaction_categories_user_id", "transaction_categories", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_transaction_categories_user_id", table_name="transaction_categories")
    op.drop_table("transaction_categories")
    op.drop_column("user_preferences", "onboarding_completed")
    op.drop_column("user_preferences", "timezone")
    op.drop_column("user_preferences", "base_currency")
