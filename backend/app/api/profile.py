import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.user_preference import UserPreference
from ..schemas.profile import ProfilePreferenceIn, ProfilePreferenceOut
from ..services.profile_service import preference_dict
from .deps import get_current_user

router = APIRouter(prefix="/profile/preferences", tags=["profile"])


@router.get("", response_model=ProfilePreferenceOut)
def get_preferences(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return preference_dict(db.query(UserPreference).filter(UserPreference.user_id == user.id).first())


@router.put("", response_model=ProfilePreferenceOut)
def update_preferences(payload: ProfilePreferenceIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = db.query(UserPreference).filter(UserPreference.user_id == user.id).first()
    if not row:
        row = UserPreference(user_id=user.id)
        db.add(row)
    row.dca_strategy = payload.dca_strategy
    row.dca_amount = payload.dca_amount
    row.dca_frequency = payload.dca_frequency
    row.focus_stocks_json = json.dumps(payload.focus_stocks)
    row.compounding_dividends = payload.compounding_dividends
    row.bonus_week_rule = payload.bonus_week_rule
    db.commit()
    db.refresh(row)
    return preference_dict(row)
