# Architecture — InsightFlow

## 1. Design principle

Use the smallest architecture that supports a working, honest demo and a simple one-service deployment. Avoid distributed infrastructure.

## 2. Components

### Frontend

- React + Vite + TypeScript.
- Tailwind CSS for styling and a small component set owned by the project.
- Recharts (or one equivalent chart library) for visualizations.
- Browser `localStorage` for current dataset and issue tracking.
- A typed API client for `/api/*` calls.
- Pure TypeScript functions for filtering, aggregate metrics, issue grouping, priority math, and report shaping where possible; test these independently.

### Backend

- FastAPI + Pydantic request/response validation.
- Server-side Gemini client for live analysis.
- Server-side Adaption SDK client for Adaptive Data operations.
- No primary database for the prototype. The browser is the source of truth for the single user's feedback collection. The backend processes submitted data and returns results.
- Serve the compiled frontend build from FastAPI in production. In development, Vite proxies `/api` to FastAPI.

## 3. Logical data flow

### Feedback analysis

1. Browser loads sample data or data persisted in localStorage.
2. User imports/adds comments.
3. Frontend validates and normalizes comments, then submits a bounded batch to `POST /api/analyze`.
4. Backend checks request limits and redacts obvious emails/phone numbers before a provider call.
5. With configured Gemini key, backend requests structured sentiment/category/issue/severity/reason output using the current supported SDK.
6. Backend validates the response against Pydantic models and returns results aligned to stable feedback IDs. Provider error/missing key produces a safe error response; the frontend may explicitly choose its deterministic demo fallback and label it accordingly.
7. Frontend merges results by ID and recalculates KPIs, trends, issue groups, score components, and recommendations from current data.

### Adaption dataset flow

1. Frontend constructs downloadable task examples from available feedback and labels.
2. User previews/downloads the prepared CSV/JSONL.
3. With `ADAPTION_API_KEY`, backend uploads a supported local file using the official `adaption` SDK.
4. Backend waits/polls for ingestion status and validates the row count/error.
5. Backend requests an estimate using the actual source-column mapping and displays the returned estimate.
6. Only after the user chooses a separate “Run adaptation” action does the backend submit a real run.
7. Frontend polls a job-status endpoint; output download is enabled only after a verified completed/available state.
8. Every error, missing credential, timeout, and unknown status is displayed honestly. Never use fake job IDs or simulated success.

Because Adaption runs can take time, design its backend work as a bounded background job with a job ID/status route or another robust asynchronous approach. For a single process, an in-memory job registry may be accepted for this prototype, but document that jobs are lost on process restart. Do not claim production-grade job persistence.

## 4. API shape

Use a consistent `/api` prefix. Suggested routes:

- `GET /api/health`
  - Returns service status, whether AI/Adaption credentials are configured, app environment, and version if available.
  - Never returns keys or key fragments.
- `POST /api/analyze`
  - Input: bounded list of feedback IDs and text/optional metadata.
  - Output: validated per-ID classifications and provider/mode metadata.
- `POST /api/adaption/estimate`
  - Input: task dataset/examples and requested output mapping if needed.
  - Output: dataset/job identity needed for later stages, actual estimate, and status.
- `POST /api/adaption/run`
  - Input: previously estimated dataset/job plus explicit confirmation flag.
  - Output: actual run/job identifier and submitted state.
- `GET /api/adaption/jobs/{job_id}`
  - Output: genuine status, progress if available, error state, and download readiness.
- `GET /api/adaption/jobs/{job_id}/download`
  - Returns processed data only when the SDK/provider reports output is available.

Cursor may alter endpoint names to match the SDK, but must preserve validation, server-only secrets, estimate-before-run, explicit confirmation, and actual state reporting.

## 5. Environment variables

- `GEMINI_API_KEY` — optional live AI credential.
- `GEMINI_MODEL` — optional configurable model name; default must be checked against current official provider docs.
- `ADAPTION_API_KEY` — optional Adaption credential.
- `APP_ENV` — environment label.
- `MAX_ANALYSIS_ROWS` — safe request cap.

Set values at the backend runtime. `.env` is for local development only, must be gitignored, and must never be bundled into frontend assets.

## 6. Resilience and limits

- Limit request body and row count.
- Batch AI input rather than sending a huge CSV in one request.
- Use provider timeouts and actionable error states.
- Validate every AI response; do not render arbitrary model HTML.
- Never make chart aggregates from model-suggested totals; compute from records.
- Keep a sample-data path independent of external services.
- If a batch partially fails, preserve previous valid classifications and make the partial/failure status visible.

## 7. Deployment model

Build frontend assets, then run FastAPI on the host-provided port. In production FastAPI serves both `/api/*` and frontend assets/fallback routes for the single-page app. Development can use separate processes with a Vite proxy. Confirm filesystem paths are relative to the actual project structure, not the shell's assumed current directory.

## 8. Limitations

- Browser localStorage means feedback and issue states are local to one browser/device, not shared across business users.
- An in-memory Adaption job registry is lost on server restart.
- The prototype is not an enterprise analytics platform and has no authentication/authorization.
