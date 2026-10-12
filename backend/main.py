from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.adaption_service import (
    AdaptionServiceError,
    create_estimate,
    download_job,
    refresh_job,
    start_run,
)
from backend.config import get_settings
from backend.database import (
    create_action,
    create_form,
    create_project,
    get_form,
    get_project,
    init_db,
    insert_submission,
    list_actions,
    list_forms,
    list_projects,
    list_submissions,
    update_action,
    update_form,
    update_submission_analysis,
)
from backend.demo_analysis import analyze_text_rules
from backend.gemini_client import GeminiAnalysisError, analyze_with_gemini
from backend.redaction import redact_text
from backend.private_api import router as private_router
from backend.schemas import (
    ActionCreate,
    ActionOut,
    ActionUpdate,
    AdaptionEstimateRequest,
    AdaptionEstimateResponse,
    AdaptionJobStatus,
    AdaptionRunRequest,
    AdaptionRunResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ErrorBody,
    FeedbackIn,
    FormCreate,
    FormOut,
    FormUpdate,
    ProjectCreate,
    ProjectOut,
    PublicSubmissionIn,
    PublicSubmissionResponse,
    SubmissionOut,
)

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

app = FastAPI(title="SignalIQ", version="1.0.0")
app.include_router(private_router)
settings = get_settings()

_RETIRED_PRIVATE_PREFIXES = ("/api/projects", "/api/forms", "/api/actions")


@app.middleware("http")
async def retire_unauthorized_prototype_routes(request: Request, call_next: Any) -> Response:
    """Keep prototype management endpoints from becoming a tenant-isolation bypass.

    Public form retrieval/submission routes are intentionally outside this guard.
    Authenticated workspace workflows use the owner-scoped `/api/feedback`,
    `/api/issues`, and `/api/training-examples` APIs instead.
    """
    if request.url.path.startswith(_RETIRED_PRIVATE_PREFIXES):
        return JSONResponse(
            status_code=410,
            content={"error": {"code": "legacy_route_retired", "message": "This prototype endpoint is retired. Use the authenticated workspace API."}},
        )
    return await call_next(request)

_SUBMISSION_WINDOW_SECONDS = 60
_SUBMISSION_LIMIT = 12
_submission_attempts: Dict[str, List[float]] = {}

# Cross-origin browser access is opt-in. Same-origin production requests and
# Vite's development proxy do not need an entry here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database schema and default seeds on module load
init_db()


def _http_error(status: int, code: str, error: str, detail: str | None = None) -> HTTPException:
    return HTTPException(status_code=status, detail=ErrorBody(error=error, code=code, detail=detail).model_dump())


def _project_origin(project_url: object) -> str | None:
    if not isinstance(project_url, str) or not project_url.strip():
        return None
    parsed = urlparse(project_url)
    return parsed.geturl().rstrip("/") if parsed.scheme in {"http", "https"} and parsed.netloc else None


def _verify_submission_origin(request: Request, project: Dict[str, Any]) -> None:
    """Allow server-to-server requests and a configured website's browser requests."""
    origin = request.headers.get("origin")
    configured_origin = _project_origin(project.get("url"))
    if origin and configured_origin and origin.rstrip("/") != configured_origin:
        raise _http_error(403, "origin_not_allowed", "This website is not allowed to submit to this project.")


def _enforce_submission_rate_limit(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    now = time.monotonic()
    attempts = [attempt for attempt in _submission_attempts.get(client, []) if now - attempt < _SUBMISSION_WINDOW_SECONDS]
    if len(attempts) >= _SUBMISSION_LIMIT:
        raise _http_error(429, "rate_limited", "Too many feedback submissions. Please try again shortly.")
    attempts.append(now)
    _submission_attempts[client] = attempts


def _validate_required_form_fields(form: Dict[str, Any], payload: PublicSubmissionIn) -> None:
    custom_data = payload.custom_data or {}
    for field in form["fields"]:
        if not field.get("required"):
            continue
        field_type = field.get("type")
        field_id = field.get("id")
        if field_type == "textarea":
            value: object = payload.text
        elif field_type == "rating":
            value = payload.rating
        elif field_type == "category":
            value = custom_data.get(field_id) or custom_data.get("category")
        else:
            value = custom_data.get(field_id)
        if value is None or (isinstance(value, str) and not value.strip()):
            label = field.get("label") or "A required field"
            raise _http_error(400, "required_field_missing", f"{label} is required.")


# --- Health & Diagnostic Endpoint ---
@app.get("/api/health")
def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "ok": True,
        "service": "signaliq",
        "version": settings.app_version,
        "environment": settings.app_env,
        "gemini_configured": settings.gemini_configured,
        "adaption_configured": settings.adaption_configured,
        "max_analysis_rows": settings.max_analysis_rows,
        "gemini_model": settings.gemini_model if settings.gemini_configured else None,
    }


