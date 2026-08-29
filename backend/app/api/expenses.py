from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
from uuid import uuid4
from ..core.db import get_db
from ..schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate, ReceiptScanOut
from ..models.expense import Expense
from .deps import get_current_user
from ..core.config import settings
from ..services.receipt_service import scan_receipts

router = APIRouter(prefix="/expenses", tags=["expenses"])


def validate_receipt(content: bytes):
    signatures = {
        "jpg": content.startswith(b"\xff\xd8\xff"),
        "png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP",
    }
    extension = next((name for name, valid in signatures.items() if valid), None)
    if not extension:
        raise HTTPException(415, "Foto struk harus berformat JPG, PNG, atau WebP")
    mime_type = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp"}[extension]
    return extension, mime_type

def to_expense_out(row: Expense):
    return ExpenseOut(
        id=row.id,
        date=row.date,
        amount=row.amount,
        transaction_type=row.transaction_type,
        category=row.category,
        payment_method=row.payment_method,
        merchant=row.merchant,
        notes=row.notes,
        predicted_category=row.predicted_category,
        confidence=row.confidence,
        model_used=row.model_used,
        has_receipt=bool(row.receipt_path),
    )

@router.get("", response_model=list[ExpenseOut])
def list_expenses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(Expense).filter(Expense.user_id==user.id).order_by(Expense.date.desc(), Expense.id.desc()).all()
    return [to_expense_out(row) for row in rows]

@router.post("", response_model=ExpenseOut)
def create_expense(payload: ExpenseCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = Expense(user_id=user.id, **payload.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_expense_out(r)


@router.post("/scan-receipt", response_model=ReceiptScanOut)
async def analyze_receipt(
    receipts: list[UploadFile] = File(...),
    user=Depends(get_current_user),
):
    if not 1 <= len(receipts) <= 4:
        raise HTTPException(400, "Kirim 1 sampai 4 foto untuk satu struk")
    images = []
    for receipt in receipts:
        content = await receipt.read(settings.MAX_RECEIPT_SIZE_BYTES + 1)
        if len(content) > settings.MAX_RECEIPT_SIZE_BYTES:
            raise HTTPException(413, "Ukuran setiap foto struk maksimal 5 MB")
        _, mime_type = validate_receipt(content)
        images.append((content, mime_type))
    try:
        return ReceiptScanOut(**scan_receipts(images))
    except RuntimeError as exc:
        raise HTTPException(422, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, "Foto struk gagal dianalisis. Coba foto yang lebih jelas.") from exc

@router.patch("/{expense_id}", response_model=ExpenseOut)
def update_expense(expense_id: int, payload: ExpenseUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not r:
        raise HTTPException(404, "Expense not found")
    data = payload.model_dump(exclude_unset=True)
    for k,v in data.items():
        setattr(r, k, v)
    db.commit(); db.refresh(r)
    return to_expense_out(r)

@router.post("/{expense_id}/receipt")
async def upload_receipt(
    expense_id: int,
    receipt: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    expense = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not expense:
        raise HTTPException(404, "Transaction not found")

    content = await receipt.read(settings.MAX_RECEIPT_SIZE_BYTES + 1)
    if len(content) > settings.MAX_RECEIPT_SIZE_BYTES:
        raise HTTPException(413, "Ukuran foto struk maksimal 5 MB")

    extension, _ = validate_receipt(content)

    settings.RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)
    target = settings.RECEIPTS_DIR / f"{uuid4().hex}.{extension}"
    target.write_bytes(content)
    old_path = Path(expense.receipt_path) if expense.receipt_path else None
    expense.receipt_path = str(target)
    db.commit()
    if old_path and old_path.exists() and old_path.is_file():
        old_path.unlink()
    return {"has_receipt": True}

@router.get("/{expense_id}/receipt")
def get_receipt(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not expense or not expense.receipt_path:
        raise HTTPException(404, "Receipt not found")
    path = Path(expense.receipt_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "Receipt file not found")
    return FileResponse(path)

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not r:
        raise HTTPException(404, "Expense not found")
    receipt_path = Path(r.receipt_path) if r.receipt_path else None
    db.delete(r); db.commit()
    if receipt_path and receipt_path.exists() and receipt_path.is_file():
        receipt_path.unlink()
    return {"ok": True}
