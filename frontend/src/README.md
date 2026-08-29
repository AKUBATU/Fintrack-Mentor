# FinTrack Mentor - Comprehensive Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Installation & Setup](#installation--setup)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Deep Learning Models](#deep-learning-models)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Thesis Plan](#thesis-plan)

---

## Overview

**FinTrack Mentor** adalah aplikasi web full-stack untuk memantau arus kas dan berbagai instrumen investasi, serta menyediakan mentor keuangan lokal berbasis data akun. Aplikasi ini dirancang untuk membantu pengguna mencatat dan mengevaluasi kondisi keuangannya.

### Key Features
- ✅ Expense tracking dengan budget alerts & ML categorization
- ✅ Portfolio management (saham) dengan perhitungan P/L, avg price, drawdown, dividen
- ✅ Mentor keuangan lokal berbasis ringkasan data akun
- ✅ Deep Learning untuk expense categorization & anomaly detection
- ✅ JWT authentication dengan role-based access
- ✅ Audit logging untuk semua transaksi

---

## Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Charts**: Recharts
- **State Management**: Context API
- **Routing**: React Router v6

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL 15+
- **ORM**: SQLAlchemy 2.0
- **Migration**: Alembic
- **Authentication**: JWT (python-jose) + bcrypt
- **Validation**: Pydantic v2
- **Rate Limiting**: slowapi
- **CORS**: fastapi-cors-middleware

### Machine Learning
- **Framework**: PyTorch 2.0 + Transformers (Hugging Face)
- **Models**: 
  - IndoBERT/DistilBERT (expense categorization)
  - Autoencoder (anomaly detection)
- **Baseline**: Scikit-learn (TF-IDF + Logistic Regression)
- **Evaluation**: accuracy, macro F1, confusion matrix

### Analisis Lokal
- **Mentor keuangan**: ringkasan deterministik dari data akun tanpa layanan eksternal

---

## Project Structure

