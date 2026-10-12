# Security — SignalIQ

SignalIQ uses Supabase JWT verification for its authenticated workspace APIs. Do not upload real personal data to an unreviewed public demo.

Phase 3 adds Supabase JWT verification (signature, expiry, issuer, audience, and subject) to `/api/me`, `/api/workspace`, `/api/feedback`, and `/api/issues`. These endpoints resolve the workspace from the verified token and scope every query by it. The PostgreSQL role used by FastAPI still needs least privilege and must not be treated as protected by Supabase RLS when it is a bypass/table-owner role. Legacy prototype project/form endpoints are not an authorized data path for signed-in workspaces and must be migrated or retired before release.

- `GEMINI_API_KEY` and `ADAPTION_API_KEY` exist only in backend environment variables.
- Never use `VITE_` prefixes for secrets.
- Health endpoints may say whether a key is configured; they never return key material.
- Redact obvious emails and phone numbers before Gemini calls. Simple redaction is not anonymization.
- Treat imported text and model output as untrusted. Escape CSV and HTML exports.
- Limit file size, row count, and text length. Never evaluate imported content.
- Adaption Lab never starts a credit-consuming run on page load. Estimate first, then an explicit Run action.
- localStorage is not a vault. Do not store secrets there.
- Public submission payloads and required form fields are validated server-side. Custom data is bounded to simple, small values.
- If a project has a website URL, browser submissions must have a matching `Origin`. Server-to-server requests without an Origin remain supported.
- Public submissions are limited in-memory to 12 per client per minute. This is a demo-level measure; replace it with a shared limiter before horizontally scaling.
- Cross-origin browser access is disabled by default. Configure `CORS_ORIGINS` with an explicit comma-separated allowlist for approved embedding origins; never use a wildcard for authenticated APIs.
- `signaliq.db` is a local SQLite database and is excluded from Git. It is not a substitute for backups, authentication, or tenant isolation.
