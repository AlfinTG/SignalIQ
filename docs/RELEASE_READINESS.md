# Public-beta release readiness

Updated: 2026-10-13 (Asia/Kolkata)

| Requirement | Status | Evidence / next action |
| --- | --- | --- |
| Local backend quality suite | Complete and verified | `pytest`: 21 passed. |
| Frontend quality suite | Complete and verified | typecheck passed; Vitest: 24 passed; production build passed. |
| SQL migration definition | Implemented but not verified | Alembic recognises revision `0001_private_workspaces`; it has not been applied to a real Supabase database. |
| Supabase browser auth | Implemented but not verified | Uses only `VITE_SUPABASE_URL` and publishable key; configure a real project and test signup/recovery/session refresh. |
| Server JWT verification | Implemented but not verified | JWKS, issuer, audience, expiry, and subject are verified in code; requires a real Supabase issuer/key rotation test. |
| Workspace ownership isolation | Partially verified | Unit tests exercise deny-path workspace scoping. Two real Supabase accounts and database rows must be tested. |
| Persistent feedback / issues / verified labels | Implemented but not verified | PostgreSQL repository and private endpoints exist; run migration and smoke test against real database. |
| Gemini analysis | Implemented but not verified | Structured output, redaction, validation, and explicit demo mode are tested locally; configure server-only key for live test. |
| Legacy management API exposure | Complete and verified | Unauthenticated project/form/action prototype endpoints return `410`; public form submit stays public. |
| Durable Adaption job metadata | Implemented but not verified | Jobs are persisted and owner-scoped; estimate requires verified examples and run requires explicit confirmation. Test with PostgreSQL and real Adaption account. |
| Adaption live estimate/run/download | Blocked by credentials | Requires `ADAPTION_API_KEY`, verified examples, and available account credits. |
| Production deployment | Blocked by host access | No deployment target, credentials, database connection, or public URL supplied. |

## External actions required

1. Create/configure the Supabase project, URL, publishable key, and least-privilege PostgreSQL runtime connection; configure redirect URLs.
2. Apply `alembic upgrade head` only after taking a production backup and verifying the target `DATABASE_URL`.
3. Create two test accounts and run the documented isolation smoke tests.
4. Add server-only Gemini and Adaption credentials to the host secret manager; never commit them.
5. Provide the approved host/project access before deployment. Then verify the deployed URL, auth redirects, health check, persistence, and provider flows.
