# MASTER PROMPT — Build InsightFlow in Cursor

Act as a senior full-stack engineer, product designer, AI integration engineer, and QA reviewer. Build the complete InsightFlow hackathon prototype in the current workspace. **Implement it, run it, inspect it, test it, fix issues, and only then summarize. Do not stop after a plan.**

## 0. First inspect the project

Read `AGENTS.md`, `README.md`, `SETUP AND CREATION GUIDE.md`, and every document in `docs/`. Inspect the current repository before editing. If an app already exists, preserve useful code and adapt it; do not blindly replace files. Use the docs as the product specification. If a minor choice is unspecified, choose the simplest reasonable option and record it rather than asking me dozens of questions.

## 1. Product to build

**InsightFlow — Intelligent Customer Feedback & Decision Platform.** It helps an online-shopping business turn customer feedback from reviews, surveys, and support messages into clear, actionable decisions.

Core journey:
1. User opens a polished dashboard populated with clearly labeled synthetic sample feedback.
2. User browses feedback, adds a new entry or imports a CSV.
3. User runs feedback analysis.
4. The app classifies sentiment, identifies topics/categories and common complaints, then groups related feedback into issues.
5. Dashboard metrics and charts are recalculated from the current dataset.
6. User opens a priority issue, sees the real supporting comments and a transparent priority explanation, then saves/tracks its status.
7. User exports a useful report.
8. User opens Adaption Lab to prepare a task-specific feedback dataset, request an estimate, and—only after explicit confirmation—launch a genuine Adaption Adaptive Data run when credentials are configured.

Do not expand the scope beyond what can be completed well in approximately nine hands-on hours.

## 2. Required stack and structure

Use the stack defined in `docs/ARCHITECTURE.md` unless the repository already has a working equivalent:
- Frontend: React + Vite + TypeScript + Tailwind CSS; use a small chart library such as Recharts.
- Backend: Python FastAPI; Python backend handles all secrets and provider calls.
- AI: Google Gemini through a current supported Python SDK, configurable by environment variable. Check the current official SDK docs if package/API syntax is unclear. Do not expose a key in browser code.
- Adaption: official `adaption` Python SDK. Use only documented SDK methods and the official Adaptive Data workflow. Keep it separate from live sentiment analysis.
- Persistence: browser `localStorage` for feedback, analysis fields and tracked issue statuses; include sample-data reset and CSV/JSON export so the demo can be reset. Validate stored data and recover safely from malformed localStorage.
- Production serving: FastAPI serves API routes and, if a frontend build exists, serves the built Vite assets from the same service. Configure Vite development proxy for `/api` to the local FastAPI server. Avoid adding Supabase or a separate database for this prototype.

Create an understandable folder layout with `frontend/`, `backend/`, `docs/`, a `.env.example`, `.gitignore`, setup/deployment instructions, and any host config needed. Keep dependencies minimal. The exact subfolder layout is your choice if it remains consistent across imports and commands.

## 3. UI/UX requirements

Create an original, polished business dashboard—not a generic landing page. Use a restrained light theme, dark navy navigation, a calm blue primary accent, neutral surfaces, subtle borders, consistent spacing, clear typography, modest shadows, and meaningful charts. Avoid excessive gradients, oversized headings, neon colours, decorative clutter, and AI-generated-looking visual noise.

Responsive app shell:
- Sidebar or responsive navigation with InsightFlow mark/name and sections: Overview, Feedback, Issues & Actions, Adaption Lab.
- Page header with relevant title, short contextual description, and key action.
- Strong visual hierarchy; concise labels; accessible contrast; sensible empty/loading/error states.
- On mobile, navigation and tables must remain usable (allow table horizontal scroll or responsive cards).
- Use accessible buttons/inputs, visible focus, labels, semantic structure, and keyboard-friendly dialogs.

Pages:
A. **Overview:** KPI cards; sentiment distribution; feedback trend over time; top issue groups; priority queue. KPIs must be computed from actual current feedback. Chart date range/category/sentiment filters must affect the results.
B. **Feedback Explorer:** searchable/sortable list or table; filters for sentiment/category/source/date where supported; add-feedback form; CSV upload with column mapping or sensible automatic column detection; readable validation errors; row details including analysis and source/date. CSV text must be parsed safely—never evaluate imported content.
C. **Issues & Actions:** grouped issue cards/details; transparent frequency, negative share, severity signal, recent-growth signal where date coverage permits, a priority score and explanation; supporting feedback excerpts/IDs; recommendation text tied to the evidence; status values `Open`, `In progress`, `Resolved`; status survives refresh.
D. **Adaption Lab:** explains why Adaptive Data is used; displays whether `ADAPTION_API_KEY` is configured without revealing it; allows creating/download of a task-specific dataset from available feedback/labels; includes estimate and explicit confirmation before starting a real adaptation run; shows genuine run/job state, errors, and an output-download path when available. When no key is set, show an honest disabled/not-configured state and concise setup steps. Never display invented successful run IDs, estimates, credits, or results.

