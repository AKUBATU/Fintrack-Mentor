from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from collections import defaultdict
from math import sqrt
from ..core.db import get_db
from ..schemas.ml import PredictCategoryIn, PredictCategoryOut, FeedbackIn, AnomalyOut
from ..models.expense import Expense
from .deps import get_current_user
from ..services.rate_limit_service import enforce_rate_limit

router = APIRouter(prefix="/ml", tags=["ml"])

@router.post("/predict-category", response_model=PredictCategoryOut)
def predict_category(payload: PredictCategoryIn, request: Request, db: Session = Depends(get_db), user=Depends(get_current_user)):
    enforce_rate_limit(request, db, "category-prediction", 60, 3600, str(user.id))
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
    rows = db.query(Expense).filter(
        Expense.user_id==user.id,
        Expense.transaction_type=="expense",
    ).all()
    if not rows:
        return []
    # Population z-score within each category, implemented without heavy
    # scientific dependencies so serverless cold starts remain lightweight.
    grouped = defaultdict(list)
    for row in rows:
        grouped[row.category].append(row)
    out: list[AnomalyOut] = []
    for category, items in grouped.items():
        if len(items) < 5:
            continue
        amounts = [float(item.amount) for item in items]
        mean = sum(amounts) / len(amounts)
        sd = sqrt(sum((amount - mean) ** 2 for amount in amounts) / len(amounts))
        if sd <= 1e-9:
            continue
        for row, amount in zip(items, amounts):
            z_score = (amount - mean) / sd
            if abs(z_score) >= 3.0:
                out.append(AnomalyOut(
                    expense_id=row.id,
                    date=row.date,
                    amount=amount,
                    category=category,
                    reason=f"z-score anomaly in {category}",
                    z_score=z_score,
                ))
    # sort by abs score desc
    out.sort(key=lambda a: abs(a.z_score or 0), reverse=True)
    return out[:50]