# --- Widget Script Delivery ---
@app.get("/widget.js", response_class=PlainTextResponse)
def get_widget_js() -> Response:
    widget_path = ROOT / "frontend" / "public" / "widget.js"
    if widget_path.exists():
        return Response(content=widget_path.read_text(encoding="utf-8"), media_type="application/javascript")
    return Response(content="// SignalIQ widget unavailable", media_type="application/javascript")


# --- Public Feedback Form & Submission API ---
@app.get("/api/public/forms/{form_id}", response_model=FormOut)
def get_public_form(form_id: str) -> FormOut:
    form = get_form(form_id)
    if not form:
        raise _http_error(404, "form_not_found", "The requested feedback form was not found.")
    if form["status"] != "published":
        raise _http_error(403, "form_not_published", "This feedback form is currently in draft mode or disabled.")
    return FormOut(**form)


@app.post("/api/public/submit", response_model=PublicSubmissionResponse)
def submit_public_feedback(payload: PublicSubmissionIn, request: Request) -> PublicSubmissionResponse:
    form = get_form(payload.form_id)
    if not form:
        raise _http_error(404, "form_not_found", "The specified feedback form was not found.")
    if form["status"] != "published":
        raise _http_error(403, "form_not_published", "This feedback form is currently not accepting submissions.")

    project = get_project(form["project_id"])
    if not project:
        raise _http_error(404, "project_not_found", "The project for this form was not found.")
    _verify_submission_origin(request, project)
    _enforce_submission_rate_limit(request)
    _validate_required_form_fields(form, payload)

    cleaned_text = payload.text.strip()
    if len(cleaned_text) < 3:
        raise _http_error(400, "invalid_text", "Feedback text must be at least 3 characters.")

    project_id = form["project_id"]

    # 1. Immediately persist submission so incoming feedback is never lost
    sub = insert_submission(
        project_id=project_id,
        form_id=payload.form_id,
        text=cleaned_text,
        rating=payload.rating,
        source=payload.source or "widget",
        custom_data=payload.custom_data,
        created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )

    # 2. Automated AI Analysis (with graceful fallback to deterministic rules)
    settings = get_settings()
    analysis_applied = False

    if settings.gemini_configured:
        try:
            sanitized_text = redact_text(cleaned_text)
            feedback_in = FeedbackIn(id=sub["id"], text=sanitized_text, source=sub["source"], rating=sub["rating"])
            results, _, _ = analyze_with_gemini([feedback_in], api_key=settings.gemini_api_key, model=settings.gemini_model)
            if results:
                res = results[0]
                update_submission_analysis(
                    submission_id=sub["id"],
                    sentiment=res.sentiment,
                    category=res.category,
                    issue_key=res.issue_key,
                    severity=res.severity,
                    confidence=res.confidence,
                    analysis_reason=res.explanation,
                    suggested_action=res.suggested_action,
                    analysis_mode="live-ai",
                )
                analysis_applied = True
        except Exception:
            # Fall back to demo rules if Gemini fails
            pass

    if not analysis_applied:
        rule_res = analyze_text_rules(cleaned_text, rating=payload.rating)
        update_submission_analysis(
            submission_id=sub["id"],
            sentiment=rule_res["sentiment"],
            category=rule_res["category"],
            issue_key=rule_res["issue_key"],
            severity=rule_res["severity"],
            confidence=rule_res["confidence"],
            analysis_reason=rule_res["analysis_reason"],
            suggested_action=rule_res["suggested_action"],
            analysis_mode=rule_res["analysis_mode"],
        )

    return PublicSubmissionResponse(
        ok=True,
        submission_id=sub["id"],
        message=form.get("success_message") or "Thank you for your feedback!",
    )


