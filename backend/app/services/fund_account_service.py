from sqlalchemy.orm import Session

from ..models.expense import Expense
from ..models.fund_account import FundAccount
from ..models.fund_transfer import FundTransfer


DEFAULT_ACCOUNTS = {"bank": "Rekening Bank", "cash": "Cash"}


def account_rows(
    db: Session,
    user_id: int,
    transactions: list[Expense] | None = None,
    transfers: list[FundTransfer] | None = None,
) -> list[dict]:
    stored = {row.source: row for row in db.query(FundAccount).filter(FundAccount.user_id == user_id).all()}
    if transactions is None:
        transactions = db.query(Expense).filter(Expense.user_id == user_id).all()
    if transfers is None:
        transfers = db.query(FundTransfer).filter(FundTransfer.user_id == user_id).all()
    result = []
    sources = list(DEFAULT_ACCOUNTS) + [source for source in stored if source not in DEFAULT_ACCOUNTS]
    for source in sources:
        default_name = DEFAULT_ACCOUNTS.get(source, source.replace("-", " ").title())
        row = stored.get(source)
        opening = float(row.opening_balance) if row else 0
        flow = sum(
            float(item.amount) * (1 if item.transaction_type == "income" else -1)
            for item in transactions if item.fund_source == source
        )
        transfer_flow = sum(
            float(item.amount) * (1 if item.to_source == source else -1)
            for item in transfers if item.to_source == source or item.from_source == source
        )
        result.append({
            "source": source,
            "name": row.name if row else default_name,
            "opening_balance": opening,
            "balance": opening + flow + transfer_flow,
        })
    return result
