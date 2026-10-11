# SignalIQ

**Find the signal. Fix the problem.**  
Customer Intelligence Platform — an AI-assisted prototype for turning shopping-business feedback into evidence-backed priorities.

Core workflow: **Collect → Analyze → Discover → Prioritize → Act → Report**

This is a single-user hackathon prototype. Feedback and issue status live in this browser (`localStorage` key `signaliq.workspace.v1`) and are not synced across devices or users. Do not upload real personal data to a public demo.

## What it does

- Dashboard KPIs, charts, and issue lists derived from the current dataset and filters (never hardcoded).
- Feedback Explorer with sample data, manual entry, CSV import (column aliases + mapping), search, filters, and detail views.
- Live Gemini analysis on the backend, with a clearly labelled deterministic demo fallback when the key is missing or the provider fails.
- Priority scoring: `0.40×frequency + 0.30×negative rate + 0.20×trend + 0.10×severity` (weights are a design choice). Trend is omitted when dated history is thin.
- Saved issue tracking, CSV export, and a print-ready HTML insight report.
- Adaption Lab: official Adaptive Data flow (`upload_file` → `get_status` → `adapt(estimate=True)` → confirmed `adapt` → `download`), or an honest “not configured” state.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide
- Backend: FastAPI, Pydantic, Gemini (`google-genai`), Adaption Python SDK
- Tests: Vitest + React Testing Library, pytest

## Local setup

Requirements: Node.js 20+, Python 3.11+.

```powershell
cd C:\Users\Administrator\Desktop\projects\SignalIQ
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
npm --prefix frontend install
copy .env.example .env
```

Edit `.env` if you have keys. Never commit `.env`.

```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
ADAPTION_API_KEY=
APP_ENV=development
MAX_ANALYSIS_ROWS=80
PORT=8000
```

Run backend and frontend:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
npm --prefix frontend run dev
```

Open http://127.0.0.1:5173 — Vite proxies `/api` to the FastAPI process.

Without keys, load the sample dataset (already present on first visit) and use **Run labelled demo analysis**. Adaption Lab will show a setup state until `ADAPTION_API_KEY` is set.

## Tests and production build

```powershell
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
.\.venv\Scripts\python.exe -m pytest
```

## Production (one service)

1. `npm --prefix frontend run build` writes `frontend/dist`.
2. FastAPI serves that dist plus `/api/*`.
3. Set `PORT` as required by the host (Render, Railway, Fly, or similar).
4. Set `GEMINI_API_KEY` and `ADAPTION_API_KEY` as host secrets. Do not use `VITE_` prefixes for secrets.
5. `APP_ENV=production`

Start command:

```text
python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Health check: `GET /api/health` (reports whether keys are configured; never returns key material).

## Honest integration limits

- Live AI is Gemini only, server-side, batched, validated JSON. Failed calls do not invent classifications.
- Demo analysis is keyword rules and is labelled **Demo analysis**.
- Adaption output is optimized training data, not a replacement classifier inside SignalIQ.
- Adaption jobs are in-memory on the backend and disappear on process restart.

## CSV columns

Text: `text`, `feedback`, `comment`, `review`, `message`, `content`, `description`  
Date: `date`, `created_at`, `createdAt`, `timestamp`, `submitted_at`  
Source: `source`, `channel`, `platform`  
Rating: `rating`, `stars`, `score` (0–5)

Limits: ~1.5MB, 2,000 rows, 4,000 characters per comment.
