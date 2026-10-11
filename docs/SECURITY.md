# Security — SignalIQ

This is an unauthenticated hackathon prototype. Do not upload real personal data to a public demo.

- `GEMINI_API_KEY` and `ADAPTION_API_KEY` exist only in backend environment variables.
- Never use `VITE_` prefixes for secrets.
- Health endpoints may say whether a key is configured; they never return key material.
- Redact obvious emails and phone numbers before Gemini calls. Simple redaction is not anonymization.
- Treat imported text and model output as untrusted. Escape CSV and HTML exports.
- Limit file size, row count, and text length. Never evaluate imported content.
- Adaption Lab never starts a credit-consuming run on page load. Estimate first, then an explicit Run action.
- localStorage is not a vault. Do not store secrets there.
