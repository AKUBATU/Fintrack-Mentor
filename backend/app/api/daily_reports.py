from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..schemas.daily_report import DailyReportCreate, DailyReportOut
from ..models.daily_report import DailyReport
from .deps import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("", response_model=list[DailyReportOut])
def list_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(DailyReport).filter(DailyReport.user_id==user.id).order_by(DailyReport.date.desc(), DailyReport.id.desc()).all()
    return [DailyReportOut(id=r.id, date=r.date, portfolio_value=r.portfolio_value, notes=r.notes, screenshot_url=r.screenshot_url) for r in rows]

@router.post("", response_model=DailyReportOut)
def add_report(payload: DailyReportCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    r = DailyReport(user_id=user.id, **payload.model_dump())
    db.add(r); db.commit(); db.refresh(r)
    return DailyReportOut(id=r.id, **payload.model_dump())
