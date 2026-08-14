from pydantic import BaseModel, Field
from datetime import date

class DailyReportBase(BaseModel):
    date: date
    portfolio_value: float = Field(gt=0)
    notes: str = ""
    screenshot_url: str | None = None

class DailyReportCreate(DailyReportBase):
    pass

class DailyReportOut(DailyReportBase):
    id: int
