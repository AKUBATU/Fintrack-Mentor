from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from ..models.expense import Expense
from .deps import get_current_user

router = APIRouter(prefix="/expenses", tags=["expenses"])

@router.get("", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(Expense).filter(Expense.user_id==user.id).order_by(Expense.date.desc(), Expense.id.desc()).all()
    return [ExpenseOut(**{
        "id": r.id,
        "date": r.date,
        "amount": r.amount,
        "category": r.category,
        "payment_method": r.payment_method,
        "merchant": r.merchant,
        "notes": r.notes,
        "predicted_category": r.predicted_category,
        "confidence": r.confidence,
        "model_used": r.model_used,
    }) for r in rows]

@router.post("", response_model=ExpenseOut)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = Expense(user_id=user.id, **payload.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return ExpenseOut(id=r.id, **payload.model_dump())

@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not r:
        raise HTTPException(404, "Expense not found")
    data = payload.model_dump(exclude_unset=True)
    for k,v in data.items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return ExpenseOut(**{
        "id": r.id,
        "date": r.date,
        "amount": r.amount,
        "category": r.category,
        "payment_method": r.payment_method,
        "merchant": r.merchant,
        "notes": r.notes,
        "predicted_category": r.predicted_category,
        "confidence": r.confidence,
        "model_used": r.model_used,
    })

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not r:
        raise HTTPException(404, "Expense not found")
    db.delete(r); db.commit()
    return {"ok": True}
