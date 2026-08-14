from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.budget import BudgetCreate, BudgetOut, BudgetUpdate
from ..models.budget import Budget
from .deps import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])

@router.get("", response_model=list[BudgetOut])
def list_budgets(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(Budget).filter(Budget.user_id==user.id).order_by(Budget.id.desc()).all()
    return [BudgetOut(id=r.id, category=r.category, amount=r.amount, period=r.period) for r in rows]

@router.post("", response_model=BudgetOut)
def create_budget(payload: BudgetCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = Budget(user_id=user.id, **payload.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return BudgetOut(id=r.id, **payload.model_dump())

@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(budget_id: int, payload: BudgetUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Budget).filter(Budget.user_id==user.id, Budget.id==budget_id).first()
    if not r:
        raise HTTPException(404, "Budget not found")
    data = payload.model_dump(exclude_unset=True)
    for k,v in data.items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return BudgetOut(id=r.id, category=r.category, amount=r.amount, period=r.period)

@router.delete("/{budget_id}")
def delete_budget(budget_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Budget).filter(Budget.user_id==user.id, Budget.id==budget_id).first()
    if not r:
        raise HTTPException(404, "Budget not found")
    db.delete(r); db.commit()
    return {"ok": True}
