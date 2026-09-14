from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.budget import Budget
from ..models.daily_report import DailyReport
from ..models.dividend import Dividend
from ..models.expense import Expense
from ..models.stock_transaction import StockTransaction
from ..models.stock_price import StockPrice
from ..models.investment_asset import InvestmentAsset
from ..models.fund_transfer import FundTransfer
from ..models.user_preference import UserPreference
from ..models.transaction_category import TransactionCategory
from ..models.chat_message import ChatMessage
from ..services.fund_account_service import account_rows
from ..services.profile_service import preference_dict
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
    investment_assets = (
        db.query(InvestmentAsset)
        .filter(InvestmentAsset.user_id == user.id)
        .order_by(InvestmentAsset.id.desc())
        .all()
    )
    stock_prices = db.query(StockPrice).filter(StockPrice.user_id == user.id).all()
    preference = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    fund_transfers = (
        db.query(FundTransfer).filter(FundTransfer.user_id == user.id)
        .order_by(FundTransfer.date.desc(), FundTransfer.id.desc()).all()
    )
    custom_categories = db.query(TransactionCategory).filter(TransactionCategory.user_id == user.id).order_by(TransactionCategory.name).all()

    return {
        "expenses": [to_expense_out(row) for row in expenses],
        "budgets": [
            {
                "id": row.id,
                "category": row.category,
                "amount": row.amount,
                "period": row.period,
                "fund_source": row.fund_source,
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
            {"id": row.id, "date": row.date, "portfolio_value": row.portfolio_value, "notes": row.notes, "screenshot_url": row.screenshot_url}
            for row in reports
        ],
        "investment_assets": [
            {
                "id": row.id,
                "name": row.name,
                "symbol": row.symbol,
                "asset_type": row.asset_type,
                "quantity": row.quantity,
                "average_price": row.average_price,
                "current_price": row.current_price,
                "currency": row.currency,
                "exchange_rate_to_idr": row.exchange_rate_to_idr,
                "acquired_date": row.acquired_date,
                "notes": row.notes,
                "cost_basis": row.quantity * row.average_price * row.exchange_rate_to_idr,
                "market_value": row.quantity * row.current_price * row.exchange_rate_to_idr,
                "unrealized_pl": row.quantity * (row.current_price - row.average_price) * row.exchange_rate_to_idr,
                "unrealized_pl_percent": ((row.current_price - row.average_price) / row.average_price * 100) if row.average_price else 0,
            }
            for row in investment_assets
        ],
        "stock_prices": {row.ticker: row.price for row in stock_prices},
        "preferences": preference_dict(preference),
        "preferences_persisted": preference is not None,
        "fund_accounts": account_rows(db, user.id, expenses, fund_transfers),
        "fund_transfers": [
            {
                "id": row.id,
                "from_source": row.from_source,
                "to_source": row.to_source,
                "amount": row.amount,
                "date": row.date,
                "notes": row.notes,
            }
            for row in fund_transfers
        ],
        "custom_categories": [
            {"id": row.id, "transaction_type": row.transaction_type, "name": row.name}
            for row in custom_categories
        ],
    }


@router.get("/export")
def export_account_data(db: Session = Depends(get_db), user=Depends(get_current_user)):
    data = get_account_data(db, user)
    messages = db.query(ChatMessage).filter(ChatMessage.user_id == user.id).order_by(ChatMessage.created_at).all()
    data["account"] = {
        "id": user.id, "name": user.name, "email": user.email,
        "email_verified": user.email_verified, "created_at": user.created_at,
    }
    data["chat_messages"] = [
        {
            "id": row.id, "session_date": row.session_date, "role": row.role,
            "content": row.content, "created_at": row.created_at,
        }
        for row in messages
    ]
    data["receipt_notice"] = "Foto struk tidak disertakan dalam JSON; unduh foto dari transaksi terkait."
    return data
