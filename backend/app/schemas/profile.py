from typing import Literal

from pydantic import BaseModel, Field


class ProfilePreferenceIn(BaseModel):
    dca_strategy: str = Field(max_length=1000)
    dca_amount: float = Field(ge=0)
    dca_frequency: Literal["weekly", "biweekly", "monthly"]
    focus_stocks: list[str] = Field(max_length=50)
    compounding_dividends: bool
    bonus_week_rule: str = Field(max_length=1000)


class ProfilePreferenceOut(ProfilePreferenceIn):
    pass
