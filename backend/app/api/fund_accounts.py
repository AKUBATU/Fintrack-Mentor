from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.fund_account import FundAccount
from ..models.fund_transfer import FundTransfer
from uuid import uuid4

from ..models.expense import Expense
from ..models.budget import Budget
from ..schemas.fund_account import FundAccountCreate, FundAccountOut, FundAccountUpdate, FundTransferCreate, FundTransferOut
from ..services.fund_account_service import account_rows
from .deps import get_current_user

router = APIRouter(prefix="/fund-accounts", tags=["fund-accounts"])


@router.get("", response_model=list[FundAccountOut])
def list_accounts(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return account_rows(db, user.id)


@router.post("", response_model=FundAccountOut)
def create_account(payload: FundAccountCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    source = f"account-{uuid4().hex[:10]}"
    row = FundAccount(user_id=user.id, source=source, name=" ".join(payload.name.split()), opening_balance=payload.opening_balance)
    db.add(row)
    db.commit()
    return next(item for item in account_rows(db, user.id) if item["source"] == source)


@router.put("/{source}", response_model=FundAccountOut)
def update_account(source: str, payload: FundAccountUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(FundAccount).filter(FundAccount.user_id == user.id, FundAccount.source == source).first()
    if not row:
        row = FundAccount(user_id=user.id, source=source)
        db.add(row)
    row.name = payload.name.strip()
    row.opening_balance = payload.opening_balance
    db.commit()
    return next(item for item in account_rows(db, user.id) if item["source"] == source)


@router.delete("/{source}")
def delete_account(source: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(FundAccount).filter(FundAccount.user_id == user.id, FundAccount.source == source).first()
    if not row:
        raise HTTPException(404, "Sumber saldo tidak ditemukan")
    is_used = (
        db.query(Expense.id).filter(Expense.user_id == user.id, Expense.fund_source == source).first()
        or db.query(Budget.id).filter(Budget.user_id == user.id, Budget.fund_source == source).first()
        or db.query(FundTransfer.id).filter(
            FundTransfer.user_id == user.id,
            (FundTransfer.from_source == source) | (FundTransfer.to_source == source),
        ).first()
    )
    if is_used:
        raise HTTPException(409, "Sumber saldo masih digunakan oleh transaksi, budget, atau transfer")
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/transfers", response_model=list[FundTransferOut])
def list_transfers(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(FundTransfer).filter(FundTransfer.user_id == user.id).order_by(FundTransfer.date.desc(), FundTransfer.id.desc()).all()


@router.post("/transfers", response_model=FundTransferOut)
def create_transfer(payload: FundTransferCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    if payload.from_source == payload.to_source:
        raise HTTPException(422, "Sumber dan tujuan transfer harus berbeda")
    available_sources = {item["source"] for item in account_rows(db, user.id)}
    if payload.from_source not in available_sources or payload.to_source not in available_sources:
        raise HTTPException(422, "Sumber saldo tidak tersedia")
    row = FundTransfer(user_id=user.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/transfers/{transfer_id}")
def delete_transfer(transfer_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(FundTransfer).filter(FundTransfer.user_id == user.id, FundTransfer.id == transfer_id).first()
    if not row:
        raise HTTPException(404, "Transfer tidak ditemukan")
    db.delete(row)
    db.commit()
    return {"ok": True}
