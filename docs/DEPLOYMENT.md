# Deployment status — SignalIQ

## Current decision

**Not ready for deployment.** Legacy unauthenticated management routes are retired at the application boundary. The durable Adaption API is implemented but remains unverified against PostgreSQL and the live provider; deployment verification is also still required.

## When the blockers are resolved

1. Set host-managed `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_JWT_AUDIENCE`, `GEMINI_API_KEY`, and (when enabled) `ADAPTION_API_KEY`. Set only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser.
2. Apply the reviewed migration: `.\.venv\Scripts\alembic.exe -c alembic.ini upgrade head`.
3. Build with `npm --prefix frontend run build`.
4. Start FastAPI on the host-assigned `PORT`, bound to `0.0.0.0`.
5. Verify `/api/health`, a signed-in private API call, and two-account isolation on the deployed URL.

No host, public URL, migration execution, or provider configuration has been supplied or verified in this workspace.
