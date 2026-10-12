# Current-State Audit — SignalIQ

**Audit date:** 2026-10-12 (Asia/Kolkata)
**Branch / commit:** `product-transformation` / `940ba57` (`fix: test setup and filter bar refinements`)
**Scope:** Phase 0 repository audit only. No application behavior was changed.

## Canonical-documentation status

The intended reconstruction documents and phase prompts are present in two untracked archives:

- `SignalIQ_Reconstruction_Documentation.zip`
- `SignalIQ_Codex_Phase_Prompts.zip`

They have **not** been materialized into the root `AGENTS.md`, `README.md`, or `docs/` tree. At audit time, the old root `AGENTS.md`, `README.md`, and `InsightFlow_Cursor_Documentation_Bundle.zip` are marked deleted in the working tree. The present `docs/` tree is therefore a mixed legacy/current state and contradicts the archive's approved target on authentication, persistence, and visual direction. Do not delete old bundles or migrate the archive during this documentation-only phase.

The archive documents agree on SignalIQ as the active name, React/TypeScript/Vite/Tailwind plus FastAPI/Pydantic as the retained stack, Supabase Auth plus PostgreSQL as the Phase 3 target, Gemini as the current analysis provider, and Adaption as a separate reviewed-training-data workflow. It also replaces the legacy navy/blue visual direction with warm editorial analytics.

## Repository map

| Area | Current files | Status | Evidence and notes |
|---|---|---|---|
| Frontend shell and routes | `frontend/src/App.tsx`, `components/AppShell.tsx` | Implemented but unverified | Routes cover dashboard, form builder, installation, explorer, insights/actions, Adaption Lab, landing page, and public form. No authenticated-route guard exists. |
| Workspace state | `frontend/src/context/WorkspaceContext.tsx`, `lib/persistence.ts` | Implemented but unverified | Legacy sample/imported workspace and issue state use `signaliq.workspace.v1` in browser localStorage. The context additionally fetches project/submission/action endpoints when available. |
| Feedback import/export and analysis transforms | `lib/csv.ts`, `lib/export.ts`, `lib/analysis.ts`, `lib/metrics.ts`, `lib/priority.ts` | Implemented and verified | Frontend unit tests cover parsing, escaping, merging, filtering, metrics, persistence, and priority behavior. The score is 40% frequency, 30% negative rate, 20% trend, 10% severity. |
| Dashboard / explorer / insights UI | `pages/DashboardPage.tsx`, `ExplorerPage.tsx`, `InsightsPage.tsx` | Implemented but unverified | Current app presents functional filtering and data-derived cards. It still uses a navy-and-blue system that conflicts with the reconstruction design target. |
| Public collection | `pages/FormBuilderPage.tsx`, `InstallationPage.tsx`, `PublicFormPage.tsx`, `public/widget.js`, `backend/main.py` | Implemented and verified | Forms can be created/published; the widget and hosted route submit to `POST /api/public/submit`. A local smoke test verified the widget asset, a published form, persisted submission, and demo analysis. |
| Server persistence | `backend/database.py`, `backend/main.py` | Implemented and verified | Untracked SQLite implementation stores projects, forms, submissions, and actions in local `signaliq.db`; public-flow tests and a local smoke test passed. It is not the approved PostgreSQL/Supabase target and has no user ownership boundary. |
| Authentication and workspace isolation | no auth module or protected API dependency found | Planned | The API has no login/session verification. `workspace_id` defaults to a fixed value and project/action endpoints do not authorize ownership. This is the principal reconstruction gap. |
| Gemini analysis | `backend/gemini_client.py`, `backend/main.py`, `backend/redaction.py` | Implemented but unverified | Server-side Gemini JSON-schema path validates output and maps provider errors. Unit tests mock it. No live key/provider call was made. |
| Rule fallback | `backend/demo_analysis.py`, `frontend/src/lib/demoAnalysis.ts` | Implemented and verified | Deterministic fallback is labelled `demo-rules`; public submission smoke test returned this mode when no Gemini key was configured. |
| Adaption workflow | `backend/adaption_service.py`, `pages/AdaptionLabPage.tsx`, `lib/adaptionDataset.ts` | Implemented but unverified | Estimate, explicit confirmation, polling, and download code exist; tests mock the SDK. Jobs live only in a module-level dictionary and generated examples lack the approved human-review gate. No live account/key was available. |
| Testing | `frontend/src/**/*.test.*`, `backend/tests/` | Implemented and verified | Previously executed: 25 frontend tests and 22 backend tests passed; type-check and production build passed. Tests do not establish authentication, tenant isolation, live providers, or deployment. |
| Production serving and deployment | `backend/main.py`, `frontend/vite.config.ts` | Implemented but unverified | FastAPI serves `frontend/dist` if built; Vite proxies `/api` in development. No deploy configuration, target host, or verified public URL was found. |

## Screenshots inspected

All three images in `images/` are external UI references, not screenshots of a verified SignalIQ build.

