from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.transaction_category import TransactionCategory
from ..schemas.transaction_category import TransactionCategoryCreate, TransactionCategoryOut
from .deps import get_current_user

router = APIRouter(prefix="/transaction-categories", tags=["transaction-categories"])


@router.get("", response_model=list[TransactionCategoryOut])
def list_categories(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(TransactionCategory).filter(TransactionCategory.user_id == user.id).order_by(TransactionCategory.name).all()


@router.post("", response_model=TransactionCategoryOut)
def create_category(payload: TransactionCategoryCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    name = " ".join(payload.name.split()).title()
    existing = db.query(TransactionCategory).filter(
        TransactionCategory.user_id == user.id,
        TransactionCategory.transaction_type == payload.transaction_type,
        TransactionCategory.name == name,
    ).first()
    if existing:
        raise HTTPException(409, "Kategori sudah tersedia")
    row = TransactionCategory(user_id=user.id, transaction_type=payload.transaction_type, name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(TransactionCategory).filter(TransactionCategory.user_id == user.id, TransactionCategory.id == category_id).first()
    if not row:
        raise HTTPException(404, "Kategori tidak ditemukan")
    db.delete(row)
    db.commit()
    return {"ok": True}
