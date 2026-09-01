# FinTrack Mentor

FinTrack Mentor is a full-stack personal wealth management application for tracking cash flow, managing investments, scanning receipts, and reviewing financial data from a single account-based dashboard.

**Live application:** [fintrack-mentor.vercel.app](https://fintrack-mentor.vercel.app)

## Highlights

- Secure registration and JWT-based authentication
- Protected application routes and user-isolated financial data
- Forgot-password and email-based password reset flow
- Income and expense tracking with search, filters, budgets, notes, and transaction history
- Receipt attachments and local Tesseract OCR for extracting merchant, date, total, payment method, category, tax, discounts, line items, and raw text
- Support for up to four receipt photos to improve recognition of folded or partially obscured receipts
- Stock buy/sell history with editable and removable transactions
- Dividend tracking and realized/unrealized profit and loss calculations
- Unified portfolio for stocks, ETFs, mutual funds, bonds, deposits, cash, crypto, gold, property, forex, and other investment instruments
- Manual IDR, USD, and EUR asset valuation with user-provided exchange rates
- Educational portfolio health score based on diversification, concentration, liquidity, and risk balance
- Account-aware Chat Mentor with per-user daily conversation history and automatic daily reset
- Responsive layouts for desktop, tablet, and mobile
- Light and dark themes

## Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide icons
- Sonner notifications

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL in production
- SQLite for local development
- JWT authentication
- Tesseract OCR integration
- Scikit-learn utilities for transaction categorization and anomaly analysis

### Deployment

- Frontend: Vercel
- Backend API: Vercel
- Production database: PostgreSQL

## Application Areas

### Dashboard

Provides a quick overview of income, expenses, total cash flow, portfolio value, unrealized profit or loss, budget usage, expense trends, and active holdings.

### Finance

Records both income and expenses. Transactions support categories, payment methods, merchants, notes, budgets, receipt images, history search, and filtering.

Receipt analysis runs through the FinTrack backend without sending images to an external generative AI service. Local OCR requires the `tesseract` executable to be available on the backend host.

### Portfolio

Combines stock holdings and other investment instruments into one portfolio. Stock transactions, dividends, current prices, cost basis, market value, currency conversion, realized P/L, and unrealized P/L remain distinct throughout the calculation flow.

The portfolio health score is an educational indicator only and is not financial advice.

### Chat Mentor

Produces account-aware financial summaries using the authenticated user's stored finance and portfolio data. Messages are stored per user for the current Jakarta calendar day and automatically cleared when a new day begins, keeping storage bounded while preserving the user's underlying financial context.

## Project Structure

```text
FinTrack-mentor/
├── backend/
│   ├── alembic/              # Database migrations
│   ├── api/                  # Vercel serverless entry point
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   ├── core/             # Configuration, database, and security
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Auth, email, OCR, ML, and portfolio services
│   ├── ml/                   # Training scripts and sample data
│   └── tests/                # Backend integration tests
├── frontend/
│   ├── src/
│   │   ├── components/       # Shared layout and UI components
│   │   ├── contexts/         # Authentication and account data state
│   │   ├── pages/            # Application pages
│   │   └── services/         # API client
│   └── vercel.json
└── README.md
```

## Local Development

### Prerequisites

- Python 3.11 or newer
- Node.js 20 or newer
- npm
- Tesseract OCR, if receipt scanning is required

On macOS, Tesseract can be installed with:

```bash
brew install tesseract
```

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify the backend at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health).

### 2. Frontend

In another terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment Variables

### Backend

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite or PostgreSQL SQLAlchemy connection URL |
| `DATABASE_SCHEMA` | Optional PostgreSQL schema name |
| `JWT_SECRET_KEY` | Secret used to sign authentication tokens |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `FRONTEND_URL` | Public frontend URL used in password-reset links |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Password-reset token lifetime |
| `SMTP_HOST`, `SMTP_PORT` | SMTP server configuration |
| `SMTP_USERNAME`, `SMTP_PASSWORD` | SMTP credentials |
| `SMTP_FROM_EMAIL` | Sender address for reset emails |
| `SMTP_USE_TLS` | Enables SMTP TLS |
| `PASSWORD_RESET_DEV_MODE` | Returns a reset link directly during local development only |
| `AUTO_CREATE_SCHEMA` | Optionally creates registered tables during application startup |

Use a long random value for `JWT_SECRET_KEY`. Never enable `PASSWORD_RESET_DEV_MODE` on a public deployment and never commit real credentials.

### Frontend

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Backend base URL, for example `http://127.0.0.1:8000` |

## Database and Data Isolation

Run migrations whenever the database schema changes:

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

Expenses, budgets, stock transactions, dividends, investment assets, receipt access, and daily chat messages are associated with the authenticated user. API queries enforce ownership so one user cannot retrieve another user's records.

## Verification

Backend integration tests:

```bash
cd backend
source .venv/bin/activate
python -m unittest discover -s tests -v
```

Frontend checks:

```bash
cd frontend
npm run typecheck
npm run build
```

## Important Notes

- Foreign-currency conversion uses the exchange rate entered by the user; no automatic market-rate service is currently used.
- Stock and other asset prices are updated manually.
- Receipt files stored on a local filesystem are suitable for local or persistent-server deployments. Serverless filesystems may be ephemeral, so production receipt storage should use persistent object storage when long-term retention is required.
- Financial and portfolio health information is educational and does not replace professional financial advice.

## License

No open-source license has been added yet. All rights are reserved by the repository owner unless a license is provided later.
