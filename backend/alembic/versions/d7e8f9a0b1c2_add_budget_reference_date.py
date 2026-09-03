"""add budget reference date

Revision ID: d7e8f9a0b1c2
Revises: c6d7e8f9a0b1
"""

from alembic import op
import sqlalchemy as sa


revision = "d7e8f9a0b1c2"
down_revision = "c6d7e8f9a0b1"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("budgets", sa.Column("reference_date", sa.Date(), nullable=True))
    op.execute("UPDATE budgets SET reference_date = DATE(created_at) WHERE reference_date IS NULL")


def downgrade():
    op.drop_column("budgets", "reference_date")