Use real icons from an installed icon library if helpful. Use no meaningless placeholder buttons. Every visible button must work or be clearly disabled with a reason.

## 4. Feedback data and analysis

Support entries with this conceptual shape (add optional fields if useful):
`id`, `text`, `source`, `date`, `rating`, `sentiment`, `category`, `issueKey`, `severity`, `confidence`, `analysisReason`, `status` (or keep issue status separately), `analyzedAt`.

Use stable IDs. Normalize whitespace, enforce reasonable text and row-count limits, handle blank rows, and avoid crashing on malformed dates or numeric ratings. CSV column detection should support common names such as `text`, `feedback`, `comment`, `review`, `message`, `content`; date/time names such as `date`, `created_at`, `timestamp`; rating names such as `rating`, `stars`, `score`; and source names such as `source`, `channel`. Provide a manual text-column selection when detection is ambiguous. Do not silently discard rows without telling the user.

### AI analysis
- Create a server-side `/api/analyze` endpoint (or coherent equivalent) with validated request/response models.
- Use Gemini for structured per-feedback classification: `sentiment` (`positive`, `neutral`, `negative`), a concise `category`, a normalized short `issueKey`, `severity` (`low`, `medium`, `high`), a confidence estimate if available, and a brief reason grounded in the comment. The model must not invent facts beyond the feedback text.
- Batch comments in a bounded way to avoid oversized requests; process enough rows for the demo while imposing a safe maximum and returning clear progress/failure feedback. Do not make one LLM request per comment if batching is feasible.
- Validate JSON/schema from the model; retry parsing at most once or use a safe fallback per failed batch. Do not trust model-supplied counts; calculate all totals in application code.
- Provide deterministic local heuristic analysis only when the API key is absent or a provider call fails. Make the UI disclose “Demo analysis (rules-based)” rather than presenting the fallback as live AI. The rest of the app remains functional.
- Do not send email addresses, phone numbers, payment data, or other sensitive details to an external model. Add simple redaction for obvious email/phone patterns before the request, and explain in Security docs that users should avoid uploading sensitive customer information.

### Issue grouping and priority
Group normalized `issueKey`/category values consistently. Use deterministic aggregation. The baseline priority formula is defined in `docs/PRD.md`: frequency 40%, negative share 30%, trend/recency 20% when valid dates exist, and severity 10%. Normalize each component to a 0–100 scale. When dates are missing or insufficient, redistribute the unavailable trend weight proportionally or explicitly mark trend as unavailable. Avoid division-by-zero and explain score components. Sort high priorities first, but allow the user to inspect evidence.

Recommendations should be short, action-oriented, and linked to actual patterns. Either generate them from a validated structured AI response with evidence constraints or use category-specific rules; do not produce generic advice that claims unsupported evidence. Always show the feedback count and relevant excerpts behind the recommendation.

## 5. Adaption integration — critical accuracy requirement

Read https://docs.adaptionlabs.ai/adaptive-data-quickstart and https://docs.adaptionlabs.ai/adaptive-data/overview/ during implementation if needed. Adaptive Data is for optimizing/expanding datasets for AI training; do not describe it as the live sentiment engine.

- Backend package name: `adaption` (verify the current supported version and syntax against official docs).
- Read `ADAPTION_API_KEY` only from server environment variables.
- Build task-specific supervised examples from feedback-analysis examples, such as `instruction`, `input`, and `output`, and save a downloadable local CSV/JSONL first. The `output` must be a structured target classification/analysis generated from reviewed/available labels, not a fabricated claim of ground truth.
- Implement a small backend workflow based on documented SDK operations: upload a local supported file, wait for ingestion/status, request `estimate=True` using the appropriate `column_mapping`, then display the estimate. Only launch the adaptation run after a separate user-confirmation click; never start a potentially billable run just by opening the page.
- If the official SDK requires a column mapping, use correct mappings for the actual file headers. Check return shapes/status values in current docs. Treat the long-running workflow as asynchronous; expose a job ID and polling/status endpoint or another robust async pattern. Handle failed, timeout, missing-key, missing-dataset, and download failures.
- When a run completes, allow the user to download/inspect the actual processed dataset if supported by the installed SDK.
- Never invent completion status, results, credits, evaluations, or run IDs. If this workflow cannot be fully verified because credentials are absent, implement/test the input validation and missing-key state, provide an honest explanation, and list the exact manual verification remaining. Do not silently replace the live integration with a mocked “success.”
- Keep this integration small; do not attempt custom model training within the prototype.

