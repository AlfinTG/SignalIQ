# Setup and Creation Guide

This guide describes the intended setup. Cursor should adjust it to the actual files it creates and keep commands accurate.

## 1. Prerequisites

- Cursor with the project folder opened as the workspace.
- A currently supported Python version for FastAPI and the selected AI SDK (prefer a stable version supported by all dependencies; do not assume a prerelease Python).
- A current Node.js LTS release and npm.
- Git.
- Optional: a Gemini API key for live AI analysis and an Adaption API key for Adaptive Data processing. The app must still open with neither key by using the explicitly labelled demo analysis fallback and Adaption's not-configured state.

## 2. Project creation

1. Extract/copy the full documentation bundle into the root of the project folder.
2. Open the **folder**, not only an individual file, in Cursor.
3. Open `CREATE_PROMPT.md`, copy its full contents, and send it to Cursor Agent.
4. Let Cursor inspect the repository, create the app, install dependencies, run tests/builds, fix implementation-caused issues, and summarize what is still unverified.
5. Inspect the final diff before accepting it. Never paste API keys into prompts, code files, or chat history when a local environment variable will work.

## 3. Expected local environment

The intended architecture uses a React/Vite frontend and FastAPI backend in the same repository. The exact folders/commands may be updated by Cursor; use the commands in the generated README as the source of truth.

Typical Windows PowerShell setup (run from the repository root):

```powershell
# Create a virtual environment if it does not already exist
py -m venv .venv

# Activate it in PowerShell
.\.venv\Scripts\Activate.ps1

# If execution policy prevents activation, run the interpreter directly instead:
# .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# Install frontend dependencies (adjust if package.json is at the root)
 npm --prefix frontend install

# Install backend dependencies (adjust path to match actual generated structure)
python -m pip install -r backend\requirements.txt
```

If activation is blocked, do not weaken the machine-wide execution policy just for this project. Use the virtual-environment Python executable directly or follow Microsoft's policy guidance.

## 4. Environment variables

Cursor should create `.env.example`. Copy it to `.env` at the path expected by the backend (normally repository root or backend root), then add keys locally if available.

```text
GEMINI_API_KEY=
GEMINI_MODEL=
ADAPTION_API_KEY=
APP_ENV=development
MAX_ANALYSIS_ROWS=
```

- `GEMINI_API_KEY`: optional; enables live model-backed analysis. If absent, use clearly labelled rules-based demo analysis.
- `GEMINI_MODEL`: optional override for a currently supported model. The backend should document its default and keep it configurable.
- `ADAPTION_API_KEY`: optional; enables the Adaption Adaptive Data workflow. Keep this secret on the backend only.
- `APP_ENV`: environment indicator.
- `MAX_ANALYSIS_ROWS`: configured safe analysis limit.

Do not commit `.env`. Check `.gitignore` before adding datasets or screenshots.

## 5. Run locally

The generated README should contain exact commands. In a common two-terminal development setup:

**Terminal A — backend** (from repository root; adjust module path if generated differently):

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal B — frontend:**

```powershell
npm --prefix frontend run dev
```

Open the Vite URL printed in Terminal B. Confirm the app loads, sample records are visible, `/api/health` responds, and the frontend can reach the backend through its `/api` development proxy.

If the actual generated module path differs, use the exact commands from the generated `README.md`; do not blindly use the example path above.

## 6. Minimum manual verification

- Load sample data and confirm sample-data label is visible.
- Add one customer comment and confirm it appears in Feedback Explorer.
- Import a CSV with a text column, plus a CSV with ambiguous headers to verify the error/column-selection flow.
- Run analysis with no API key and confirm the UI labels it as demo/rules-based analysis.
- If a Gemini key is available, run live analysis and verify invalid provider output/errors are handled.
- Change sentiment/category filters and confirm all affected metrics/charts update.
- Open a high-priority issue and inspect its supporting feedback records.
- Change issue status, refresh the page, and confirm the state persists.
- Export a report and open it to check that it matches the selected dataset.
- Open Adaption Lab without a key; verify it clearly reports not configured. If a key is available, request an estimate first, then run only after an explicit confirmation and verify actual job status.
- Test at a narrow/mobile width and a desktop width.

## 7. Deploying the prototype

The preferred arrangement is one service that builds the Vite frontend and serves the build from FastAPI. This avoids CORS and multi-service setup for the hackathon. Cursor should add or document the correct build/start commands and host configuration for the provider selected.

Before deploying:
- Confirm frontend assets are included in the build and FastAPI serves them in production.
- Confirm `/api/health` works on the deployed URL.
- Add Gemini/Adaption keys through the host's environment-variable settings, never through the repository.
- Review request limits/timeouts for AI and Adaption jobs. Long-running Adaption runs need status polling and clear timeout/failure UI.
- Ensure no private customer feedback or local `.env` is committed.
- Test the live URL from a fresh browser session and retain a local sample-data demo path if provider credentials are unavailable.

A deployment is not complete until the public URL has been opened and the core workflow verified. Never write “deployed successfully” based only on a config file.
