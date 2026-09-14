from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.portfolio import (
    StockTransactionCreate, StockTransactionOut, StockTransactionUpdate,
    DividendCreate, DividendOut, DividendUpdate, StockPriceOut, StockPriceUpdate,
    PortfolioSummaryOut
)
from ..models.stock_transaction import StockTransaction
from ..models.dividend import Dividend
from ..models.stock_price import StockPrice
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


def validate_stock_timeline(transactions: list[StockTransaction]) -> None:
    balances: dict[str, int] = {}
    for transaction in sorted(transactions, key=lambda row: (row.date, row.id if row.id is not None else 2**63)):
        ticker = transaction.ticker.strip().upper()
        current = balances.get(ticker, 0)
        if transaction.type.upper() == "BUY":
            balances[ticker] = current + transaction.shares
        elif transaction.shares > current:
            raise HTTPException(
                422,
                f"Penjualan {ticker} melebihi kepemilikan pada tanggal transaksi",
            )
        else:
            balances[ticker] = current - transaction.shares

@router.get("/transactions", response_model=list[StockTransactionOut])
def list_transactions(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(StockTransaction).filter(StockTransaction.user_id==user.id).order_by(StockTransaction.date.desc(), StockTransaction.id.desc()).all()
    return [StockTransactionOut(id=r.id, ticker=r.ticker, type=r.type, shares=r.shares, price=r.price, date=r.date) for r in rows]

@router.post("/transactions", response_model=StockTransactionOut)
def add_transaction(payload: StockTransactionCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    t = StockTransaction(user_id=user.id, **payload.model_dump())
    existing = db.query(StockTransaction).filter(StockTransaction.user_id == user.id).all()
    validate_stock_timeline([*existing, t])
    db.add(t); db.commit(); db.refresh(t)
    return StockTransactionOut(id=t.id, **payload.model_dump())

@router.patch("/transactions/{transaction_id}", response_model=StockTransactionOut)
def update_transaction(
    transaction_id: int,
    payload: StockTransactionUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    transaction = db.query(StockTransaction).filter(
        StockTransaction.id == transaction_id,
        StockTransaction.user_id == user.id,
    ).first()
    if not transaction:
        raise HTTPException(404, "Stock transaction not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)
    validate_stock_timeline(db.query(StockTransaction).filter(StockTransaction.user_id == user.id).all())
    db.commit()
    db.refresh(transaction)
    return StockTransactionOut(
        id=transaction.id,
        ticker=transaction.ticker,
        type=transaction.type,
        shares=transaction.shares,
        price=transaction.price,
        date=transaction.date,
    )

@router.delete("/transactions/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    transaction = db.query(StockTransaction).filter(
        StockTransaction.id == transaction_id,
        StockTransaction.user_id == user.id,
    ).first()
    if not transaction:
        raise HTTPException(404, "Stock transaction not found")
    remaining = db.query(StockTransaction).filter(
        StockTransaction.user_id == user.id,
        StockTransaction.id != transaction_id,
    ).all()
    validate_stock_timeline(remaining)
    db.delete(transaction)
    db.commit()
    return {"ok": True}

@router.put("/prices/{ticker}", response_model=StockPriceOut)
def update_stock_price(
    ticker: str,
    payload: StockPriceUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    normalized_ticker = ticker.strip().upper()
    if not normalized_ticker:
        raise HTTPException(400, "Ticker wajib diisi")
    price = db.query(StockPrice).filter(
        StockPrice.user_id == user.id,
        StockPrice.ticker == normalized_ticker,
    ).first()
    if price:
        price.price = payload.price
    else:
        price = StockPrice(user_id=user.id, ticker=normalized_ticker, price=payload.price)
        db.add(price)
    db.commit()
    db.refresh(price)
    return StockPriceOut(ticker=price.ticker, price=price.price)

@router.get("/dividends", response_model=list[DividendOut])
def list_dividends(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(Dividend).filter(Dividend.user_id==user.id).order_by(Dividend.payment_date.desc(), Dividend.id.desc()).all()
    return [DividendOut(id=r.id, ticker=r.ticker, amount=r.amount, record_date=r.record_date, payment_date=r.payment_date) for r in rows]

@router.post("/dividends", response_model=DividendOut)
def add_dividend(payload: DividendCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    d = Dividend(user_id=user.id, **payload.model_dump())
    db.add(d); db.commit(); db.refresh(d)
    return DividendOut(id=d.id, **payload.model_dump())


@router.patch("/dividends/{dividend_id}", response_model=DividendOut)
def update_dividend(dividend_id: int, payload: DividendUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    dividend = db.query(Dividend).filter(Dividend.id == dividend_id, Dividend.user_id == user.id).first()
    if not dividend:
        raise HTTPException(404, "Dividend not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dividend, field, value)
    db.commit()
    db.refresh(dividend)
    return dividend


@router.delete("/dividends/{dividend_id}")
def delete_dividend(dividend_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    dividend = db.query(Dividend).filter(Dividend.id == dividend_id, Dividend.user_id == user.id).first()
    if not dividend:
        raise HTTPException(404, "Dividend not found")
    db.delete(dividend)
    db.commit()
    return {"ok": True}

@router.get("/summary", response_model=PortfolioSummaryOut)
def summary(db: Session = Depends(get_db), user=Depends(get_current_user)):
    s = compute_portfolio_summary(db, user.id)
    return PortfolioSummaryOut(**s)