## 6. CSV, issue tracking, and reports

- CSV import should accept reasonable encodings, show how many rows were imported/rejected, and surface a useful error for unsupported/empty input.
- Include sample data with enough examples across positive/neutral/negative sentiment and payment, delivery, app reliability, product quality, and support. Spread sample dates over several weeks so trend charts have genuine variation. Clearly mark all sample content synthetic.
- Keep user feedback and issue statuses in browser storage. Include a reset-to-sample-data action with confirmation.
- Allow users to change issue status and save/unsave issues for follow-up.
- Export report as a downloadable HTML/CSV/JSON (choose the most reliable combination). The report should include date range, dataset scope, metrics, top issues, score breakdowns, recommendations, and supporting evidence. Do not claim charts or metrics that are not derived from the selected data.

## 7. Backend endpoints and settings

Use a consistent `/api` prefix and validate every request. Recommended routes:
- `GET /api/health` — app/provider configuration status without revealing secrets.
- `POST /api/analyze` — structured analysis of bounded feedback batches.
- `POST /api/adaption/estimate` — prepare/upload dataset if required by the official workflow and request an estimate; return honest status and estimate fields.
- `POST /api/adaption/run` — require explicit confirmation and start a real run using a previously estimated dataset/job.
- `GET /api/adaption/jobs/{job_id}` — poll actual job state.
- `GET /api/adaption/jobs/{job_id}/download` — deliver actual output where completed and supported.

You may adjust these endpoints if official SDK patterns make a different minimal flow safer. Use Pydantic models and meaningful HTTP status/error messages. Never return provider stack traces or secret values to the browser.

Use `.env.example` with placeholders such as:
- `GEMINI_API_KEY=`
- `GEMINI_MODEL=` (sensible current default, configurable)
- `ADAPTION_API_KEY=`
- `APP_ENV=development`
- `MAX_ANALYSIS_ROWS=`
No key is required for the sample/fallback workflow. Ensure `.env`, virtual environments, build output if appropriate, downloaded customer datasets, and local secrets are gitignored.

## 8. Quality gates: implement, review, test

Create tests appropriate to the chosen stack. At minimum:
- Frontend build and TypeScript checks pass.
- Unit tests cover sentiment counts, filtering, CSV normalization, priority-score math, missing dates, empty data, invalid stored state, and report generation/data consistency.
- Backend tests cover health, request validation, missing-key behavior, provider failure behavior, malformed LLM JSON, and Adaption missing-key/invalid workflow states. Mock external SDK/API calls in automated tests; never require live credentials to run the test suite.
- Add at least one integrated smoke-test checklist for: load sample data → analyze → filter → inspect issue evidence → change status → export report.
- Test responsive layout at approximate mobile (390px) and desktop (1366px) widths if browser tooling is available. If browser automation is not available, say that and provide manual steps.
- Run tests/build/lint/typecheck commands. Fix implementation-caused errors and rerun. Do not report tests as passed if not executed.

## 9. Deployment/readiness

Prepare instructions for one-service deployment. The built React/Vite frontend should be served by FastAPI in production; `/api/*` routes must continue working. Ensure paths work from the repository root, `$PORT` is honoured, CORS is not needlessly permissive, and secrets are configured via host environment settings rather than committed files. Include health-check instructions, startup/build commands, and a free/low-cost hosting note only if verified against current host policy. Do not claim it is deployed unless deployment actually happened.

## 10. Final execution sequence

1. Inspect docs and files.
2. Implement the working shell and core data flow.
3. Implement frontend pages and actual calculations.
4. Implement AI endpoint/fallback and response validation.
5. Implement honest Adaption workflow and disabled/configured UI states.
6. Implement exports and persistence.
7. Write/update `.env.example`, `.gitignore`, setup guide, and README commands.
8. Run all available tests, builds, lint and type checks.
9. Review the repository for dead buttons, hardcoded stats, exposed secrets, broken paths, missing empty/error/loading states, or inaccurate integration claims.
10. Fix failures and rerun checks.
11. Respond with exact file structure, features implemented, commands executed with outcomes, remaining manual checks requiring keys, and known limitations.

Start now. Do not ask for permission for normal file creation or routine code edits. If a destructive change is genuinely necessary, explain the risk before doing it. Make pragmatic decisions and keep the finished prototype demonstrable.
