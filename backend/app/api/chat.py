from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.expense import Expense
from ..schemas.chat import ChatIn, ChatOut
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])


def _expense_summary(db: Session, user_id: int) -> dict:
    rows = (
        db.query(Expense)
        .filter(Expense.user_id == user_id, Expense.transaction_type == "expense")
        .all()
    )
    total = sum(float(row.amount) for row in rows)
    by_category: dict[str, float] = {}
    for row in rows:
        by_category[row.category] = by_category.get(row.category, 0) + float(row.amount)
    top_categories = sorted(by_category.items(), key=lambda item: item[1], reverse=True)[:3]
    return {"total": total, "count": len(rows), "top_categories": top_categories}


@router.post("", response_model=ChatOut)
def chat(
    payload: ChatIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> ChatOut:
    expenses = _expense_summary(db, user.id)
    portfolio = compute_portfolio_summary(db, user.id)
    category_text = ", ".join(
        f"{category} (Rp {amount:,.0f})"
        for category, amount in expenses["top_categories"]
    ) or "belum ada"

    reply = (
        f"Ringkasan untuk pertanyaan: {payload.message}\n\n"
        f"Pengeluaran tercatat Rp {expenses['total']:,.0f} dari {expenses['count']} transaksi. "
        f"Kategori terbesar: {category_text}. Total dividen tercatat "
        f"Rp {float(portfolio['total_dividends']):,.0f}.\n\n"
        "Saran: periksa kategori pengeluaran terbesar, tetapkan batas bulanan yang realistis, "
        "dan pastikan dana darurat tersedia sebelum menambah investasi. Data di atas diolah "
        "langsung oleh server FinTrack tanpa dikirim ke layanan eksternal."
    )
    return ChatOut(reply=reply)
