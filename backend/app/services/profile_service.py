import json

from ..models.user_preference import UserPreference


DEFAULT_PREFERENCE = {
    "dca_strategy": "Balanced",
    "dca_amount": 500000,
    "dca_frequency": "weekly",
    "focus_stocks": ["BBRI", "BMRI"],
    "compounding_dividends": True,
    "bonus_week_rule": "Jika ada bonus, tambah 1x DCA",
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
    }
