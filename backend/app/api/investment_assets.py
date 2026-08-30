from collections import defaultdict
import json
from urllib.error import URLError
from urllib.request import urlopen

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models.investment_asset import InvestmentAsset
from ..models.stock_transaction import StockTransaction
from ..schemas.investment_asset import (
    AllocationOut, InvestmentAssetCreate, InvestmentAssetOut,
    InvestmentAssetUpdate, PortfolioHealthOut,
)
from .deps import get_current_user

router = APIRouter(prefix="/investment-assets", tags=["investment-assets"])


def asset_out(asset: InvestmentAsset) -> InvestmentAssetOut:
    cost = asset.quantity * asset.average_price * asset.exchange_rate_to_idr
    value = asset.quantity * asset.current_price * asset.exchange_rate_to_idr
    profit = value - cost
    return InvestmentAssetOut(
        id=asset.id, name=asset.name, symbol=asset.symbol,
        asset_type=asset.asset_type, quantity=asset.quantity,
        average_price=asset.average_price, current_price=asset.current_price,
        currency=asset.currency, exchange_rate_to_idr=asset.exchange_rate_to_idr,
        acquired_date=asset.acquired_date, notes=asset.notes,
        cost_basis=cost, market_value=value, unrealized_pl=profit,
        unrealized_pl_percent=(profit / cost * 100) if cost else 0,
    )


