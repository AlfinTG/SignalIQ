# InsightFlow — Cursor Documentation Bundle

**Purpose:** Give Cursor a clear, bounded specification for building a working InsightFlow hackathon prototype in approximately **9 hours of hands-on time**.

InsightFlow converts raw customer comments into sentiment labels, recurring issue groups, evidence-backed priorities, and practical next steps. The initial demo scenario is an online-shopping business.

## Start here

1. Copy this entire folder into the root of a new project directory, or place these files in the root of an existing empty repository.
2. Open that project directory in Cursor.
3. Open `CREATE_PROMPT.md`, copy the full prompt, and send it to Cursor Agent in one message.
4. Let Cursor inspect these docs, implement the application, and run the tests. Review its summary and any failures before accepting changes.
5. Follow `SETUP AND CREATION GUIDE.md` to configure the environment and run the application locally.
6. Use `INSTALL_PROMPT.md` only if you need Cursor to diagnose or finish local setup after the main build.

## Files in this bundle

```text
InsightFlow_Cursor_Documentation_Bundle/
├── AGENTS.md                       # Persistent instructions for Cursor
├── CREATE_PROMPT.md                # One-shot master build/review/test prompt
├── INSTALL_PROMPT.md               # Setup and troubleshooting prompt
├── README.md                       # Project overview and document map
├── SETUP AND CREATION GUIDE.md     # Local setup, environment, deployment checklist
└── docs/
    ├── ARCHITECTURE.md             # Components and data flow
    ├── CODE_STYLE.md                # Code quality and implementation rules
    ├── DATABASE.md                  # Data model and browser persistence choices
    ├── DESIGN_SYSTEM.md              # Visual/UX direction
    ├── PRD.md                        # Product requirements and acceptance criteria
    ├── SECURITY.md                   # Secrets and data safety
    └── TESTING.md                    # Testing strategy and acceptance tests
```

## Planned prototype stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, and Recharts (or another small chart library if needed).
- **Backend:** Python FastAPI, serving API endpoints and the built frontend from one deployable service.
- **AI feedback analysis:** Gemini API through the official supported Python SDK, accessed only by the backend. Keep the provider/model configurable and verify current SDK usage against official documentation during implementation.
- **Adaption:** The official `adaption` Python SDK, used for an explicitly triggered Adaptive Data dataset workflow—not falsely described as a live sentiment-classification endpoint.
- **Persistence:** Browser `localStorage` for the small single-user prototype, with import/export backups. No production database is needed for the nine-hour build.
- **Deployment target:** One service that can run FastAPI and serve the frontend build, such as a compatible Render web service. Confirm current host requirements before deployment.

## Important scope boundary

This is a **single-user, hackathon prototype**, not a production SaaS. It must still be real and functional: imported feedback changes metrics; filters work; recommendations cite actual records; issues can be saved and tracked; reports can be downloaded; backend AI errors are handled honestly; and Adaption is either genuinely connected or clearly shown as not configured. Never fake a successful external run.

## Adaption reference

Official docs: https://docs.adaptionlabs.ai/adaptive-data-quickstart and https://docs.adaptionlabs.ai/adaptive-data/overview/

Adaptive Data optimizes/expands datasets for AI training. Its quickstart demonstrates the `adaption` package, `ADAPTION_API_KEY`, dataset upload, an estimate step, adaptation, status polling, and processed-data download. API credentials must remain server-side and must never be committed.
