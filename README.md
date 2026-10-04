# Verify Hire

Verify the opportunity before you trust it. Enter a company and role (optionally a job link and the
recruitment message) and Verify Hire gathers independent web evidence, compares it with what you
submitted, and produces a structured verification report.

**Stack:** React + Vite (frontend) · FastAPI (backend) · SerpApi (search) · Groq (analysis)

## Run locally

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows   (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # macOS/Linux: cp .env.example .env  -> then add your keys
uvicorn main:app --reload      # http://127.0.0.1:8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```
The frontend calls `http://127.0.0.1:8000` by default. To change it, set `VITE_API_URL` in `frontend/.env.local`.

## Checks
```bash
cd backend  && pip install -r requirements-dev.txt && pytest -q     # 42 tests, SerpApi/Groq mocked
cd frontend && npm run lint && npm run build
```

## API
| Route | Purpose |
|---|---|
| `POST /analyze` | Main endpoint: `company`, `role`, optional `job_url`, `job_description` |
| `GET /analyze` | Same, via query string (kept for backwards compatibility) |
| `GET /investigate` | Raw evidence from the 4 parallel searches |
| `GET /search?q=` | Single SerpApi search |

`/analyze` returns the structured `report` (verdict, quick findings, match/mismatch, red flags, next steps,
limitations), the raw `evidence`, de-duplicated `sources`, and a plain-text `analysis` kept for older clients.
