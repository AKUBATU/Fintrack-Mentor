"""add expense receipt path

Revision ID: a4b5c6d7e8f9
Revises: 8f3a1c2d4e5f
"""
from alembic import op
import sqlalchemy as sa

revision = "a4b5c6d7e8f9"
down_revision = "8f3a1c2d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("expenses", sa.Column("receipt_path", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("expenses", "receipt_path")
