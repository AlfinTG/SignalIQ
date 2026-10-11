# Security and Privacy Notes

## 1. Prototype assumptions

InsightFlow is a hackathon demo without authentication. Anyone who can access the deployed site can use its exposed UI and backend endpoints. Do not put sensitive or real customer personal data into the public demo. Use synthetic or anonymized feedback during judging.

## 2. Secrets

- `GEMINI_API_KEY` and `ADAPTION_API_KEY` must exist only in backend environment variables or local `.env`.
- Never prefix backend secrets with `VITE_` or embed them in frontend assets.
- Add `.env`, virtual environments, local datasets, generated provider outputs, and secret files to `.gitignore` as appropriate.
- `.env.example` must contain variable names and blank/placeholding values only.
- Health/status endpoints may disclose whether a key is configured but never return the key or any substring of it.

## 3. Feedback data and AI provider

- Tell users to avoid uploading names, email addresses, phone numbers, payment details, health information, or other sensitive content.
- Redact obvious emails and phone numbers before an external LLM request. Explain that simple redaction is not a guarantee of anonymization.
- Send only necessary text/metadata. Do not log raw feedback bodies or full model prompts/responses.
- Treat all imported text and model responses as untrusted input. Validate response schemas and escape displayed/exported content.
- Do not render AI output through unsanitized `dangerouslySetInnerHTML`.

## 4. CSV and export safety

- Limit file size, row count, text length, and accepted types.
- Parse CSV using a maintained parser; never evaluate any imported content as code.
- Do not build server filesystem paths from an imported filename.
- Escape CSV cells correctly. Consider spreadsheet formula injection for strings beginning with `=`, `+`, `-`, or `@`.
- Escape HTML in report output.

## 5. API and deployment

- Validate all backend requests using Pydantic.
- Use sane request limits, timeouts, and error mapping.
- Configure CORS narrowly if separate origins are used. If the frontend is served by FastAPI from the same origin, avoid unnecessary permissive CORS.
- Honour the host-provided listening port.
- Consider rate limits and abuse controls before publicly sharing an unauthenticated deployment. For the hackathon, keep provider row limits low and avoid unlimited request loops.
- Do not claim the prototype is secure for production, compliant, or privacy-certified.

## 6. Adaption credit and user confirmation

- Opening Adaption Lab must not automatically submit a paid/credit-consuming run.
- Request/show a current estimate first if the API supports that workflow.
- Require a separate explicit user action before the actual run.
- Clearly display that the run is external and may consume account credits according to Adaption's current terms.
- Never fake estimate, job ID, run status, evaluation, or output.

## 7. localStorage limitations

Browser localStorage is not a secure vault and may persist after logout/browser restarts. Do not store secrets there. Provide reset/export controls and communicate that records are local to the current browser/device. A future multi-user deployment requires authentication, authorization, database access controls, retention/deletion rules, and a privacy review.
