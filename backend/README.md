# FinTrack Mentor - Backend (FastAPI)

## Stack
- FastAPI + Uvicorn
- SQLAlchemy + Alembic
- PostgreSQL (recommended) / SQLite fallback for dev
- JWT Auth
- ML: TF-IDF + Logistic Regression
- DL: DistilBERT multilingual (HuggingFace, PyTorch)
- Anomaly Detection: z-score baseline + Autoencoder

## Quickstart (Dev - SQLite)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` (optional):
```env
DATABASE_URL=sqlite:///./dev.db
JWT_SECRET_KEY=change-me-in-prod
CORS_ORIGINS=http://localhost:5173
OPENAI_API_KEY=  # optional
OPENAI_MODEL=gpt-4o-mini
```

Run migrations:
```bash
alembic upgrade head
```

Run server:
```bash
uvicorn app.main:app --reload
```

Health check:
- `GET /health`
- `GET /api/auth/me` (requires Bearer token)

## PostgreSQL
Set:
```env
DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/fintrack
```
then:
```bash
alembic upgrade head
uvicorn app.main:app --reload
```

## ML/DL Training
Baseline (fast):
```bash
python ml/train_baseline.py
```

DL fine-tune (heavier, GPU recommended):
```bash
python ml/train_dl.py --epochs 2 --batch 8
```

Autoencoder:
```bash
python ml/anomaly_autoencoder.py --epochs 30
```

Artifacts saved to:
- `ml/artifacts/baseline.joblib` + `labels.joblib`
- `ml/artifacts/dl_model/`
- `ml/artifacts/autoencoder.pt` + `ae_meta.joblib`

## ML Endpoints
- `POST /api/ml/predict-category`
```json
{ "text": "kopi susu indomaret", "amount": 25000 }
```

- `POST /api/ml/feedback`
```json
{ "text": "kopi susu indomaret", "amount": 25000, "category": "Makan" }
```

- `GET /api/ml/anomalies` (requires auth)

## Chat Endpoint
- `POST /api/chat` (requires auth)
Uses tool-calling when `OPENAI_API_KEY` exists, otherwise fallback heuristic response.

