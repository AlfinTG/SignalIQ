# Cursor Agent Instructions — InsightFlow

## Mission
Build a polished, working hackathon prototype from the specifications in `docs/`. Do not stop at writing a plan or mockup. Inspect the existing repository, implement the app, run checks, fix issues, and report exactly what was verified.

## Priority order
1. Working end-to-end user journey and correct data-derived numbers.
2. Honest AI and Adaption integrations with safe failure states.
3. Clean, coherent UI/UX and responsive layout.
4. Tests, setup instructions, and deployability.
5. Extra polish only after the above works.

## Scope discipline
- Target approximately nine hours of hands-on build time. Prefer the simplest robust implementation.
- Implement the requirements in `docs/PRD.md`; do not add authentication, multi-tenancy, billing, live integrations with review platforms, custom model training, or complex infrastructure.
- Use sample data to make the product demonstrable immediately, but label it as sample data. Do not hardcode dashboard KPIs that fail to respond to changed data.
- Store feedback and issue states in browser `localStorage`; document this limitation. Do not introduce a database unless a concrete blocker makes it necessary and the user is told why.
- Keep frontend and backend in one repository and configure the backend to serve the compiled frontend in production so deployment can use one service.
- If an API key or external service is missing, keep the app usable with a clearly labeled deterministic demo fallback. Never pretend the live provider succeeded.

## Coding rules
- Read `README.md`, this file, all files under `docs/`, and `CREATE_PROMPT.md` before implementation.
- TypeScript strictness: avoid `any`; use explicit types, validated API schemas, and clear error states.
- Keep components focused; separate UI, data transformations, API client code, and server integrations.
- Validate CSV imports and external AI output. Treat LLM output as untrusted data.
- No secrets in frontend environment variables, source code, logs, demo fixtures, commits, or screenshots.
- Use `.env.example` containing placeholder names only; ensure `.env` is gitignored.
- Keep interfaces keyboard-accessible, responsive, and readable at laptop and mobile widths.
- Use current official docs when SDK/API details are uncertain. Do not invent Adaption SDK methods.

## Required working behaviour
- Create, review, and test the code—not just generate files.
- Run frontend build, frontend tests, backend tests, and lint/type checks where configured.
- Inspect failures, fix those caused by the implementation, and rerun checks.
- If a check cannot run because dependencies, credentials, network access, or services are unavailable, say so specifically and provide the exact command or manual step needed.
- Do not delete user files or overwrite existing project code without inspecting and preserving it.
- Do not claim deployment, live API success, or test success without evidence from an executed command or actual response.

## Completion response
At the end, summarize: implemented features, project structure, commands executed, test/build results, environment variables still needed, any known limitations, and the shortest next steps for the user.
