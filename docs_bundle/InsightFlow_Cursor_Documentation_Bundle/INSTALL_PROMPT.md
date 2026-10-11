# Cursor Prompt — Install, Run, and Diagnose InsightFlow

Use this prompt **after** the main build if the project is implemented but fails to install or start. Do not use it as a substitute for `CREATE_PROMPT.md`.

> Read `AGENTS.md`, `README.md`, `SETUP AND CREATION GUIDE.md`, and `docs/ARCHITECTURE.md`. Inspect the actual files and the current terminal errors first. Diagnose the root cause, then make the smallest safe correction. Do not rewrite the stack or replace working features just to clear an error.
>
> Check the Python and Node versions required by the dependencies, confirm paths and commands for Windows PowerShell, install the frontend and backend dependencies, create `.env` from `.env.example` if absent, and keep all API secrets blank until I provide them. Never place an API key into source code.
>
> Run the backend and frontend development servers using the commands documented in the project. Confirm the backend `/api/health` endpoint responds and that the frontend can reach `/api` through the configured proxy. If this is a production-build issue, build Vite assets and confirm FastAPI serves them.
>
> Run frontend typecheck/build/tests and backend tests. Fix actual code/configuration problems and rerun the failed command. If failure depends on unavailable credentials, external network access, or a provider account, do not fake success: isolate the missing prerequisite and leave the sample/demo workflow usable.
>
> At the end, give me exact commands to run in Windows PowerShell, show the command results you observed, list any remaining required environment variables, and tell me what to open in the browser. Do not claim deployment or external API success unless you verified it.
