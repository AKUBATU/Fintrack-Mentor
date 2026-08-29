from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.ml import PredictCategoryIn, PredictCategoryOut, FeedbackIn, AnomalyOut
from ..models.expense import Expense
from .deps import get_current_user

router = APIRouter(prefix="/ml", tags=["ml"])

@router.post("/predict-category", response_model=PredictCategoryOut)
def predict_category(payload: PredictCategoryIn):
    from ..services.ml_service import categorizer

    label, conf, model_used, candidates = categorizer.predict(payload.text, payload.amount)
    return PredictCategoryOut(predicted_category=label, confidence=conf, model_used=model_used, candidates=candidates)

@router.post("/feedback")
def feedback(payload: FeedbackIn, user=Depends(get_current_user)):
    from ..services.ml_service import append_feedback

    append_feedback(payload.text, payload.amount, payload.correct_category)
    return {"ok": True}

@router.get("/anomalies", response_model=list[AnomalyOut])
def anomalies(db: Session = Depends(get_db), user=Depends(get_current_user)):
    import numpy as np
    import pandas as pd

    rows = db.query(Expense).filter(
        Expense.user_id==user.id,
        Expense.transaction_type=="expense",
    ).all()
    if not rows:
        return []
    # z-score within category
    data = [{"id": r.id, "date": r.date.isoformat(), "amount": float(r.amount), "category": r.category} for r in rows]
    df = pd.DataFrame(data)
    out: list[AnomalyOut] = []
    for cat, g in df.groupby("category"):
        if len(g) < 5:
            continue
        mu = g["amount"].mean()
        sd = g["amount"].std(ddof=0)
        if sd <= 1e-9:
            continue
        z = (g["amount"] - mu) / sd
        for idx, zz in zip(g.index, z):
            if abs(float(zz)) >= 3.0:
                r = df.loc[idx]
                out.append(AnomalyOut(
                    expense_id=int(r["id"]),
                    date=r["date"],
                    amount=float(r["amount"]),
                    category=str(r["category"]),
                    reason=f"z-score anomaly in {cat}",
                    z_score=float(zz),
                ))
    # sort by abs score desc
    out.sort(key=lambda a: abs(a.z_score or 0), reverse=True)
    return out[:50]
