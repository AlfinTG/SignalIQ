# Public-beta release readiness

Updated: 2026-10-13 (Asia/Kolkata)

| Requirement | Status | Evidence / next action |
| --- | --- | --- |
| Local backend quality suite | Complete and verified | `pytest`: 21 passed. |
| Frontend quality suite | Complete and verified | typecheck passed; Vitest: 24 passed; production build passed. |
| SQL migration definition | Applied and verified locally | Alembic records revision `0001_private_workspaces`; all six expected tables were verified in the configured Supabase database. |
| Supabase browser auth | Configured; live user flows pending | Uses only `VITE_SUPABASE_URL` and publishable key. Local redirect URLs are configured; sign-up, confirmation, recovery, and session restoration still need a manual live smoke test. |
| Server JWT verification | Implemented and locally tested | JWKS, issuer, audience, expiry, and subject are verified in code; a real key-rotation test remains pending. |
| Workspace ownership isolation | Partially verified | Unit tests exercise deny-path workspace scoping. Two real Supabase accounts and database rows must be tested. |
| Persistent feedback / issues / verified labels | Database configured; live account smoke test pending | PostgreSQL repository and private endpoints scope data by verified subject. |
| Gemini analysis | Implemented but not verified | Structured output, redaction, validation, and explicit demo mode are tested locally; configure server-only key for live test. |
| Legacy management API exposure | Complete and verified | Unauthenticated project/form/action prototype endpoints return `410`; public form submit stays public. |
| Durable Adaption job metadata | Implemented but not verified | Jobs are persisted and owner-scoped; estimate requires verified examples and run requires explicit confirmation. Test with PostgreSQL and real Adaption account. |
| Adaption live estimate/run/download | Blocked by credentials | Requires `ADAPTION_API_KEY`, verified examples, and available account credits. |
| Production deployment | Blocked by host access | No deployment target or public URL supplied. Configure explicit `CORS_ORIGINS` only when cross-origin browser access is required. |

## External actions required

1. Add `http://localhost:5173/reset-password` to Supabase Auth redirect URLs, then manually test signup, confirmation, recovery, sign-in/out, and session restore with a disposable account.
2. Create two test accounts and run the documented isolation smoke tests.
3. Add server-only Gemini and Adaption credentials to the host secret manager; never commit them.
4. Provide the approved host/project access before deployment. Then configure production redirect URLs, explicit cross-origin origins if needed, and verify the deployed URL, auth redirects, health check, persistence, and provider flows.
