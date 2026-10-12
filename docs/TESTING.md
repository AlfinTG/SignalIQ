# Testing — SignalIQ

## Test coverage

**Frontend (Vitest + React Testing Library)**

| Suite | Tests | What is verified |
|---|---|---|
| `analysis.test.ts` | 2 | applyAnalysisItems merges results and leaves unmatched records unchanged |
| `csv.test.ts` | 5 | column detection, malformed rows, column mapping, row limit, empty input |
| `demoAnalysis.test.ts` | 1 | keyword rules label a matched comment correctly |
| `export.test.ts` | 2 | HTML escape, CSV quoting |
| `filters.test.ts` | 2 | text search, sentiment filter |
| `metrics.test.ts` | 3 | empty input, sample data KPIs, negative share |
| `persistence.test.ts` | 4 | save/load round-trip, recovery from corrupt storage, empty workspace |
| `priority.test.ts` | 3 | grouping, priority scoring, trend handling with few dates |
| `App.test.tsx` | 3 | renders KPIs from sample data, navigation, demo-analysis fallback when Gemini is absent |
| **Total** | **25** | |

External services (fetch, Gemini) are mocked in `App.test.tsx`. No API key is needed.

**Backend (pytest)**

| Module | Tests | What is verified |
|---|---|---|
| `test_health.py` | 2 | `/api/health` fields, configured flags |
| `test_analyze.py` | 9 | valid analysis, missing Gemini key, provider failure, malformed JSON, too many rows, record validation |
| `test_adaption.py` | 6 | missing Adaption key, estimate flow (mocked SDK), start run, invalid confirmation, job not found |
| **Total** | **17** | |

Adaption and Gemini SDKs are injected via `client_factory` and `monkeypatching`; no real API calls are made.

## Commands

```powershell
# Frontend
npm --prefix frontend test
npm --prefix frontend run typecheck
npm --prefix frontend run build

# Backend
.\.venv\Scripts\python.exe -m pytest backend\tests -v
```

## What cannot be tested automatically

- Live Gemini analysis (requires `GEMINI_API_KEY` and network)
- Live Adaption estimate/run (requires `ADAPTION_API_KEY` and account credits)
- The production build serving the frontend through FastAPI (verify manually by running the backend against `frontend/dist`)
