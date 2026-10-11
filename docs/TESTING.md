# Testing — SignalIQ

Frontend (Vitest): metrics, filters, CSV, priority, grouping, persistence, export escaping.
Backend (pytest): health, analysis validation, missing Gemini key, provider failure, malformed JSON, Adaption missing key and invalid confirmation. External SDKs are mocked.

Commands:

```powershell
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```
