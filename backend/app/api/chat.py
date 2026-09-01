from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.expense import Expense
from ..models.chat_message import ChatMessage
from ..schemas.chat import ChatHistoryItem, ChatIn, ChatOut
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])
JAKARTA_TZ = ZoneInfo("Asia/Jakarta")


def _today():
    return datetime.now(JAKARTA_TZ).date()


def _clear_old_messages(db: Session, user_id: int) -> None:
    db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.session_date < _today(),
    ).delete(synchronize_session=False)


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


@router.get("/history", response_model=list[ChatHistoryItem])
def chat_history(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> list[ChatMessage]:
    _clear_old_messages(db, user.id)
    db.commit()
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user.id, ChatMessage.session_date == _today())
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )


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
    _clear_old_messages(db, user.id)
    session_date = _today()
    db.add_all([
        ChatMessage(user_id=user.id, session_date=session_date, role="user", content=payload.message),
        ChatMessage(user_id=user.id, session_date=session_date, role="assistant", content=reply),
    ])
    db.commit()
    return ChatOut(reply=reply)
