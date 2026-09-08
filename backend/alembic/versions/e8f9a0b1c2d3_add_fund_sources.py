"""add transaction and budget fund sources

Revision ID: e8f9a0b1c2d3
Revises: d7e8f9a0b1c2
"""

from alembic import op
import sqlalchemy as sa


revision = "e8f9a0b1c2d3"
down_revision = "d7e8f9a0b1c2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "expenses",
        sa.Column("fund_source", sa.String(length=20), nullable=False, server_default="bank"),
    )
    op.add_column(
        "budgets",
        sa.Column("fund_source", sa.String(length=20), nullable=False, server_default="all"),
    )


def downgrade():
    op.drop_column("budgets", "fund_source")
    op.drop_column("expenses", "fund_source")