@router.get("", response_model=list[InvestmentAssetOut])
def list_assets(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = db.query(InvestmentAsset).filter(InvestmentAsset.user_id == user.id).order_by(InvestmentAsset.id.desc()).all()
    return [asset_out(row) for row in rows]


@router.post("", response_model=InvestmentAssetOut)
def create_asset(payload: InvestmentAssetCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    asset = InvestmentAsset(user_id=user.id, **payload.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset_out(asset)


@router.get("/exchange-rate")
def exchange_rate(currency: str, user=Depends(get_current_user)):
    code = currency.strip().upper()
    if code == "IDR":
        return {"currency": "IDR", "rate": 1, "date": None}
    if code not in {"USD", "EUR"}:
        raise HTTPException(422, "Mata uang tidak didukung")
    try:
        with urlopen(f"https://api.frankfurter.dev/v2/rate/{code}/IDR", timeout=8) as response:
            result = json.load(response)
        rate = float(result["rate"])
        if rate <= 0:
            raise ValueError("Invalid exchange rate")
        return {"currency": code, "rate": rate, "date": result.get("date")}
    except (URLError, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(503, "Kurs otomatis sedang tidak tersedia; masukkan kurs secara manual") from exc


@router.patch("/{asset_id}", response_model=InvestmentAssetOut)
def update_asset(asset_id: int, payload: InvestmentAssetUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    asset = db.query(InvestmentAsset).filter(InvestmentAsset.id == asset_id, InvestmentAsset.user_id == user.id).first()
    if not asset:
        raise HTTPException(404, "Investment asset not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset_out(asset)


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    asset = db.query(InvestmentAsset).filter(InvestmentAsset.id == asset_id, InvestmentAsset.user_id == user.id).first()
    if not asset:
        raise HTTPException(404, "Investment asset not found")
    db.delete(asset)
    db.commit()
    return {"ok": True}


def stock_position_values(db: Session, user_id: int) -> list[float]:
    transactions = db.query(StockTransaction).filter(StockTransaction.user_id == user_id).order_by(StockTransaction.date, StockTransaction.id).all()
    positions = {}
    for transaction in transactions:
        current = positions.setdefault(transaction.ticker, {"shares": 0, "cost": 0.0, "price": transaction.price})
        current["price"] = transaction.price
        if transaction.type.upper() == "BUY":
            current["shares"] += transaction.shares
            current["cost"] += transaction.shares * transaction.price
        elif current["shares"] > 0:
            average = current["cost"] / current["shares"]
            sold = min(transaction.shares, current["shares"])
            current["shares"] -= sold
            current["cost"] -= sold * average
    return [position["shares"] * position["price"] for position in positions.values() if position["shares"] > 0]


@router.get("/health/summary", response_model=PortfolioHealthOut)
def portfolio_health(db: Session = Depends(get_db), user=Depends(get_current_user)):
    assets = db.query(InvestmentAsset).filter(InvestmentAsset.user_id == user.id).all()
    values = [(asset.asset_type, asset.quantity * asset.current_price * asset.exchange_rate_to_idr) for asset in assets]
    costs = [asset.quantity * asset.average_price * asset.exchange_rate_to_idr for asset in assets]
    stock_values = stock_position_values(db, user.id)
    values.extend(("stock", value) for value in stock_values)
    costs.extend(stock_values)
    total_value = sum(value for _, value in values)
    total_cost = sum(costs)

    allocations_map = defaultdict(float)
    for asset_type, value in values:
        allocations_map[asset_type] += value
    allocations = sorted([
        AllocationOut(asset_type=asset_type, value=value, percentage=(value / total_value * 100) if total_value else 0)
        for asset_type, value in allocations_map.items()
    ], key=lambda item: item.value, reverse=True)

    if total_value <= 0:
        return PortfolioHealthOut(
            score=0, status="Belum dapat dinilai", total_value=0, total_cost=total_cost,
            unrealized_pl=-total_cost, diversification_score=0, concentration_score=0,
            liquidity_score=0, risk_score=0, largest_position_percentage=0,
            allocations=[], insights=["Tambahkan aset dan harga terkini untuk mulai menilai kesehatan portofolio."],
        )

    position_values = [value for _, value in values if value > 0]
    largest = max(position_values, default=0) / total_value * 100
    diversification = min(100, round(len(allocations_map) / 4 * 100))
    concentration = max(0, min(100, round((100 - largest) / 75 * 100)))
    liquidity_weights = {"cash": 1, "deposit": .9, "stock": .8, "etf": .85, "money_market_fund": .9, "mutual_fund": .8, "bond": .7, "gold": .7, "crypto": .65, "forex": .8}
    liquidity = round(sum(value * liquidity_weights.get(asset_type, .25) for asset_type, value in values) / total_value * 100)
    risk_weights = {"cash": 5, "deposit": 10, "money_market_fund": 15, "bond": 25, "gold": 40, "mutual_fund": 45, "etf": 55, "stock": 65, "property": 50, "pension": 35, "insurance_investment": 35, "p2p": 70, "crypto": 90, "forex": 90, "derivative": 100, "business": 80, "private_equity": 85, "collectible": 75, "commodity": 65, "other": 60}
    risk_level = sum(value * risk_weights.get(asset_type, 60) for asset_type, value in values) / total_value
    risk_score = max(0, min(100, round(100 - abs(risk_level - 45) * 1.8)))
    score = round(diversification * .3 + concentration * .3 + liquidity * .2 + risk_score * .2)
    status = "Sehat" if score >= 75 else "Cukup sehat" if score >= 55 else "Perlu perhatian" if score >= 35 else "Berisiko tinggi"
    insights = []
    if largest > 50: insights.append(f"Posisi terbesar mencapai {largest:.1f}%—risiko konsentrasi cukup tinggi.")
    if len(allocations_map) < 3: insights.append("Diversifikasi masih rendah; pertimbangkan instrumen dengan karakter risiko berbeda.")
    if liquidity < 45: insights.append("Likuiditas portofolio rendah; pastikan dana darurat tersedia di luar aset tidak likuid.")
    if risk_level > 70: insights.append("Eksposur aset berisiko tinggi cukup dominan.")
    if not insights: insights.append("Komposisi portofolio relatif seimbang berdasarkan diversifikasi, konsentrasi, likuiditas, dan risiko.")
    return PortfolioHealthOut(
        score=score, status=status, total_value=total_value, total_cost=total_cost,
        unrealized_pl=total_value-total_cost, diversification_score=diversification,
        concentration_score=concentration, liquidity_score=liquidity, risk_score=risk_score,
        largest_position_percentage=largest, allocations=allocations, insights=insights,
    )