# --- Projects CRUD ---
@app.get("/api/projects", response_model=List[ProjectOut])
def list_all_projects() -> List[ProjectOut]:
    projects = list_projects()
    return [ProjectOut(**p) for p in projects]


@app.post("/api/projects", response_model=ProjectOut)
def create_new_project(payload: ProjectCreate) -> ProjectOut:
    project = create_project(name=payload.name, url=payload.url)
    # Automatically generate a starter published form for the new project
    starter_fields = [
        {"id": "category", "type": "category", "label": "Topic", "required": False, "options": ["General", "Bug Report", "Feature Request", "Question"]},
        {"id": "text", "type": "textarea", "label": "Your feedback", "required": True, "placeholder": "What would you like to share?"},
        {"id": "rating", "type": "rating", "label": "Satisfaction rating", "required": False},
        {"id": "email", "type": "email", "label": "Email (optional)", "required": False, "placeholder": "you@example.com"}
    ]
    create_form(
        project_id=project["id"],
        title=f"{project['name']} Feedback",
        description="Share your thoughts, suggestions, or issues with our team.",
        fields=starter_fields,
        template="general"
    )
    return ProjectOut(**project)


@app.get("/api/projects/{project_id}", response_model=ProjectOut)
def get_single_project(project_id: str) -> ProjectOut:
    project = get_project(project_id)
    if not project:
        raise _http_error(404, "project_not_found", "Project not found.")
    return ProjectOut(**project)


# --- Form Builder & Management ---
@app.get("/api/projects/{project_id}/forms", response_model=List[FormOut])
def get_project_forms(project_id: str) -> List[FormOut]:
    forms = list_forms(project_id)
    return [FormOut(**f) for f in forms]


@app.post("/api/projects/{project_id}/forms", response_model=FormOut)
def create_project_form(project_id: str, payload: FormCreate) -> FormOut:
    project = get_project(project_id)
    if not project:
        raise _http_error(404, "project_not_found", "Project not found.")
    fields_list = [f.model_dump() for f in payload.fields]
    form = create_form(
        project_id=project_id,
        title=payload.title,
        description=payload.description or "",
        fields=fields_list,
        accent_color=payload.accent_color,
        submit_text=payload.submit_text,
        success_message=payload.success_message,
        template=payload.template,
    )
    return FormOut(**form)


@app.get("/api/forms/{form_id}", response_model=FormOut)
def get_single_form(form_id: str) -> FormOut:
    form = get_form(form_id)
    if not form:
        raise _http_error(404, "form_not_found", "Form not found.")
    return FormOut(**form)


@app.put("/api/forms/{form_id}", response_model=FormOut)
def update_existing_form(form_id: str, payload: FormUpdate) -> FormOut:
    update_data = payload.model_dump(exclude_unset=True)
    if "fields" in update_data and update_data["fields"] is not None:
        update_data["fields"] = [f.model_dump() if hasattr(f, "model_dump") else f for f in payload.fields or []]
    updated = update_form(form_id, **update_data)
    if not updated:
        raise _http_error(404, "form_not_found", "Form not found.")
    return FormOut(**updated)


@app.post("/api/forms/{form_id}/publish", response_model=FormOut)
def publish_form(form_id: str) -> FormOut:
    form = get_form(form_id)
    if not form:
        raise _http_error(404, "form_not_found", "Form not found.")
    new_status = "draft" if form["status"] == "published" else "published"
    updated = update_form(form_id, status=new_status)
    return FormOut(**updated)  # type: ignore


# --- Submissions & Project Feedback ---
@app.get("/api/projects/{project_id}/submissions", response_model=List[SubmissionOut])
def get_project_submissions(project_id: str) -> List[SubmissionOut]:
    submissions = list_submissions(project_id)
    return [SubmissionOut(**s) for s in submissions]


