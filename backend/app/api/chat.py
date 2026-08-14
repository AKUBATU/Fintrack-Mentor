from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from openai import OpenAI

from ..core.config import settings
from ..core.db import get_db
from ..schemas.chat import ChatIn, ChatOut
from ..models.expense import Expense
from ..models.stock_transaction import StockTransaction
from ..models.dividend import Dividend
from ..services.portfolio_service import compute_portfolio_summary
from .deps import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

def _expense_summary(db: Session, user_id: int):
    rows = db.query(Expense).filter(Expense.user_id==user_id).all()
    total = sum(r.amount for r in rows)
    by_cat = {}
    for r in rows:
        by_cat[r.category] = by_cat.get(r.category, 0.0) + float(r.amount)
    # top categories
    top = sorted(by_cat.items(), key=lambda x: x[1], reverse=True)[:5]
    return {"total": float(total), "top_categories": [{"category":k,"amount":float(v)} for k,v in top], "count": len(rows)}

def _add_expense(db: Session, user_id: int, payload: dict):
    r = Expense(
        user_id=user_id,
        date=date.fromisoformat(payload["date"]),
        amount=float(payload["amount"]),
        category=str(payload.get("category") or "Lainnya"),
        payment_method=str(payload.get("payment_method") or "Cash"),
        merchant=str(payload.get("merchant") or ""),
        notes=str(payload.get("notes") or ""),
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id}

def _add_transaction(db: Session, user_id: int, payload: dict):
    r = StockTransaction(
        user_id=user_id,
        ticker=str(payload["ticker"]).upper(),
        type=str(payload["type"]).upper(),
        shares=int(payload["shares"]),
        price=float(payload["price"]),
        date=date.fromisoformat(payload["date"]),
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id}

def _add_dividend(db: Session, user_id: int, payload: dict):
    r = Dividend(
        user_id=user_id,
        ticker=str(payload["ticker"]).upper(),
        amount=float(payload["amount"]),
        record_date=date.fromisoformat(payload["record_date"]),
        payment_date=date.fromisoformat(payload["payment_date"]),
    )
    db.add(r); db.commit(); db.refresh(r)
    return {"id": r.id}

@router.post("", response_model=ChatOut)
def chat(payload: ChatIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Fallback if no OpenAI key
    if not settings.OPENAI_API_KEY:
        exp = _expense_summary(db, user.id)
        port = compute_portfolio_summary(db, user.id)
        reply = (
            "1) Analisis masalah\n"
            f"- Kamu berkata: {payload.message}\n"
            f"- Snapshot: total expense={exp['total']:.0f} ({exp['count']} transaksi), dividend={port['total_dividends']:.0f}\n\n"
            "2) Asumsi tersembunyi\n"
            "- Aku asumsikan tujuan kamu adalah mengontrol cashflow dan disiplin DCA tanpa mengorbankan likuiditas.\n\n"
            "3) Alternatif\n"
            "- (A) Pangkas kategori top spender, (B) atur budget per kategori, (C) jadwalkan DCA tetap lalu sisanya fleksibel.\n\n"
            "4) Kesimpulan\n"
            "- Mulai dari 1 perubahan paling berdampak: batasi kategori terbesar dan otomatisasikan pencatatan.\n\n"
            "5) Next step\n"
            "- Coba tulis 3 pengeluaran terbesar minggu ini + target budget; aku bantu buat aturan dan rencana."
        )
        return ChatOut(reply=reply)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    tools = [
        {
            "type": "function",
            "function": {
                "name": "get_expense_summary",
                "description": "Get user's expense summary (total and top categories).",
                "parameters": {"type":"object","properties":{},"required":[]},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "get_portfolio_summary",
                "description": "Get user's portfolio summary (holdings, dividends, realized P/L).",
                "parameters": {"type":"object","properties":{},"required":[]},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "add_expense",
                "description": "Add an expense transaction.",
                "parameters": {
                    "type":"object",
                    "properties":{
                        "date":{"type":"string"},
                        "amount":{"type":"number"},
                        "category":{"type":"string"},
                        "payment_method":{"type":"string"},
                        "merchant":{"type":"string"},
                        "notes":{"type":"string"},
                    },
                    "required":["date","amount"]
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "add_transaction",
                "description": "Add a stock transaction (BUY/SELL). shares is number of shares (1 lot = 100 shares).",
                "parameters": {
                    "type":"object",
                    "properties":{
                        "ticker":{"type":"string"},
                        "type":{"type":"string"},
                        "shares":{"type":"integer"},
                        "price":{"type":"number"},
                        "date":{"type":"string"},
                    },
                    "required":["ticker","type","shares","price","date"]
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "add_dividend",
                "description": "Add a cash dividend record.",
                "parameters": {
                    "type":"object",
                    "properties":{
                        "ticker":{"type":"string"},
                        "amount":{"type":"number"},
                        "record_date":{"type":"string"},
                        "payment_date":{"type":"string"},
                    },
                    "required":["ticker","amount","record_date","payment_date"]
                },
            },
        },
    ]

    system = (
        "You are FinTrack Mentor. Always answer in Indonesian with structure:\n"
        "1) Analisis masalah\n2) Asumsi tersembunyi\n3) Alternatif\n4) Kesimpulan\n5) Next step\n"
        "Use tools when needed to read or write user data. Be concise but actionable."
    )

    messages = [
        {"role":"system","content":system},
        {"role":"user","content":payload.message},
    ]

    resp = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        tools=tools,
        tool_choice="auto",
    )

    msg = resp.choices[0].message

    # Handle tool calls (simple single round)
    if msg.tool_calls:
        tool_results = []
        for tc in msg.tool_calls:
            name = tc.function.name
            args = {}
            try:
                import json
                args = json.loads(tc.function.arguments or "{}")
            except Exception:
                args = {}

            if name == "get_expense_summary":
                result = _expense_summary(db, user.id)
            elif name == "get_portfolio_summary":
                result = compute_portfolio_summary(db, user.id)
            elif name == "add_expense":
                result = _add_expense(db, user.id, args)
            elif name == "add_transaction":
                result = _add_transaction(db, user.id, args)
            elif name == "add_dividend":
                result = _add_dividend(db, user.id, args)
            else:
                result = {"error": "unknown tool"}

            tool_results.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": str(result),
            })

        messages.append({"role":"assistant","content": msg.content or "", "tool_calls": msg.tool_calls})
        messages.extend(tool_results)

        resp2 = client.chat.completions.create(model=settings.OPENAI_MODEL, messages=messages)
        final = resp2.choices[0].message.content or ""
        return ChatOut(reply=final)

    return ChatOut(reply=msg.content or "")
