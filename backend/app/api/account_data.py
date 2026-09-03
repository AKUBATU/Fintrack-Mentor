from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.budget import Budget
from ..models.daily_report import DailyReport
from ..models.dividend import Dividend
from ..models.expense import Expense
from ..models.stock_transaction import StockTransaction
from .deps import get_current_user
from .expenses import to_expense_out


router = APIRouter(prefix="/account-data", tags=["account-data"])


@router.get("")
def get_account_data(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Load the shared dashboard data through one authenticated connection."""
    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == user.id)
        .order_by(Expense.date.desc(), Expense.id.desc())
        .all()
    )
    budgets = (
        db.query(Budget)
        .filter(Budget.user_id == user.id)
        .order_by(Budget.id.desc())
        .all()
    )
    transactions = (
        db.query(StockTransaction)
        .filter(StockTransaction.user_id == user.id)
        .order_by(StockTransaction.date.desc(), StockTransaction.id.desc())
        .all()
    )
    dividends = (
        db.query(Dividend)
        .filter(Dividend.user_id == user.id)
        .order_by(Dividend.payment_date.desc(), Dividend.id.desc())
        .all()
    )
    reports = (
        db.query(DailyReport)
        .filter(DailyReport.user_id == user.id)
        .order_by(DailyReport.date.desc(), DailyReport.id.desc())
        .all()
    )

    return {
        "expenses": [to_expense_out(row) for row in expenses],
        "budgets": [
            {
                "id": row.id,
                "category": row.category,
                "amount": row.amount,
                "period": row.period,
                "reference_date": row.reference_date,
            }
            for row in budgets
        ],
        "transactions": [
            {
                "id": row.id,
                "ticker": row.ticker,
                "type": row.type,
                "shares": row.shares,
                "price": row.price,
                "date": row.date,
            }
            for row in transactions
        ],
        "dividends": [
            {
                "id": row.id,
                "ticker": row.ticker,
                "amount": row.amount,
                "record_date": row.record_date,
                "payment_date": row.payment_date,
            }
            for row in dividends
        ],
        "reports": [
            {
                "id": row.id,
                "date": row.date,
                "portfolio_value": row.portfolio_value,
                "notes": row.notes,
                "screenshot_url": row.screenshot_url,
            }
            for row in reports
        ],
    }
