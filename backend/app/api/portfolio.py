from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.portfolio import (
    StockTransactionCreate, StockTransactionOut,
    DividendCreate, DividendOut,
    PortfolioSummaryOut
)
from ..models.stock_transaction import StockTransaction
from ..models.dividend import Dividend
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("/transactions", response_model=list[StockTransactionOut])
def list_transactions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(StockTransaction).filter(StockTransaction.user_id==user.id).order_by(StockTransaction.date.desc(), StockTransaction.id.desc()).all()
    return [StockTransactionOut(id=r.id, ticker=r.ticker, type=r.type, shares=r.shares, price=r.price, date=r.date) for r in rows]

@router.post("/transactions", response_model=StockTransactionOut)
def add_transaction(payload: StockTransactionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = StockTransaction(user_id=user.id, **payload.model_dump())
    db.add(t); db.commit(); db.refresh(t)
    return StockTransactionOut(id=t.id, **payload.model_dump())

@router.get("/dividends", response_model=list[DividendOut])
def list_dividends(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(Dividend).filter(Dividend.user_id==user.id).order_by(Dividend.payment_date.desc(), Dividend.id.desc()).all()
    return [DividendOut(id=r.id, ticker=r.ticker, amount=r.amount, record_date=r.record_date, payment_date=r.payment_date) for r in rows]

@router.post("/dividends", response_model=DividendOut)
def add_dividend(payload: DividendCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = Dividend(user_id=user.id, **payload.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return DividendOut(id=d.id, **payload.model_dump())

@router.get("/summary", response_model=PortfolioSummaryOut)
def summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = compute_portfolio_summary(db, user.id)
    return PortfolioSummaryOut(**s)
