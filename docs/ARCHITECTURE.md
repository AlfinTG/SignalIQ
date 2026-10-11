# Architecture — SignalIQ

## 1. Design principle

Use the smallest architecture that supports a working, honest demo and a simple one-service deployment.

## 2. Components

### Frontend
- React + Vite + TypeScript + Tailwind CSS + Recharts + Lucide.
- Browser `localStorage` for the current workspace (`signaliq.workspace.v1`).
- Typed client for `/api/*`.
- Pure TypeScript functions for filtering, metrics, grouping, priority, CSV, and reports.

### Backend
- FastAPI + Pydantic.
- Server-side Gemini (`google-genai`) for live analysis.
- Server-side Adaption Python SDK for Adaptive Data.
- No primary database. The browser is the source of truth for feedback.
- FastAPI serves the compiled frontend in production. Vite proxies `/api` in development.

## 3. Analysis flow

1. Browser loads sample data or persisted workspace.
2. User imports or adds comments.
3. Frontend submits a bounded batch to `POST /api/analyze`.
4. Backend redacts obvious emails/phones, then calls Gemini with structured JSON output.
5. Backend validates each item against Pydantic models.
6. If the key is missing or the provider fails, the API returns an explicit error; the frontend may run labelled demo/rules analysis.
7. Frontend merges results by ID and recalculates KPIs from records.

## 4. Adaption flow (official SDK)

Documented operations from https://docs.adaptionlabs.ai/adaptive-data-quickstart :

1. `client.datasets.upload_file(path)` for a local CSV.
2. Poll `client.datasets.get_status(dataset_id)` until `row_count` is present or `failed`.
3. `client.datasets.adapt(..., estimate=True)` with `column_mapping` `{prompt: instruction, completion: output, context: [input]}`.
4. Separate user action: `client.datasets.adapt(...)` without estimate.
5. Poll status (frontend polls `GET /api/adaption/jobs/{id}`).
6. `client.datasets.download(dataset_id, file_format="jsonl")` when status is `succeeded`.

Jobs live in an in-memory registry and are lost on process restart.

## 5. API

- `GET /api/health`
- `POST /api/analyze`
- `POST /api/adaption/estimate`
- `POST /api/adaption/run`
- `GET /api/adaption/jobs/{job_id}`
- `GET /api/adaption/jobs/{job_id}/download`

## 6. Environment

`GEMINI_API_KEY`, `GEMINI_MODEL`, `ADAPTION_API_KEY`, `APP_ENV`, `MAX_ANALYSIS_ROWS`, `PORT`.

## 7. Priority formula

Priority = 0.40 × Frequency + 0.30 × Negative Sentiment Rate + 0.20 × Trend + 0.10 × Severity, each on 0–100.

When trend cannot be calculated, remaining weights are redistributed proportionally and the UI discloses that trend is unavailable.

These weights are a documented design choice, not a validated industry standard.
