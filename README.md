## Transfermation

Transfermation is a Next.js + FastAPI app for exploring football transfers. Search players and teams, then get an estimate of a player's impact at a destination club. The frontend queries a FastAPI backend backed by PostgreSQL and an XGBoost model.

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.9+

### Install
- Frontend:
```bash
npm install
```
- Backend:
```bash
pip install -r requirements.txt
```

### Run
- Frontend (Next.js):
```bash
npm run dev
```
- Backend (FastAPI/Uvicorn):
```bash
python -m uvicorn src.app.api.common.app:app --reload --host 0.0.0.0 --port 8000
```

Frontend will be at `http://localhost:3000`. Backend will be at `http://localhost:8000` (health check: `/health`).

### Project structure (high level)
```
src/
  app/
    api/
      common/app.py     # FastAPI app entrypoint
```

### Notes
- If imports fail when starting the backend, run with an explicit `PYTHONPATH`:
```bash
PYTHONPATH=$(pwd) python -m uvicorn src.app.api.common.app:app --reload --host 0.0.0.0 --port 8000
```
