# Data Model and Persistence

## 1. Storage choice

For a nine-hour individual hackathon prototype, **do not add a separate database by default**. Persist the user's current workspace in browser `localStorage`. Backend endpoints process analysis and Adaption jobs but do not store a central customer-feedback database.

This gives a simpler deployment and avoids setting up database credentials, schemas, migrations, and hosting under time pressure. Be explicit that saved data is browser/device-local and not shared across users.

## 2. Frontend entities

### FeedbackRecord

- `id: string` — stable generated identifier.
- `text: string` — required feedback body.
- `source: string` — review, survey, support, imported, or user-defined label.
- `date: string | null` — valid ISO date/time when known.
- `rating: number | null` — optional original rating.
- `sentiment: "positive" | "neutral" | "negative" | "unclassified"`.
- `category: string` — concise category label or `Uncategorized`.
- `issueKey: string` — normalized key used to group similar feedback.
- `severity: "low" | "medium" | "high" | "unknown"`.
- `confidence: number | null` — normalized 0–1 only if supported by the analyzer; do not invent certainty.
- `analysisReason: string` — short explanation linked to the feedback text.
- `analysisMode: "live-ai" | "demo-rules" | "unclassified"`.
- `analyzedAt: string | null` — ISO timestamp for last analysis.

### IssueState

- `issueKey: string` — stable normalized grouping key.
- `status: "Open" | "In progress" | "Resolved"`.
- `saved: boolean` — whether user has saved this issue for tracking.
- `updatedAt: string` — ISO timestamp.

Issue groups and aggregates should be derived from feedback records rather than separately maintained totals. If an issue key changes after reanalysis, keep old state only if it can be mapped safely; otherwise avoid silent incorrect state transfer.

## 3. Versioned localStorage

Use a single namespaced, versioned key (for example `insightflow.workspace.v1`) or a small set of versioned keys. Persist JSON-safe values only. On load:

1. Try parsing storage.
2. Validate the expected shape/version.
3. Recover safely from corrupted/unknown data (show a small notice and load sample data; do not crash the app).
4. Avoid writing the sample dataset over valid user data on every render.
5. Debounce writes only if needed; keep the implementation straightforward.
6. Provide a reset-to-sample action with confirmation.

Do not store API keys, access tokens, full provider responses containing sensitive material, or secret configuration in localStorage.

## 4. CSV normalization

Normalize known column names case-insensitively. Text aliases: `text`, `feedback`, `comment`, `review`, `message`, `content`, `description`. Date aliases: `date`, `created_at`, `createdAt`, `timestamp`, `submitted_at`. Source aliases: `source`, `channel`, `platform`. Rating aliases: `rating`, `stars`, `score`.

If several plausible text columns exist, ask the user to select one. Preserve the original comment. Assign IDs at import. Ignore only genuinely empty rows and report their count. Treat dates and numbers as untrusted values; parse safely.

## 5. Backend request schemas

Use Pydantic models. Bound text length, record count, and request size. Analysis input needs stable IDs so responses can be mapped to the correct record even if order changes. Analysis output should allow only documented enum values and concise strings. Reject duplicate IDs within a single request or define deterministic behaviour for them.

Adaption routes should receive only the curated task dataset needed for the operation. Do not store uploaded customer datasets on a persistent server disk unless necessary. Use temporary files with safe cleanup; never use user-provided filenames as filesystem paths.

## 6. Export formats

- Feedback export: CSV and/or JSON, preserving useful fields.
- Insight report: downloadable HTML or JSON, with human-readable title, generation timestamp, current data/filter scope, KPI figures, issue priority breakdown, recommendations, and supporting feedback excerpts.
- Escape CSV cells correctly (including commas, quotes, and newlines). Protect against spreadsheet formula injection when exporting user-controlled text by prefixing potentially dangerous leading characters where appropriate.
- Escape HTML content and never place comment text into raw HTML/script.

## 7. Future migration (not part of this prototype)

If multiple users, shared workspaces, or persistent hosted feedback storage become necessary, migrate the record model to a managed database such as PostgreSQL/Supabase and add authentication, workspace ownership, authorization, migrations, and data-retention controls. Do not build this now unless the current prototype has a specific blocker.
