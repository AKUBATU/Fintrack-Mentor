import json

from ..models.user_preference import UserPreference


DEFAULT_PREFERENCE = {
    "dca_strategy": "Belum diatur",
    "dca_amount": 0,
    "dca_frequency": "weekly",
    "focus_stocks": [],
    "compounding_dividends": False,
    "bonus_week_rule": "",
    "base_currency": "IDR",
    "timezone": "Asia/Jakarta",
    "onboarding_completed": False,
}


def preference_dict(row: UserPreference | None) -> dict:
    if not row:
        return dict(DEFAULT_PREFERENCE)
    try:
        focus_stocks = json.loads(row.focus_stocks_json)
    except (TypeError, ValueError):
        focus_stocks = []
    return {
        "dca_strategy": row.dca_strategy,
        "dca_amount": row.dca_amount,
        "dca_frequency": row.dca_frequency,
        "focus_stocks": focus_stocks if isinstance(focus_stocks, list) else [],
        "compounding_dividends": row.compounding_dividends,
        "bonus_week_rule": row.bonus_week_rule,
        "base_currency": row.base_currency,
        "timezone": row.timezone,
        "onboarding_completed": row.onboarding_completed,
    }
