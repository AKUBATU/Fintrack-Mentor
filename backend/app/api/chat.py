from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.expense import Expense
from ..models.chat_message import ChatMessage
from ..models.investment_asset import InvestmentAsset
from ..models.user_preference import UserPreference
from ..models.budget import Budget
from ..services.fund_account_service import account_rows
from ..schemas.chat import ChatHistoryItem, ChatIn, ChatOut
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user
from ..services.rate_limit_service import enforce_rate_limit

router = APIRouter(prefix="/chat", tags=["chat"])
JAKARTA_TZ = ZoneInfo("Asia/Jakarta")


def _timezone(db: Session, user_id: int) -> ZoneInfo:
    preference = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    try:
        return ZoneInfo(preference.timezone) if preference else JAKARTA_TZ
    except (KeyError, ValueError):
        return JAKARTA_TZ


def _today(db: Session, user_id: int):
    return datetime.now(_timezone(db, user_id)).date()


def _clear_old_messages(db: Session, user_id: int) -> None:
    db.query(ChatMessage).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.session_date < _today(db, user_id),
    ).delete(synchronize_session=False)


def _expense_summary(db: Session, user_id: int) -> dict:
    today = _today(db, user_id)
    rows = (
        db.query(Expense)
        .filter(
            Expense.user_id == user_id,
            Expense.transaction_type == "expense",
            Expense.date >= today.replace(day=1),
            Expense.date <= today,
        )
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
        .filter(ChatMessage.user_id == user.id, ChatMessage.session_date == _today(db, user.id))
        .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
        .all()
    )


@router.post("", response_model=ChatOut)
def chat(
    payload: ChatIn,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
) -> ChatOut:
    enforce_rate_limit(request, db, "chat", 30, 3600, str(user.id))
    expenses = _expense_summary(db, user.id)
    portfolio = compute_portfolio_summary(db, user.id)
    other_assets = db.query(InvestmentAsset).filter(InvestmentAsset.user_id == user.id).all()
    other_asset_value = sum(
        float(asset.quantity * asset.current_price * asset.exchange_rate_to_idr)
        for asset in other_assets
    )
    is_english = payload.locale == "en"
    category_text = ", ".join(
        f"{category} (Rp {amount:,.0f})"
        for category, amount in expenses["top_categories"]
    ) or ("no data yet" if is_english else "belum ada")
    question = payload.message.lower()
    if any(word in question for word in ("saldo", "cash", "rekening", "dompet", "balance", "account")):
        balances = account_rows(db, user.id)
        detail = ", ".join(f"{row['name']}: Rp {row['balance']:,.0f}" for row in balances)
        reply = (
            f"Your recorded balances: {detail}. Total across all funding sources is Rp {sum(row['balance'] for row in balances):,.0f}."
            if is_english else
            f"Saldo tercatat Anda saat ini: {detail}. Total seluruh sumber saldo Rp {sum(row['balance'] for row in balances):,.0f}."
        )
    elif any(word in question for word in ("budget", "anggaran", "batas")):
        budgets = db.query(Budget).filter(Budget.user_id == user.id).order_by(Budget.reference_date.desc()).limit(5).all()
        detail = ", ".join(f"{row.category} ({row.period}): Rp {row.amount:,.0f}" for row in budgets) or ("no budgets yet" if is_english else "belum ada budget")
        reply = (
            f"Your latest budgets: {detail}. Compare each limit with spending for the same period on the Finance page."
            if is_english else
            f"Budget terbaru Anda: {detail}. Bandingkan batas tersebut dengan pengeluaran pada periode yang sama di halaman Keuangan."
        )
    elif any(word in question for word in ("portofolio", "portfolio", "investasi", "dividen")):
        reply = (
            f"Active stock cost basis is Rp {float(portfolio['total_cost_basis']):,.0f}, realized P/L is "
            f"Rp {float(portfolio['total_realized_pl']):,.0f}, total dividends are Rp {float(portfolio['total_dividends']):,.0f}, "
            f"and non-stock instruments are worth Rp {other_asset_value:,.0f}. Keep asset prices updated so this summary stays relevant."
        ) if is_english else (
            f"Modal saham aktif tercatat Rp {float(portfolio['total_cost_basis']):,.0f}, realized P/L "
            f"Rp {float(portfolio['total_realized_pl']):,.0f}, total dividen Rp {float(portfolio['total_dividends']):,.0f}, "
            f"dan nilai instrumen non-saham Rp {other_asset_value:,.0f}. Perbarui harga aset agar ringkasan tetap relevan."
        )
    else:
        reply = (
            f"Spending this month is Rp {expenses['total']:,.0f} across {expenses['count']} transactions. "
            f"Top categories: {category_text}. Recorded dividends total Rp {float(portfolio['total_dividends']):,.0f}. "
            "Use the words 'balance', 'budget', or 'portfolio' for a more specific breakdown."
        ) if is_english else (
            f"Pengeluaran bulan berjalan Rp {expenses['total']:,.0f} dari {expenses['count']} transaksi. "
            f"Kategori terbesar: {category_text}. Total dividen tercatat Rp {float(portfolio['total_dividends']):,.0f}. "
            "Gunakan kata 'saldo', 'budget', atau 'portofolio' agar saya menampilkan rincian yang sesuai."
        )
    reply += ("\n\nEducational analysis based on FinTrack data; this is not professional financial advice." if is_english else "\n\nAnalisis edukatif berdasarkan data FinTrack dan bukan rekomendasi keuangan profesional.")
    _clear_old_messages(db, user.id)
    session_date = _today(db, user.id)
    db.add_all([
        ChatMessage(user_id=user.id, session_date=session_date, role="user", content=payload.message),
        ChatMessage(user_id=user.id, session_date=session_date, role="assistant", content=reply),
    ])
    db.commit()
    return ChatOut(reply=reply)
