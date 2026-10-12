# AI and Adaption — SignalIQ

Gemini analyzes current feedback; deterministic application code computes counts, trend, issue groups, and the documented 40/30/20/10 priority heuristic. Adaption is a separate, future dataset-improvement workflow and is never the live classifier.

## Phase 4 implementation

`POST /api/feedback/analyze` requires a verified Supabase bearer token and accepts only persisted feedback IDs from the caller's own workspace. `live-ai` sends redacted comment text to Gemini using structured output. Returned IDs, enums, field lengths, and malformed rows are validated before persistence. A provider failure, a missing key, or an invalid row leaves existing analysis unchanged.

`demo-rules` is an explicit alternative mode. It is stored as `demo-rules` and is never represented as Gemini output. A live request does not silently fall back to rules. The UI reports the configured/provider failure and allows the user to choose demo mode deliberately.

Confidence is retained only when supplied by the structured response and is not described as a calibrated probability. Existing labels remain reviewable; Phase 5 will add verified human-example eligibility and the Adaption job lifecycle.

## Provider limits

Gemini keys are server-only. Basic email/phone redaction reduces obvious direct identifiers but is not anonymization. No live Gemini call has been verified in this repository because no credential is configured.
