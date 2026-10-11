# Testing Strategy and Acceptance Checklist

## 1. Testing goals

The prototype must demonstrate the core journey reliably, even when external credentials are absent. Pure data calculations should be tested without live network calls.

## 2. Frontend unit tests

Create tests for:

- Sentiment counts and negative share (including empty dataset).
- Filtering by search, category, sentiment, and date; combined filters.
- CSV normalization for different common header aliases, duplicate/blank headers, blank rows, malformed ratings/dates, and ambiguous text columns.
- Priority score normalization, weighting, missing trend data, and zero-count cases.
- Grouping records by normalized issue key and linking all supporting IDs.
- Recommendation/evidence generation from actual groups.
- localStorage parse/validation/recovery from malformed and older-version data.
- CSV/report escaping, including quotes, line breaks, and malicious-looking strings.
- Export report totals matching the selected dataset/filter scope.

## 3. Backend unit tests

Mock provider SDKs; tests should not require network access or API credentials.

- `GET /api/health` works and never reveals credentials.
- Analysis rejects malformed/oversized requests and empty records correctly.
- Missing Gemini key yields an explicit configured/not-configured response or the documented server response that the frontend handles with demo fallback.
- Provider timeouts/errors map to a safe, actionable response.
- Malformed model JSON/invalid enum fields are rejected or safely handled; no invalid response is silently trusted.
- Input redaction is applied before the external provider request.
- Adaption routes handle missing `ADAPTION_API_KEY`, invalid mapping/input, ingestion failures, estimate failures, job timeout, provider failure, and output-not-ready states.
- Mocked successful Adaption flow only reports success when the mocked SDK actually returns successful states.

## 4. Integration smoke test

Manually execute in the browser:

1. Open the app with no API keys; sample dataset loads.
2. Add a feedback comment; it appears in the list and is persisted after reload.
3. Import a valid CSV and observe an accurate accepted/rejected row summary.
4. Run the demo/rules-based analysis path; confirm it is labelled as demo analysis.
5. Filter to negative feedback and verify the count/list/chart updates correctly.
6. Open the top issue and inspect supporting comments and priority inputs.
7. Change status to `In progress`; reload and confirm it persists.
8. Export a report; inspect whether the total, top issues and recommendations match the selected dataset.
9. Open Adaption Lab with no key and verify it says not configured without fake success.
10. If credentials are available, request an estimate; verify a separate confirmation is required for the real run; inspect genuine status and output handling.
11. Use the reset action and confirm it returns to the original synthetic sample set only after user confirmation.
12. Test mobile width and desktop width; check no key control or content becomes unusable.

## 5. Commands

Cursor must create working test scripts and add their commands to README. At minimum run:

- Frontend: install, lint (if configured), typecheck, unit tests, and production build.
- Backend: Python test suite (for example `pytest`).
- Production smoke test: start the built app and verify `/api/health` plus the frontend root responds.

Do not report a command as passed unless it was executed. If a tool isn't available, name the blocker and give a manual verification path.

## 6. Release blockers

Do not call the prototype ready until the following critical issues are resolved or explicitly documented:

- Broken startup/build path.
- Any exposed credential or secret.
- Hardcoded KPI values disconnected from the current data.
- A visible button that does nothing without indication.
- An Adaption success state that is simulated or invented.
- Report totals that disagree with the source data.
- Imported content that can execute as HTML/script.
- Core flow broken with missing API credentials.
