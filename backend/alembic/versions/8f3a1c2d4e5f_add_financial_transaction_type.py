"""add financial transaction type

Revision ID: 8f3a1c2d4e5f
Revises: d12da67d2e48
"""
from alembic import op
import sqlalchemy as sa

revision = "8f3a1c2d4e5f"
down_revision = "d12da67d2e48"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "expenses",
        sa.Column("transaction_type", sa.String(length=10), nullable=False, server_default="expense"),
    )


def downgrade() -> None:
    op.drop_column("expenses", "transaction_type")
