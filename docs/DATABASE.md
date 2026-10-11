# Data Model and Persistence — SignalIQ

## Storage

The prototype persists the workspace in browser `localStorage` under `signaliq.workspace.v1`. The backend does not store customer feedback.

Saved data is local to one browser/device and is not synchronized across users.

## FeedbackRecord

- `id`, `text`, `source`, `date`, `rating`
- `sentiment`: positive | neutral | negative | unclassified
- `category`, `issueKey`, `severity` (low | medium | high | unknown)
- `confidence` (0–1 or null), `analysisReason`, `suggestedAction`
- `analysisMode`: live-ai | demo-rules | unclassified
- `analyzedAt`, `isSample`

## IssueState

- `issueKey`, `status` (Open | In progress | Resolved), `saved`, `updatedAt`

Issue groups and totals are derived from feedback records.

## CSV aliases

- Text: `text`, `feedback`, `comment`, `review`, `message`, `content`, `description`
- Date: `date`, `created_at`, `createdAt`, `timestamp`, `submitted_at`
- Source: `source`, `channel`, `platform`
- Rating: `rating`, `stars`, `score`

## Backend limits

Analysis: bounded IDs + text, default max 80 rows, 4000 characters per comment.
Adaption: curated instruction/input/output examples only; temporary files cleaned after upload.
