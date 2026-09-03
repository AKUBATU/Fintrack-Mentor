from fastapi import APIRouter
from .auth import router as auth_router
from .expenses import router as expenses_router
from .budgets import router as budgets_router
from .portfolio import router as portfolio_router
from .daily_reports import router as reports_router
from .ml import router as ml_router
from .chat import router as chat_router
from .investment_assets import router as investment_assets_router
from .account_data import router as account_data_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(expenses_router)
api_router.include_router(budgets_router)
api_router.include_router(portfolio_router)
api_router.include_router(reports_router)
api_router.include_router(ml_router)
api_router.include_router(chat_router)
api_router.include_router(investment_assets_router)
api_router.include_router(account_data_router)