- `Dashboard reference.png`: a bright, high-density analytics dashboard with an icon-led top nav, compact KPI cards, grouped bar chart, satisfaction heatmap, radial retention gauge, and radar chart. It demonstrates compact cards and useful hierarchy but is blue/white and therefore not the approved final palette.
- `Feedback Explorer reference.png`: a dense three-column cluster explorer. It pairs a deep navigation rail with query/filter chips, a sortable signal list, and an evidence/detail pane with a trend chart and action buttons. The list-to-evidence workflow is useful reference material.
- `Insights and Actions reference.png`: a light research-theme interface with a compact left rail, coloured severity summary cards, theme list, evidence pane, impact analysis, and related customer quotes. It shows the strongest mapping to SignalIQ's issue-to-evidence-to-action flow, but its palette must be adapted to the approved warm editorial system.

## Useful implementation to preserve

- Strict Pydantic request/response models and Gemini response validation.
- Explicitly labelled rule fallback and error state handling.
- Current CSV validation, safe report/CSV escaping, metrics, filtering, and explainable priority computation.
- Existing public-form/widget ingestion flow and tested SQLite persistence as a migration reference.
- Adaption's explicit estimate-before-run pattern and actual status/download code.
- The existing FastAPI static-serving path for a one-service deployment.

## Replacement / migration candidates

- Replace browser localStorage and local SQLite as sources of truth for signed-in user data with the approved authenticated PostgreSQL architecture.
- Add Supabase Auth verification and server-side workspace ownership checks to every private endpoint before considering any project data private.
- Persist Adaption job metadata and add reviewed-example selection; the current in-memory jobs are lost on restart.
- Move the visual system from navy/blue to the warm editorial target in Phase 1; retain functional layouts and reference-image information hierarchy.
- Materialize the new canonical documentation from the supplied archive in a deliberate documentation migration, resolving the current legacy contradictions once rather than keeping parallel sources.

## Verification and limits

### Performed

- Read repository status, branch, remote, recent commits, manifests, backend requirements, env example, source maps, tests, legacy docs, and both supplied archives.
- Searched tracked/untracked source for apparent credential patterns; only placeholders, test values, and documentation references were found.
- Inspected all reference images pixel-by-pixel.
- Earlier local checks in this working session: `pytest` (22 passed), `npm --prefix frontend test` (25 passed), `npm --prefix frontend run typecheck` (passed), and `npm --prefix frontend run build` (passed; Vite emitted a non-blocking large-chunk advisory).
- Earlier local smoke test against FastAPI verified `/api/health`, `/widget.js`, hosted form availability, public submission persistence, and labelled demo analysis.

### Unverified / blocked

- No Gemini or Adaption credentials were configured; no live provider result is claimed.
- No Supabase project, PostgreSQL connection, authentication setup, or deployment host configuration was present; account isolation and production persistence are not verified.
- The reference images show desired interaction patterns only; they do not prove current UI parity.

## Working-tree safety

The working tree contains substantial pre-existing application edits, new files, document deletions, and the two new ZIP archives. This audit does not stage, commit, push, reset, clean, stash, or alter those user changes. The repository remote is `origin` at `https://github.com/AlfinTG/SignalIQ.git`; Phase 0 instructions explicitly prohibit commit/push.

## Next phase

Phase 1 — UX, Design Direction, and Interface Specification. Before beginning it, materialize/approve the canonical reconstruction documentation so the legacy docs do not remain the active source of truth.

## Phase 6 release review — 2026-10-13

### Implemented and verified locally

- Full backend suite: 25 tests passed (one Starlette/httpx deprecation warning).
- Frontend typecheck passed; frontend suite: 24 tests passed; production Vite build passed.
- Alembic recognises `0001_private_workspaces` as the migration head.
- Private feedback/issue/analysis endpoints reject missing bearer credentials; focused tests include a cross-workspace feedback-update deny path.
- A source scan found no apparent live API key, Supabase secret key, or private-key material in tracked working files. `.env`, database files, build output, and virtual environments are ignored.

### Release blockers

- A live Supabase project, PostgreSQL `DATABASE_URL`, and two test accounts are absent. Migration application, signature/JWKS verification against a real issuer, workspace bootstrap, persistence, and tenant-isolation smoke testing remain unverified.
- Gemini and Adaption credentials are absent; no live provider request, timeout/rate-limit scenario, estimate/run, or output download was performed.
- Legacy unauthenticated prototype project/form/action endpoints are blocked with `410 legacy_route_retired`. Adaption now has authenticated owner-scoped endpoints backed by persistent job metadata and explicitly verified training examples. Its frontend remains unavailable until the rebuilt API client is connected and live-provider work is verified.
- No deployment host, target URL, or host credentials were supplied. No migration was applied and nothing was deployed.

### Release decision

**Partially verified — external blocker.** The unauthenticated legacy management surface is blocked rather than exposed. The authenticated core is locally tested, but Supabase/PostgreSQL, provider credentials, durable Adaption replacement, and deployment verification remain unavailable.
