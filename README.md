# FinTrack Mentor

FinTrack Mentor is an **AI-powered personal finance management web application** designed to help users manage expenses, budgets, investment portfolios, and daily financial activity while providing intelligent financial insights through Machine Learning and AI.

The project combines a modern **React-based frontend**, a **FastAPI REST API backend**, financial data management, Machine Learning models, Deep Learning, anomaly detection, and an AI-powered finance mentor.

---

## Features

* User registration and authentication
* Expense management
* Budget tracking
* Investment portfolio tracking
* Daily financial reports
* Interactive financial dashboard
* Financial charts and summaries
* AI Finance Mentor
* Machine Learning expense categorization
* Deep Learning text classification
* Financial transaction anomaly detection
* REST API integration

---

## Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Recharts
* Radix UI
* Lucide React

### Backend

* Python
* FastAPI
* Uvicorn
* SQLAlchemy
* Alembic
* Pydantic
* JWT Authentication
* bcrypt

### Database

* PostgreSQL
* SQLite fallback for development

### AI & Machine Learning

* PyTorch
* HuggingFace Transformers
* Scikit-learn
* NumPy
* Pandas
* TF-IDF
* Logistic Regression
* Multilingual DistilBERT
* Autoencoder
* Z-score anomaly detection
* OpenAI API

---

## Project Structure

```text
FinTrack-Mentor/
├── backend/
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── ml/
│   │   ├── data/
│   │   ├── anomaly_autoencoder.py
│   │   ├── train_baseline.py
│   │   └── train_dl.py
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

# Getting Started

## Prerequisites

Make sure the following tools are installed:

* Python 3.12
* Node.js
* npm
* Git

PostgreSQL is optional during development because the backend can use SQLite as a fallback.

---

# Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv .venv
```

Activate the virtual environment.

### macOS / Linux

```bash
source .venv/bin/activate
```

### Windows

```bash
.venv\Scripts\activate
```

Upgrade pip:

```bash
python -m pip install --upgrade pip setuptools wheel
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

---

## Environment Configuration

Create a `.env` file inside the `backend` directory.

Example configuration:

```env
DATABASE_URL=sqlite:///./dev.db

JWT_SECRET_KEY=change-me-in-prod

CORS_ORIGINS=http://localhost:5173,http://localhost:5175

OPENAI_API_KEY=

OPENAI_MODEL=gpt-4o-mini
```

> Do not commit your actual `.env` file or secret keys to GitHub.

---

## Database Migration

Run Alembic migrations:

```bash
alembic upgrade head
```

---

## Run Backend Server

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

The backend will normally run at:

```text
http://127.0.0.1:8000
```

---

## API Documentation

FastAPI automatically provides interactive API documentation.

### Swagger UI

```text
http://127.0.0.1:8000/docs
```

### ReDoc

```text
http://127.0.0.1:8000/redoc
```

---

## Health Check

```http
GET /health
```

Example response:

```json
{
  "ok": true,
  "name": "FinTrack Mentor"
}
```

Authenticated user endpoint:

```http
GET /api/auth/me
```

Requires a Bearer token.

---

# PostgreSQL Setup

For PostgreSQL, change the database configuration in `.env`:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/fintrack
```

Then run:

```bash
alembic upgrade head
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

---

# Frontend Setup

Open another terminal and navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will display the frontend URL in the terminal, for example:

```text
http://localhost:5173
```

If the default port is already in use, Vite may automatically use another port such as:

```text
http://localhost:5175
```

Make sure the active frontend origin is included in the backend `CORS_ORIGINS`.

---

# Machine Learning & Deep Learning

FinTrack Mentor contains multiple AI and Machine Learning components.

## Expense Classification

The baseline expense classification model uses:

* TF-IDF text representation
* Logistic Regression
* Scikit-learn

Train the baseline model:

```bash
cd backend
python ml/train_baseline.py
```

Generated artifacts:

```text
ml/artifacts/baseline.joblib
ml/artifacts/labels.joblib
```

---

## Deep Learning Classification

The Deep Learning model uses:

* Multilingual DistilBERT
* HuggingFace Transformers
* PyTorch

Fine-tune the model:

```bash
python ml/train_dl.py --epochs 2 --batch 8
```

Training is computationally heavier, so a GPU is recommended for faster training.

Generated model:

```text
ml/artifacts/dl_model/
```

---

## Anomaly Detection

FinTrack Mentor also provides anomaly detection for financial activity.

Methods:

* Z-score baseline
* Autoencoder

Train the Autoencoder:

```bash
python ml/anomaly_autoencoder.py --epochs 30
```

Generated artifacts:

```text
ml/artifacts/autoencoder.pt
ml/artifacts/ae_meta.joblib
```

---

# ML API Endpoints

## Predict Expense Category

```http
POST /api/ml/predict-category
```

Example request:

```json
{
  "text": "kopi susu indomaret",
  "amount": 25000
}
```

---

## ML Feedback

```http
POST /api/ml/feedback
```

Example:

```json
{
  "text": "kopi susu indomaret",
  "amount": 25000,
  "category": "Makan"
}
```

This endpoint can be used to provide category feedback for financial transaction classification.

---

## Transaction Anomalies

```http
GET /api/ml/anomalies
```

Authentication is required.

---

# AI Finance Mentor

FinTrack Mentor provides an AI-powered chat feature designed to assist users in understanding their financial information.

Endpoint:

```http
POST /api/chat
```

Authentication is required.

When `OPENAI_API_KEY` is configured, the backend can use the OpenAI API and tool-calling capabilities.

If an OpenAI API key is not available, the system can fall back to heuristic responses.

---

# Main API Routes

```text
/api/auth
/api/expenses
/api/budgets
/api/portfolio
/api/daily-reports
/api/ml
/api/chat
```

---

# Main Application Modules

## Authentication

Handles:

* User registration
* Login
* JWT authentication
* Authenticated user sessions

---

## Dashboard

Provides financial summaries and visualization of user financial activity.

---

## Expenses

Allows users to:

* Add expenses
* Manage expenses
* Monitor spending activity
* Categorize transactions

---

## Budgets

Allows users to create and monitor personal spending budgets.

---

## Portfolio

Provides functionality for tracking investment portfolio activity.

---

## Daily Report

Provides daily financial summaries and financial activity reports.

---

## Chat Mentor

Provides AI-assisted personal finance interaction and financial insights.

---

## Machine Learning

Provides automated expense categorization and financial anomaly detection.

---

# Development Commands

## Backend

Activate environment:

```bash
cd backend
source .venv/bin/activate
```

Run backend:

```bash
uvicorn app.main:app --reload
```

Run migration:

```bash
alembic upgrade head
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Build frontend for production:

```bash
npm run build
```

---

# Security Notes

Do not commit sensitive files or credentials such as:

```text
.env
.venv/
node_modules/
dev.db
API keys
JWT secret keys
database passwords
```

Use environment variables for private configuration.

---

# Development Stack Summary

```text
Frontend
React + TypeScript + Vite + Tailwind CSS

Backend
Python + FastAPI + SQLAlchemy + Alembic

Database
PostgreSQL / SQLite

Machine Learning
Scikit-learn + NumPy + Pandas

Deep Learning
PyTorch + HuggingFace Transformers + DistilBERT

AI Integration
OpenAI API
```

---

# Author

**Hafizhan Noor Amril**

GitHub: **AKUBATU**

---

## Repository

**FinTrack Mentor**

A full-stack AI-powered personal finance mentor combining modern web development, financial management, Machine Learning, Deep Learning, and intelligent financial assistance.