@app.post("/api/projects/{project_id}/submissions", response_model=SubmissionOut)
def add_project_submission(project_id: str, payload: FeedbackIn) -> SubmissionOut:
    project = get_project(project_id)
    if not project:
        raise _http_error(404, "project_not_found", "Project not found.")

    sub = insert_submission(
        project_id=project_id,
        text=payload.text.strip(),
        rating=payload.rating,
        source=payload.source or "manual",
        created_at=payload.date or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )
    # Analyze immediately
    rule_res = analyze_text_rules(payload.text, rating=payload.rating)
    update_submission_analysis(
        submission_id=sub["id"],
        sentiment=rule_res["sentiment"],
        category=rule_res["category"],
        issue_key=rule_res["issue_key"],
        severity=rule_res["severity"],
        confidence=rule_res["confidence"],
        analysis_reason=rule_res["analysis_reason"],
        suggested_action=rule_res["suggested_action"],
        analysis_mode=rule_res["analysis_mode"],
    )
    # Refresh
    updated_subs = [s for s in list_submissions(project_id) if s["id"] == sub["id"]]
    return SubmissionOut(**updated_subs[0])


@app.post("/api/projects/{project_id}/analyze")
def trigger_project_analysis(project_id: str) -> dict[str, Any]:
    project = get_project(project_id)
    if not project:
        raise _http_error(404, "project_not_found", "Project not found.")

    all_subs = list_submissions(project_id)
    unanalyzed = [s for s in all_subs if s["analysis_status"] == "pending" or s["analysis_mode"] == "unclassified"]

    settings = get_settings()
    processed_count = 0
    mode = "demo-rules"

    for sub in unanalyzed:
        if settings.gemini_configured:
            try:
                sanitized_text = redact_text(sub["text"])
                feedback_in = FeedbackIn(id=sub["id"], text=sanitized_text, source=sub["source"], rating=sub["rating"])
                results, _, _ = analyze_with_gemini([feedback_in], api_key=settings.gemini_api_key, model=settings.gemini_model)
                if results:
                    res = results[0]
                    update_submission_analysis(
                        submission_id=sub["id"],
                        sentiment=res.sentiment,
                        category=res.category,
                        issue_key=res.issue_key,
                        severity=res.severity,
                        confidence=res.confidence,
                        analysis_reason=res.explanation,
                        suggested_action=res.suggested_action,
                        analysis_mode="live-ai",
                    )
                    processed_count += 1
                    mode = "live-ai"
                    continue
            except Exception:
                pass

        rule_res = analyze_text_rules(sub["text"], rating=sub.get("rating"))
        update_submission_analysis(
            submission_id=sub["id"],
            sentiment=rule_res["sentiment"],
            category=rule_res["category"],
            issue_key=rule_res["issue_key"],
            severity=rule_res["severity"],
            confidence=rule_res["confidence"],
            analysis_reason=rule_res["analysis_reason"],
            suggested_action=rule_res["suggested_action"],
            analysis_mode=rule_res["analysis_mode"],
        )
        processed_count += 1

    return {"ok": True, "analyzed_count": processed_count, "mode": mode}


# --- Action Management ---
@app.get("/api/projects/{project_id}/actions", response_model=List[ActionOut])
def get_project_actions(project_id: str) -> List[ActionOut]:
    actions = list_actions(project_id)
    return [ActionOut(**a) for a in actions]


@app.post("/api/projects/{project_id}/actions", response_model=ActionOut)
def create_project_action(project_id: str, payload: ActionCreate) -> ActionOut:
    project = get_project(project_id)
    if not project:
        raise _http_error(404, "project_not_found", "Project not found.")

    act = create_action(
        project_id=project_id,
        issue_key=payload.issue_key,
        title=payload.title,
        proposed_fix=payload.proposed_fix,
        assignee=payload.assignee,
        due_date=payload.due_date,
        notes=payload.notes,
        status=payload.status,
    )
    return ActionOut(**act)


@app.patch("/api/actions/{action_id}", response_model=ActionOut)
def update_single_action(action_id: str, payload: ActionUpdate) -> ActionOut:
    update_data = payload.model_dump(exclude_unset=True)
    updated = update_action(action_id, **update_data)
    if not updated:
        raise _http_error(404, "action_not_found", "Action item not found.")
    return ActionOut(**updated)


