
  # FinTrack Mentor Web App

  This is a code bundle for FinTrack Mentor Web App. The original project is available at https://www.figma.com/design/WibtIqGFfxzQk5TQDjiQtp/FinTrack-Mentor-Web-App.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  

## Backend (FastAPI)

Backend berada di folder `backend/`.

### Run backend (SQLite dev)
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Backend default: `http://127.0.0.1:8000`

### Hubungkan Frontend -> Backend
Buat file `.env` di root frontend (sejajar `package.json`):
```env
VITE_API_URL=http://127.0.0.1:8000
```

### ML/DL Training
Lihat `backend/README.md`.
