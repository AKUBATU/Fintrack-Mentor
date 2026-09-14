from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import Response
from starlette.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from uuid import uuid4
from ..core.db import get_db
from ..schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate, ReceiptScanOut
from ..models.expense import Expense
from .deps import get_current_user
from ..core.config import settings
from ..services.receipt_service import scan_receipts
from ..services.receipt_storage import delete_receipt, read_receipt, store_receipt
from ..services.rate_limit_service import enforce_rate_limit
from ..services.fund_account_service import account_rows

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
        fund_source=row.fund_source,
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
    if payload.fund_source not in {row["source"] for row in account_rows(db, user.id)}:
        raise HTTPException(422, "Sumber saldo tidak tersedia")
    r = Expense(user_id=user.id, **payload.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return to_expense_out(r)


@router.post("/scan-receipt", response_model=ReceiptScanOut)
async def analyze_receipt(
    request: Request,
    receipts: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    enforce_rate_limit(request, db, "receipt-scan", 10, 3600, str(user.id))
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
        result = await run_in_threadpool(scan_receipts, images)
        return ReceiptScanOut(**result)
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
    if "fund_source" in data and data["fund_source"] not in {row["source"] for row in account_rows(db, user.id)}:
        raise HTTPException(422, "Sumber saldo tidak tersedia")
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

    extension, mime_type = validate_receipt(content)
    old_reference = expense.receipt_path
    object_key = f"{user.id}/{uuid4().hex}.{extension}"
    try:
        expense.receipt_path = store_receipt(object_key, content, mime_type)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    db.commit()
    try:
        delete_receipt(old_reference)
    except RuntimeError:
        pass
    return {"has_receipt": True}

@router.get("/{expense_id}/receipt")
def get_receipt(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    expense = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not expense or not expense.receipt_path:
        raise HTTPException(404, "Receipt not found")
    try:
        content = read_receipt(expense.receipt_path)
    except FileNotFoundError:
        raise HTTPException(404, "Receipt file not found")
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc
    extension = expense.receipt_path.rsplit(".", 1)[-1].lower()
    mime_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(extension, "application/octet-stream")
    return Response(content=content, media_type=mime_type)

@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = db.query(Expense).filter(Expense.user_id==user.id, Expense.id==expense_id).first()
    if not r:
        raise HTTPException(404, "Expense not found")
    receipt_reference = r.receipt_path
    db.delete(r); db.commit()
    try:
        delete_receipt(receipt_reference)
    except RuntimeError:
        pass
    return {"ok": True}