# --- Legacy / Generic AI Analysis Endpoint (Preserved for tests & batching) ---
@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    settings = get_settings()
    if len(payload.items) > settings.max_analysis_rows:
        raise _http_error(
            413,
            "too_many_rows",
            f"Analysis is limited to {settings.max_analysis_rows} records per request.",
        )
    if not settings.gemini_configured:
        raise _http_error(
            503,
            "missing_gemini_key",
            "Live AI analysis is not configured. Use the labelled demo analysis fallback.",
        )

    sanitized: list[FeedbackIn] = []
    for item in payload.items:
        sanitized.append(item.model_copy(update={"text": redact_text(item.text)}))

    try:
        results, failed, model = analyze_with_gemini(
            sanitized,
            api_key=settings.gemini_api_key,
            model=settings.gemini_model,
        )
    except GeminiAnalysisError as exc:
        status = 504 if exc.code == "provider_timeout" else 502
        if exc.code == "provider_rate_limit":
            status = 429
        raise _http_error(status, exc.code, exc.message) from exc

    warning = None
    if failed:
        warning = f"{len(failed)} record(s) could not be classified from the model response."
    return AnalyzeResponse(results=results, failed_ids=failed, model=model, warning=warning)


# --- Adaption Endpoints (Preserved for Adaptive Data Lab) ---
@app.post("/api/adaption/estimate", response_model=AdaptionEstimateResponse)
def adaption_estimate(payload: AdaptionEstimateRequest) -> AdaptionEstimateResponse:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _http_error(
            503,
            "missing_adaption_key",
            "Adaption is not configured. Set ADAPTION_API_KEY on the backend to enable Adaptive Data.",
        )
    try:
        job = create_estimate(payload.examples, settings.adaption_api_key, payload.max_rows)
    except AdaptionServiceError as exc:
        raise _http_error(exc.status_code, exc.code, exc.message) from exc
    return AdaptionEstimateResponse(
        job_id=job.job_id,
        dataset_id=job.dataset_id,
        status=job.status,
        estimated_credits_consumed=job.estimated_credits_consumed,
        estimated_minutes=job.estimated_minutes,
        row_count=job.row_count,
        warning="This estimate came from Adaption. Starting a run may consume account credits.",
    )


@app.post("/api/adaption/run", response_model=AdaptionRunResponse)
def adaption_run(payload: AdaptionRunRequest) -> AdaptionRunResponse:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _http_error(503, "missing_adaption_key", "Adaption is not configured.")
    try:
        job = start_run(payload.job_id, payload.confirm, settings.adaption_api_key)
    except AdaptionServiceError as exc:
        raise _http_error(exc.status_code, exc.code, exc.message) from exc
    return AdaptionRunResponse(
        job_id=job.job_id,
        dataset_id=job.dataset_id,
        run_id=job.run_id,
        status=job.status,
    )


@app.get("/api/adaption/jobs/{job_id}", response_model=AdaptionJobStatus)
def adaption_job(job_id: str) -> AdaptionJobStatus:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _http_error(503, "missing_adaption_key", "Adaption is not configured.")
    try:
        job = refresh_job(job_id, settings.adaption_api_key)
    except AdaptionServiceError as exc:
        raise _http_error(exc.status_code, exc.code, exc.message) from exc
    download_ready = job.status in {"succeeded", "ready"}
    return AdaptionJobStatus(
        job_id=job.job_id,
        dataset_id=job.dataset_id,
        run_id=job.run_id,
        status=job.status,
        phase=job.phase,
        row_count=job.row_count,
        progress_percent=job.progress_percent,
        processed_rows=job.processed_rows,
        total_rows=job.total_rows,
        estimated_credits_consumed=job.estimated_credits_consumed,
        estimated_minutes=job.estimated_minutes,
        download_ready=download_ready,
        error=job.error,
        note="Adapted output is training data. SignalIQ does not use it for live classification unless separately evaluated and wired in.",
    )


@app.get("/api/adaption/jobs/{job_id}/download")
def adaption_download(job_id: str) -> Response:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _http_error(503, "missing_adaption_key", "Adaption is not configured.")
    try:
        content = download_job(job_id, settings.adaption_api_key)
    except AdaptionServiceError as exc:
        raise _http_error(exc.status_code, exc.code, exc.message) from exc
    return Response(
        content=content,
        media_type="application/jsonl",
        headers={"Content-Disposition": f'attachment; filename="signaliq-adapted-{job_id}.jsonl"'},
    )


# --- SPA Static Asset Serving in Production ---
FRONTEND_DIST = ROOT / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets = FRONTEND_DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str) -> FileResponse:
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")


def run() -> None:
    import uvicorn

    settings = get_settings()
    port = int(os.environ.get("PORT", settings.port))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port)


if __name__ == "__main__":
    run()
