"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-01-21

"""
from alembic import op
import sqlalchemy as sa

revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("payment_method", sa.String(length=40), nullable=False),
        sa.Column("merchant", sa.String(length=120), nullable=False, server_default=""),
        sa.Column("notes", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("predicted_category", sa.String(length=80), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("model_used", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_table(
        "budgets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False, server_default="monthly"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])

    op.create_table(
        "stock_transactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(length=20), nullable=False),
        sa.Column("type", sa.String(length=10), nullable=False),
        sa.Column("shares", sa.Integer(), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_stock_transactions_user_id", "stock_transactions", ["user_id"])
    op.create_index("ix_stock_transactions_ticker", "stock_transactions", ["ticker"])

    op.create_table(
        "dividends",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("ticker", sa.String(length=20), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("record_date", sa.Date(), nullable=False),
        sa.Column("payment_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_dividends_user_id", "dividends", ["user_id"])
    op.create_index("ix_dividends_ticker", "dividends", ["ticker"])

    op.create_table(
        "daily_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("portfolio_value", sa.Float(), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("screenshot_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_daily_reports_user_id", "daily_reports", ["user_id"])
    op.create_index("ix_daily_reports_date", "daily_reports", ["date"])

def downgrade() -> None:
    op.drop_index("ix_daily_reports_date", table_name="daily_reports")
    op.drop_index("ix_daily_reports_user_id", table_name="daily_reports")
    op.drop_table("daily_reports")
    op.drop_index("ix_dividends_ticker", table_name="dividends")
    op.drop_index("ix_dividends_user_id", table_name="dividends")
    op.drop_table("dividends")
    op.drop_index("ix_stock_transactions_ticker", table_name="stock_transactions")
    op.drop_index("ix_stock_transactions_user_id", table_name="stock_transactions")
    op.drop_table("stock_transactions")
    op.drop_index("ix_budgets_user_id", table_name="budgets")
    op.drop_table("budgets")
    op.drop_index("ix_expenses_user_id", table_name="expenses")
    op.drop_table("expenses")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
