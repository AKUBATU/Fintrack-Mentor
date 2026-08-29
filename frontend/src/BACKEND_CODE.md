# Backend Code Examples - FinTrack Mentor

## Python FastAPI Implementation Examples

### 1. Main Application (app/main.py)

\`\`\`python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base
from app.routers import auth, expenses, portfolio, daily_reports, ml, chat

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="FinTrack Mentor API",
    description="Financial management API with ML categorization and local financial summaries",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(daily_reports.router, prefix="/api/daily-reports", tags=["Daily Reports"])
app.include_router(ml.router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

@app.get("/")
async def root():
    return {
        "message": "FinTrack Mentor API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
\`\`\`

---

### 2. Configuration (app/config.py)

\`\`\`python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://fintrack_user:password@localhost:5432/fintrack_db"
    
    # JWT
    JWT_SECRET: str = "your-secret-key-here"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # Rate Limiting
    RATE_LIMIT_CHAT: str = "10/minute"
    RATE_LIMIT_ML: str = "20/minute"
    
    # ML Models
    MODEL_PATH: str = "./ml/saved_models"
    
    class Config:
        env_file = ".env"

settings = Settings()
\`\`\`

---

### 3. Database Connection (app/database.py)

\`\`\`python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
\`\`\`

---

### 4. User Model (app/models/user.py)

\`\`\`python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    stock_transactions = relationship("StockTransaction", back_populates="user", cascade="all, delete-orphan")
    dividends = relationship("Dividend", back_populates="user", cascade="all, delete-orphan")
    daily_reports = relationship("DailyReport", back_populates="user", cascade="all, delete-orphan")
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
\`\`\`

---

### 5. Expense Model (app/models/expense.py)

\`\`\`python
from sqlalchemy import Column, String, Float, Date, Text, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    payment_method = Column(String(100), nullable=False)
    merchant = Column(String(255), nullable=False)
    notes = Column(Text)
    predicted_category = Column(String(100))
    prediction_confidence = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="expenses")
\`\`\`

---

### 6. Portfolio Models (app/models/portfolio.py)

\`\`\`python
from sqlalchemy import Column, String, Integer, Float, Date, ForeignKey, DateTime, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from app.database import Base

class StockTransaction(Base):
    __tablename__ = "stock_transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(10), nullable=False, index=True)
    type = Column(String(10), nullable=False)  # buy or sell
    date = Column(Date, nullable=False, index=True)
    lots = Column(Integer, nullable=False)
    price_per_share = Column(Float, nullable=False)
    fee = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("type IN ('buy', 'sell')", name="check_transaction_type"),
    )
    
    # Relationships
    user = relationship("User", back_populates="stock_transactions")

class Dividend(Base):
    __tablename__ = "dividends"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    ticker = Column(String(10), nullable=False)
    dividend_per_share = Column(Float, nullable=False)
    shares = Column(Integer, nullable=False)
    total_amount = Column(Float, nullable=False)
    record_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="dividends")
\`\`\`

---

### 7. Authentication Router (app/routers/auth.py)

\`\`\`python
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token
)
from app.config import settings

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate tokens
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(new_user.id),
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role
        }
    }

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Generate tokens
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    refresh_token = create_refresh_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }
\`\`\`

---

### 8. Security Utilities (app/utils/security.py)

\`\`\`python
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def create_refresh_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=7))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user
\`\`\`

---

### 9. Portfolio Calculations (app/utils/calculations.py)

\`\`\`python
from typing import List, Dict
from datetime import datetime

def calculate_avg_price(transactions: List[Dict]) -> float:
    """
    Calculate weighted average price including fees.
    Formula: (total cost + total fees) / total shares
    """
    total_cost = 0
    total_shares = 0
    
    for tx in transactions:
        shares = tx['lots'] * 100  # 1 lot = 100 shares
        cost = (tx['price_per_share'] * shares) + tx['fee']
        total_cost += cost
        total_shares += shares
    
    return total_cost / total_shares if total_shares > 0 else 0

def calculate_unrealized_pl(avg_price: float, current_price: float, shares: int) -> Dict:
    """
    Calculate unrealized profit/loss.
    """
    market_value = current_price * shares
    cost_basis = avg_price * shares
    unrealized_pl = market_value - cost_basis
    unrealized_pl_percent = (unrealized_pl / cost_basis * 100) if cost_basis > 0 else 0
    
    return {
        'unrealized_pl': unrealized_pl,
        'unrealized_pl_percent': unrealized_pl_percent,
        'market_value': market_value,
        'cost_basis': cost_basis
    }

def calculate_realized_pl(buy_transactions: List[Dict], sell_transaction: Dict, method: str = 'FIFO') -> float:
    """
    Calculate realized profit/loss using FIFO method.
    """
    if method != 'FIFO':
        raise ValueError("Only FIFO method is currently supported")
    
    sell_shares = sell_transaction['lots'] * 100
    sell_value = (sell_transaction['price_per_share'] * sell_shares) - sell_transaction['fee']
    
    # FIFO: Match sell with oldest buys
    remaining_shares = sell_shares
    buy_cost = 0
    
    for buy in sorted(buy_transactions, key=lambda x: x['date']):
        if remaining_shares <= 0:
            break
        
        buy_shares = buy['lots'] * 100
        shares_to_match = min(remaining_shares, buy_shares)
        
        # Calculate proportional cost including fees
        shares_ratio = shares_to_match / buy_shares
        cost = (buy['price_per_share'] * shares_to_match) + (buy['fee'] * shares_ratio)
        buy_cost += cost
        
        remaining_shares -= shares_to_match
    
    realized_pl = sell_value - buy_cost
    return realized_pl

def calculate_drawdown(portfolio_values: List[float]) -> Dict:
    """
    Calculate maximum drawdown from peak.
    Formula: (Peak - Current) / Peak * 100%
    """
    if not portfolio_values:
        return {'drawdown': 0, 'peak': 0, 'current': 0}
    
    peak = max(portfolio_values)
    current = portfolio_values[-1]
    drawdown = ((peak - current) / peak * 100) if peak > 0 else 0
    
    return {
        'drawdown': drawdown,
        'peak': peak,
        'current': current
    }

def calculate_dividend_total(dividend_per_share: float, shares_on_record_date: int) -> float:
    """
    Calculate total dividend payment.
    """
    return dividend_per_share * shares_on_record_date

# Unit Tests
def test_avg_price():
    transactions = [
        {'lots': 1, 'price_per_share': 10000, 'fee': 25000},
        {'lots': 2, 'price_per_share': 9500, 'fee': 30000}
    ]
    avg = calculate_avg_price(transactions)
    expected = (10000*100 + 25000 + 9500*200 + 30000) / 300
    assert abs(avg - expected) < 0.01, f"Expected {expected}, got {avg}"

def test_unrealized_pl():
    result = calculate_unrealized_pl(10000, 10500, 300)
    assert result['unrealized_pl'] == 150000
    assert abs(result['unrealized_pl_percent'] - 5.0) < 0.01

def test_drawdown():
    values = [1000000, 1200000, 1100000, 1300000, 1150000]
    result = calculate_drawdown(values)
    expected_drawdown = ((1300000 - 1150000) / 1300000) * 100
    assert abs(result['drawdown'] - expected_drawdown) < 0.01

if __name__ == "__main__":
    test_avg_price()
    test_unrealized_pl()
    test_drawdown()
    print("✅ All calculation tests passed!")
\`\`\`

---

### 10. ML Service (app/services/ml_service.py)

\`\`\`python
import torch
from transformers import AutoTokenizer, AutoModel
from typing import List, Dict
import joblib
import numpy as np

class ExpenseCategorizerService:
    def __init__(self, model_path: str):
        self.model = self.load_model(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained('indobenchmark/indobert-base-p1')
        self.categories = ['Makan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya']
    
    def load_model(self, path: str):
        # Load trained model
        model = torch.load(path, map_location='cpu')
        model.eval()
        return model
    
    def predict(self, merchant: str, amount: float = None) -> List[Dict]:
        # Tokenize input
        inputs = self.tokenizer(
            merchant,
            return_tensors='pt',
            padding=True,
            truncation=True,
            max_length=128
        )
        
        # Inference
        with torch.no_grad():
            logits = self.model(inputs['input_ids'], inputs['attention_mask'])
            probs = torch.softmax(logits, dim=1)[0]
        
        # Get top 3 predictions
        top_probs, top_indices = torch.topk(probs, k=3)
        
        predictions = [
            {
                'category': self.categories[idx],
                'confidence': float(prob)
            }
            for prob, idx in zip(top_probs, top_indices)
        ]
        
        return predictions

class AnomalyDetectorService:
    def __init__(self, model_path: str):
        self.model = self.load_model(model_path)
        self.threshold = 0.95  # Reconstruction error threshold
    
    def load_model(self, path: str):
        model = torch.load(path, map_location='cpu')
        model.eval()
        return model
    
    def detect_anomalies(self, expenses: List[Dict], window_days: int = 30) -> List[Dict]:
        anomalies = []
        
        # Calculate statistics for each category
        category_stats = self._calculate_category_stats(expenses, window_days)
        
        for expense in expenses:
            # Check if amount is anomalous
            is_anomaly, score, reason = self._check_anomaly(expense, category_stats)
            
            if is_anomaly:
                anomalies.append({
                    'expense': expense,
                    'anomaly_score': score,
                    'reason': reason
                })
        
        return anomalies
    
    def _calculate_category_stats(self, expenses: List[Dict], window_days: int) -> Dict:
        stats = {}
        for expense in expenses:
            category = expense['category']
            if category not in stats:
                stats[category] = {'amounts': []}
            stats[category]['amounts'].append(expense['amount'])
        
        # Calculate mean and std for each category
        for category in stats:
            amounts = stats[category]['amounts']
            stats[category]['mean'] = np.mean(amounts)
            stats[category]['std'] = np.std(amounts)
            stats[category]['max'] = np.max(amounts)
        
        return stats
    
    def _check_anomaly(self, expense: Dict, category_stats: Dict) -> tuple:
        category = expense['category']
        amount = expense['amount']
        
        if category not in category_stats:
            return False, 0, ""
        
        mean = category_stats[category]['mean']
        std = category_stats[category]['std']
        
        # Z-score based detection
        if std > 0:
            z_score = abs((amount - mean) / std)
            if z_score > 3:  # 3 standard deviations
                multiplier = amount / mean if mean > 0 else 0
                reason = f"Amount is {multiplier:.1f}x higher than your 30-day average for {category}"
                return True, z_score, reason
        
        return False, 0, ""

# Initialize services
categorizer_service = ExpenseCategorizerService("ml/saved_models/categorizer.pth")
anomaly_service = AnomalyDetectorService("ml/saved_models/anomaly.pth")
\`\`\`

---

### 11. Local Finance Mentor

The active implementation summarizes authenticated user data locally without sending it to an external service.

---


### 12. Requirements.txt

\`\`\`txt
# FastAPI
fastapi==0.100.0
uvicorn[standard]==0.23.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.19
alembic==1.11.1
psycopg2-binary==2.9.6
asyncpg==0.28.0

# Authentication
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.0.3
pydantic-settings==2.0.2
email-validator==2.0.0

# Rate Limiting
slowapi==0.1.9

# ML/DL
torch==2.0.1
transformers==4.30.2
scikit-learn==1.3.0
numpy==1.24.3
pandas==2.0.3


# Utils
python-dotenv==1.0.0
joblib==1.3.1

# Testing
pytest==7.4.0
pytest-asyncio==0.21.0
httpx==0.24.1

# Monitoring (optional)
prometheus-client==0.17.1
\`\`\`

---

### 13. Alembic Migration Example

\`\`\`bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Initial tables"

# Apply migration
alembic upgrade head
\`\`\`

**Migration File Example** (alembic/versions/001_initial.py):

\`\`\`python
"""Initial tables

Revision ID: 001
Revises: 
Create Date: 2026-01-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), default='user'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Create expenses table
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date, nullable=False),
        sa.Column('amount', sa.Float, nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('payment_method', sa.String(100), nullable=False),
        sa.Column('merchant', sa.String(255), nullable=False),
        sa.Column('notes', sa.Text),
        sa.Column('predicted_category', sa.String(100)),
        sa.Column('prediction_confidence', sa.Float),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # Add more tables...

def downgrade():
    op.drop_table('expenses')
    op.drop_table('users')
\`\`\`

---

This backend code provides a solid foundation for implementing the FinTrack Mentor API. Each module is structured to be maintainable, testable, and scalable.
