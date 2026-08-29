from sqlalchemy.orm import Session
from collections import defaultdict
from ..models.stock_transaction import StockTransaction
from ..models.dividend import Dividend
from ..models.daily_report import DailyReport

def compute_portfolio_summary(db: Session, user_id: int):
    txs = db.query(StockTransaction).filter(StockTransaction.user_id==user_id).order_by(StockTransaction.date.asc()).all()
    dividends = db.query(Dividend).filter(Dividend.user_id==user_id).all()
    reports = db.query(DailyReport).filter(DailyReport.user_id==user_id).order_by(DailyReport.date.asc()).all()

    lotsize = 100

    # holdings bookkeeping (FIFO average cost)
    shares = defaultdict(int)
    cost = defaultdict(float)
    realized = defaultdict(float)

    for t in txs:
        if t.type.upper() == "BUY":
            shares[t.ticker] += t.shares
            cost[t.ticker] += t.shares * t.price
        else:
            # SELL
            if shares[t.ticker] <= 0:
                continue
            avg = cost[t.ticker] / shares[t.ticker] if shares[t.ticker] else 0
            sell_qty = min(t.shares, shares[t.ticker])
            realized[t.ticker] += (t.price - avg) * sell_qty
            shares[t.ticker] -= sell_qty
            cost[t.ticker] -= avg * sell_qty

    holdings = []
    total_cost = 0.0
    total_realized = sum(realized.values())
    for ticker, qty in shares.items():
        if qty <= 0:
            continue
        avg = cost[ticker] / qty if qty else 0
        holdings.append({
            "ticker": ticker,
            "shares": qty,
            "lots": qty / lotsize,
            "avg_price": avg,
            "market_price": None,
            "market_value": None,
            "cost_basis": cost[ticker],
            "unrealized_pl": None,
            "realized_pl": realized.get(ticker, 0.0),
        })
        total_cost += cost[ticker]

    total_div = sum(d.amount for d in dividends)

    # max drawdown from daily reports (equity curve)
    max_dd = None
    if reports:
        peak = reports[0].portfolio_value
        max_dd = 0.0
        for r in reports:
            v = r.portfolio_value
            if v > peak:
                peak = v
            dd = (peak - v) / peak if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd

    return {
        "total_cost_basis": total_cost,
        "total_market_value": None,
        "total_unrealized_pl": None,
        "total_realized_pl": total_realized,
        "total_dividends": total_div,
        "holdings": holdings,
        "max_drawdown": max_dd,
    }