\`\`\`
fintrack-mentor/
├── frontend/                    # React TypeScript Frontend
│   ├── src/
│   │   ├── App.tsx             # Main app component
│   │   ├── contexts/           # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── DataContext.tsx
│   │   ├── pages/              # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Expenses.tsx
│   │   │   ├── Portfolio.tsx
│   │   │   ├── ChatMentor.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/         # Reusable components
│   │   │   └── Layout.tsx
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI app entry
│   │   ├── config.py           # Configuration
│   │   ├── database.py         # Database connection
│   │   ├── dependencies.py     # Auth dependencies
│   │   │
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── expense.py
│   │   │   ├── portfolio.py
│   │   │   ├── daily_report.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── expense.py
│   │   │   ├── portfolio.py
│   │   │   └── chat.py
│   │   │
│   │   ├── routers/            # API routers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py         # Authentication
│   │   │   ├── expenses.py     # Expense CRUD
│   │   │   ├── portfolio.py    # Portfolio CRUD
│   │   │   ├── daily_reports.py
│   │   │   ├── ml.py           # ML endpoints
│   │   │   └── chat.py         # Local finance mentor endpoint
│   │   │
│   │   ├── services/           # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── portfolio_service.py  # P/L calculations
│   │   │   ├── ml_service.py
│   │   │   └── chat_service.py
│   │   │
│   │   └── utils/              # Utility functions
│   │       ├── __init__.py
│   │       ├── security.py     # JWT, hashing
│   │       ├── calculations.py # Financial calculations
│   │       └── validators.py
│   │
│   ├── ml/                      # Machine Learning modules
│   │   ├── __init__.py
│   │   ├── models/
│   │   │   ├── categorizer.py  # Expense categorization
│   │   │   └── anomaly.py      # Anomaly detection
│   │   ├── training/
│   │   │   ├── train_categorizer.py
│   │   │   ├── train_anomaly.py
│   │   │   └── evaluate.py
│   │   ├── inference/
│   │   │   ├── predict.py
│   │   │   └── detect_anomalies.py
│   │   ├── datasets/
│   │   │   ├── seed_expenses.csv  # Dummy dataset
│   │   │   └── prepare_data.py
│   │   └── saved_models/        # Trained models
│   │
│   ├── tests/                   # Unit tests
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_calculations.py
│   │   ├── test_portfolio.py
│   │   └── test_ml.py
│   │
│   ├── alembic/                 # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── alembic.ini
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── docs/                        # Documentation
│   ├── API.md                   # API documentation
│   ├── DATABASE.md              # Database schema
│   ├── ML_MODELS.md             # ML documentation
│   └── THESIS_PLAN.md           # Thesis outline
│
└── docker-compose.yml           # Docker setup
\`\`\`

---

## Installation & Setup

### Prerequisites
- **Node.js** 18+ & npm/yarn
- **Python** 3.10+
- **PostgreSQL** 15+
- **Git**

### Frontend Setup

\`\`\`bash
cd frontend
npm install
npm run dev
\`\`\`

Frontend akan berjalan di: http://localhost:5173

### Backend Setup

\`\`\`bash
# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
alembic upgrade head

# Seed dummy data
python scripts/seed_data.py

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
\`\`\`

Backend API akan berjalan di: http://localhost:8000
API Docs (Swagger): http://localhost:8000/docs

### Database Setup

\`\`\`bash
# Create PostgreSQL database
psql -U postgres
CREATE DATABASE fintrack_db;
CREATE USER fintrack_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fintrack_db TO fintrack_user;
\\q

# Run migrations
cd backend
alembic upgrade head
\`\`\`

---

## Database Schema

### Users Table
\`\`\`sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### Expenses Table
\`\`\`sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    merchant VARCHAR(255) NOT NULL,
    notes TEXT,
    predicted_category VARCHAR(100),
    prediction_confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category);
\`\`\`

### Stock Transactions Table
\`\`\`sql
CREATE TABLE stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    date DATE NOT NULL,
    lots INTEGER NOT NULL,
    price_per_share DECIMAL(15, 2) NOT NULL,
    fee DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_tx_user_ticker ON stock_transactions(user_id, ticker, date);
\`\`\`

### Dividends Table
\`\`\`sql
CREATE TABLE dividends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(10) NOT NULL,
    dividend_per_share DECIMAL(10, 2) NOT NULL,
    shares INTEGER NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    record_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### Daily Reports Table
\`\`\`sql
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    portfolio_value DECIMAL(15, 2) NOT NULL,
    notes TEXT,
    screenshot_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_reports_user_date ON daily_reports(user_id, date DESC);
\`\`\`

### Budgets Table
\`\`\`sql
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) DEFAULT 'monthly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### User Profiles Table
\`\`\`sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    dca_strategy TEXT,
    dca_amount DECIMAL(15, 2),
    dca_frequency VARCHAR(20),
    focus_stocks TEXT[],  -- Array of tickers
    compounding_dividends BOOLEAN DEFAULT true,
    bonus_week_rule TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### Audit Logs Table
\`\`\`sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
\`\`\`

### ML Feedback Table
\`\`\`sql
CREATE TABLE ml_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
    predicted_category VARCHAR(100),
    actual_category VARCHAR(100),
    confidence FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

---

## API Endpoints

### Authentication

**POST /api/auth/register**
\`\`\`json
Request:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
\`\`\`

**POST /api/auth/login**
\`\`\`json
Request:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response: Same as register
\`\`\`

**POST /api/auth/refresh**
\`\`\`json
Request:
{
  "refresh_token": "eyJ..."
}

Response:
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
\`\`\`

### Expenses

**GET /api/expenses**
Query params: ?start_date=2026-01-01&end_date=2026-01-31&category=Makan

**POST /api/expenses**
\`\`\`json
{
  "date": "2026-01-20",
  "amount": 50000,
  "category": "Makan",
  "payment_method": "Cash",
  "merchant": "Warteg Barokah",
  "notes": "Makan siang"
}
\`\`\`

**PUT /api/expenses/{id}**
**DELETE /api/expenses/{id}**

### Portfolio

**GET /api/portfolio/transactions**
**POST /api/portfolio/transactions**
\`\`\`json
{
  "ticker": "BBCA",
  "type": "buy",
  "date": "2026-01-20",
  "lots": 1,
  "price_per_share": 10000,
  "fee": 25000
}
\`\`\`

**GET /api/portfolio/holdings**
Returns calculated holdings with P/L

**POST /api/portfolio/dividends**
\`\`\`json
{
  "ticker": "BBCA",
  "dividend_per_share": 250,
  "shares": 100,
  "record_date": "2025-12-15",
  "payment_date": "2026-01-05"
}
\`\`\`

**GET /api/portfolio/summary**
Returns portfolio metrics: total value, P/L, drawdown, etc.

### Daily Reports

**GET /api/daily-reports**
**POST /api/daily-reports**
\`\`\`json
{
  "date": "2026-01-20",
  "portfolio_value": 1500000,
  "notes": "Market bullish today"
}
\`\`\`

### Machine Learning

**POST /api/ml/predict-category**
\`\`\`json
Request:
{
  "merchant": "Warteg Barokah",
  "amount": 50000
}

Response:
{
  "predictions": [
    {"category": "Makan", "confidence": 0.85},
    {"category": "Belanja", "confidence": 0.10},
    {"category": "Lainnya", "confidence": 0.05}
  ]
}
\`\`\`

**POST /api/ml/feedback**
\`\`\`json
{
  "expense_id": "uuid",
  "predicted_category": "Makan",
  "actual_category": "Belanja"
}
\`\`\`

**GET /api/ml/anomalies**
Query: ?date_range=30

\`\`\`json
Response:
{
  "anomalies": [
    {
      "expense_id": "uuid",
      "date": "2026-01-15",
      "amount": 500000,
      "category": "Tagihan",
      "anomaly_score": 0.92,
      "reason": "Amount is 3.5x higher than your 30-day average for this category"
    }
  ]
}
\`\`\`

### Chat

**POST /api/chat/completions**
\`\`\`json
Request:
{
  "messages": [
    {"role": "user", "content": "Bagaimana portofolio saya?"}
  ]
}

Response:
{
  "message": {
    "role": "assistant",
    "content": "Berdasarkan data Anda...",
    "tool_calls": [
      {
        "name": "get_portfolio_summary",
        "result": {...}
      }
    ]
  }
}
\`\`\`

---

## Deep Learning Models

### 1. Expense Transaction Categorization

**Objective**: Predict expense category from merchant name and amount

**Model Architecture**:
- **Baseline**: TF-IDF + Logistic Regression
- **Deep Learning**: IndoBERT (fine-tuned) or BiLSTM + Word2Vec

**Implementation** (backend/ml/models/categorizer.py):
\`\`\`python
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel

class ExpenseCategorizer(nn.Module):
    def __init__(self, num_categories=8, model_name='indobenchmark/indobert-base-p1'):
        super().__init__()
        self.bert = AutoModel.from_pretrained(model_name)
        self.dropout = nn.Dropout(0.3)
        self.classifier = nn.Linear(768, num_categories)
        
    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.last_hidden_state[:, 0, :]  # [CLS] token
        dropped = self.dropout(pooled)
        logits = self.classifier(dropped)
        return logits
\`\`\`

**Training** (backend/ml/training/train_categorizer.py):
\`\`\`python
from torch.utils.data import DataLoader
from transformers import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

def train_categorizer(data_path, epochs=10, batch_size=32):
    # Load data
    df = pd.read_csv(data_path)
    X = df['merchant']
    y = df['category']
    
    # Split
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2)
    
    # Tokenize
    tokenizer = AutoTokenizer.from_pretrained('indobenchmark/indobert-base-p1')
    train_encodings = tokenizer(X_train.tolist(), truncation=True, padding=True)
    val_encodings = tokenizer(X_val.tolist(), truncation=True, padding=True)
    
    # Create datasets
    train_dataset = ExpenseDataset(train_encodings, y_train)
    val_dataset = ExpenseDataset(val_encodings, y_val)
    
    # Model
    model = ExpenseCategorizer(num_categories=len(df['category'].unique()))
    optimizer = AdamW(model.parameters(), lr=2e-5)
    criterion = nn.CrossEntropyLoss()
    
    # Training loop
    for epoch in range(epochs):
        model.train()
        for batch in train_loader:
            optimizer.zero_grad()
            logits = model(batch['input_ids'], batch['attention_mask'])
            loss = criterion(logits, batch['labels'])
            loss.backward()
            optimizer.step()
        
        # Validation
        model.eval()
        val_preds = []
        val_labels = []
        with torch.no_grad():
            for batch in val_loader:
                logits = model(batch['input_ids'], batch['attention_mask'])
                preds = torch.argmax(logits, dim=1)
                val_preds.extend(preds.cpu().numpy())
                val_labels.extend(batch['labels'].cpu().numpy())
        
        acc = accuracy_score(val_labels, val_preds)
        f1 = f1_score(val_labels, val_preds, average='macro')
        print(f"Epoch {epoch+1}: Acc={acc:.4f}, F1={f1:.4f}")
    
    # Save model
    torch.save(model.state_dict(), 'saved_models/categorizer.pth')
    return model
\`\`\`

**Evaluation Metrics**:
- Accuracy
- Macro F1 Score
- Confusion Matrix
- Per-class Precision & Recall

**Seed Dataset** (backend/ml/datasets/seed_expenses.csv):
Generate 500+ synthetic expense records with Indonesian merchant names:
\`\`\`csv
merchant,amount,category
Warteg Barokah,45000,Makan
Gojek,150000,Transport
PLN,500000,Tagihan
Indomaret,75000,Belanja
...
\`\`\`

### 2. Anomaly Detection

**Objective**: Detect unusual spending patterns

**Model Architecture**:
- **Baseline**: Z-score per category + Moving average
- **Deep Learning**: Autoencoder (reconstruction error)

**Implementation** (backend/ml/models/anomaly.py):
\`\`\`python
class AnomalyAutoencoder(nn.Module):
    def __init__(self, input_dim=3):  # amount, day_of_week, hour
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 4)
        )
        self.decoder = nn.Sequential(
            nn.Linear(4, 8),
            nn.ReLU(),
            nn.Linear(8, 16),
            nn.ReLU(),
            nn.Linear(16, input_dim)
        )
    
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded
\`\`\`

**Training**:
Train on normal spending patterns. High reconstruction error = anomaly.

**Detection**:
\`\`\`python
def detect_anomalies(expenses, threshold=0.95):
    model.eval()
    anomalies = []
    
    for expense in expenses:
        features = normalize([expense.amount, expense.day_of_week, expense.hour])
        with torch.no_grad():
            reconstructed = model(torch.tensor(features))
            error = nn.MSELoss()(reconstructed, torch.tensor(features))
            
        if error > threshold:
            anomalies.append({
                'expense': expense,
                'anomaly_score': error.item(),
                'reason': generate_reason(expense, error)
            })
    
    return anomalies
\`\`\`

---

## Testing

### Unit Tests (backend/tests/test_calculations.py)

\`\`\`python
import pytest
from app.utils.calculations import (
    calculate_avg_price,
    calculate_unrealized_pl,
    calculate_realized_pl,
    calculate_drawdown,
    calculate_dividend_total
)

def test_avg_price():
    transactions = [
        {'lots': 1, 'price_per_share': 10000, 'fee': 25000},
        {'lots': 2, 'price_per_share': 9500, 'fee': 30000}
    ]
    avg = calculate_avg_price(transactions)
    expected = (10000*100 + 25000 + 9500*200 + 30000) / 300
    assert abs(avg - expected) < 0.01

def test_unrealized_pl():
    avg_price = 10000
    current_price = 10500
    shares = 300
    pl = calculate_unrealized_pl(avg_price, current_price, shares)
    assert pl == (10500 - 10000) * 300

def test_realized_pl_fifo():
    buy_txs = [
        {'lots': 1, 'price': 10000, 'fee': 25000},
        {'lots': 1, 'price': 9500, 'fee': 25000}
    ]
    sell_tx = {'lots': 1, 'price': 11000, 'fee': 30000}
    pl = calculate_realized_pl(buy_txs, sell_tx, method='FIFO')
    # Sell 100 shares at 11000 - (buy 100 at 10000 + fee 25000)
    expected = (11000 * 100 - 30000) - (10000 * 100 + 25000)
    assert pl == expected

def test_drawdown():
    portfolio_values = [1000000, 1200000, 1100000, 1300000, 1150000]
    drawdown = calculate_drawdown(portfolio_values)
    peak = 1300000
    current = 1150000
    expected = ((peak - current) / peak) * 100
    assert abs(drawdown - expected) < 0.01

def test_dividend_calculation():
    div_per_share = 250
    shares_on_record = 100
    total = calculate_dividend_total(div_per_share, shares_on_record)
    assert total == 25000

# Run tests
# pytest tests/test_calculations.py -v
\`\`\`

### ML Model Tests

\`\`\`python
def test_categorizer_accuracy():
    model = load_model('saved_models/categorizer.pth')
    test_data = load_test_data()
    predictions = model.predict(test_data)
    accuracy = accuracy_score(test_data['labels'], predictions)
    assert accuracy > 0.80  # Minimum 80% accuracy

def test_anomaly_detection():
    model = load_anomaly_model()
    normal_expense = {'amount': 50000, 'category': 'Makan'}
    anomaly_expense = {'amount': 5000000, 'category': 'Makan'}
    
    score_normal = model.detect(normal_expense)
    score_anomaly = model.detect(anomaly_expense)
    
    assert score_anomaly > score_normal
\`\`\`

---

## Deployment

### Development

\`\`\`bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && uvicorn app.main:app --reload
\`\`\`

### Production

**Docker Compose** (docker-compose.yml):
\`\`\`yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: fintrack_db
      POSTGRES_USER: fintrack_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://fintrack_user:${DB_PASSWORD}@postgres:5432/fintrack_db
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:8000
    volumes:
      - ./frontend:/app
    command: npm run build && npm run preview

volumes:
  postgres_data:
\`\`\`

**Deployment Commands**:
\`\`\`bash
# Build and run
docker-compose up --build -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
\`\`\`

**Environment Variables** (.env.example):
\`\`\`env
# Database
DATABASE_URL=postgresql://fintrack_user:password@localhost:5432/fintrack_db

# JWT
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Rate Limiting
RATE_LIMIT_CHAT=10/minute
RATE_LIMIT_ML=20/minute

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ML Models
MODEL_PATH=./ml/saved_models
\`\`\`

---

## Thesis Plan

See separate file: **THESIS_PLAN.md** for complete thesis outline including:
- Rumusan Masalah
- Tujuan Penelitian
- Metode Penelitian
- Metrik Evaluasi
- Skenario Pengujian
- Batasan Penelitian
- Kontribusi
- Timeline

---

## Next Steps

### Phase 1: MVP (Week 1-2)
✅ Frontend React with mock data (DONE)
🔨 Backend FastAPI + PostgreSQL setup
🔨 Authentication & basic CRUD
🔨 Portfolio calculations implementation

### Phase 2: ML Integration (Week 3-4)
🔨 Prepare seed dataset (500+ samples)
🔨 Train expense categorization model
🔨 Train anomaly detection model
🔨 ML inference API endpoints

### Phase 3: Mentor Keuangan (Week 5)
🔨 Ringkasan lokal untuk data portofolio dan arus kas
🔨 Rekomendasi deterministik tanpa layanan eksternal

### Phase 4: Testing & Documentation (Week 6)
🔨 Unit tests for all calculations
🔨 Integration tests
🔨 API documentation (Swagger)
🔨 User manual

### Phase 5: Deployment & Thesis (Week 7-8)
🔨 Docker deployment
🔨 Performance testing
🔨 Write thesis report
🔨 Prepare presentation

---

## Contact & Support

- **Developer**: [Your Name]
- **Email**: [your.email@example.com]
- **GitHub**: [github.com/yourusername/fintrack-mentor]

---

**Last Updated**: January 20, 2026
