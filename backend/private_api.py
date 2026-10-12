from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response

from backend.auth import Principal, get_current_principal
from backend.persistence import (
    PersistenceUnavailable,
    create_feedback,
    delete_feedback,
    ensure_workspace,
    list_feedback,
    list_issue_states,
    update_feedback,
    upsert_issue_state,
    feedback_by_ids,
    save_analysis,
    create_feedback_batch,
    create_verified_example,
    list_training_examples,
    verified_training_examples,
    create_adaption_job,
    get_adaption_job,
    update_adaption_job,
)
from backend.private_schemas import FeedbackCreate, FeedbackOut, FeedbackPage, FeedbackUpdate, IssueOut, IssueUpdate, MeOut, WorkspaceOut, PersistentAnalyzeRequest, PersistentAnalyzeResponse, FeedbackImportRequest, FeedbackImportResponse, TrainingExampleCreate, TrainingExampleOut, AdaptionEstimateRequest, AdaptionRunRequest, AdaptionJobOut
from backend.config import get_settings
from backend.demo_analysis import analyze_text_rules
from backend.gemini_client import GeminiAnalysisError, analyze_with_gemini
from backend.redaction import redact_text
from backend.schemas import FeedbackIn
from backend.schemas import AdaptionExample
from backend.adaption_service import AdaptionServiceError, create_estimate, start_persisted_run, refresh_persisted_job, download_persisted_job

router = APIRouter(prefix="/api", tags=["private"])
PrincipalDep = Annotated[Principal, Depends(get_current_principal)]


def _error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": {"code": code, "message": message}})


def _workspace(principal: Principal) -> WorkspaceOut:
    try:
        return WorkspaceOut.model_validate(ensure_workspace(principal.user_id))
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc


@router.get("/me", response_model=MeOut)
def me(principal: PrincipalDep) -> MeOut:
    workspace = _workspace(principal)
    return MeOut(user_id=UUID(principal.user_id), email=principal.email, workspace=workspace)


@router.get("/workspace", response_model=WorkspaceOut)
def workspace(principal: PrincipalDep) -> WorkspaceOut:
    return _workspace(principal)


@router.get("/feedback", response_model=FeedbackPage)
def feedback_list(
    principal: PrincipalDep,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0, le=10000),
    sentiment: str | None = Query(default=None, pattern="^(positive|neutral|negative|unclassified)$"),
    q: str | None = Query(default=None, min_length=1, max_length=120),
) -> FeedbackPage:
    workspace_value = _workspace(principal)
    try:
        rows, total = list_feedback(workspace_value.id, limit=limit, offset=offset, sentiment=sentiment, query=q)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    return FeedbackPage(items=[FeedbackOut.model_validate(row) for row in rows], total=total, limit=limit, offset=offset)


@router.post("/feedback", response_model=FeedbackOut, status_code=201)
def feedback_create(payload: FeedbackCreate, principal: PrincipalDep) -> FeedbackOut:
    workspace_value = _workspace(principal)
    try:
        return FeedbackOut.model_validate(create_feedback(workspace_value.id, payload.model_dump()))
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc


@router.post("/feedback/import", response_model=FeedbackImportResponse, status_code=201)
def feedback_import(payload: FeedbackImportRequest, principal: PrincipalDep) -> FeedbackImportResponse:
    workspace_value = _workspace(principal)
    try:
        rows = create_feedback_batch(workspace_value.id, [record.model_dump() for record in payload.records])
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    records = [FeedbackOut.model_validate(row) for row in rows]
    return FeedbackImportResponse(accepted=len(records), records=records)


@router.get("/training-examples", response_model=list[TrainingExampleOut])
def training_examples_list(principal: PrincipalDep) -> list[TrainingExampleOut]:
    workspace_value = _workspace(principal)
    try:
        return [TrainingExampleOut.model_validate(row) for row in list_training_examples(workspace_value.id)]
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc


@router.post("/training-examples", response_model=TrainingExampleOut, status_code=201)
def training_example_verify(payload: TrainingExampleCreate, principal: PrincipalDep) -> TrainingExampleOut:
    workspace_value = _workspace(principal)
    try:
        row = create_verified_example(workspace_value.id, principal.user_id, payload.model_dump())
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    if row is None:
        raise _error(404, "feedback_not_found", "Feedback was not found.")
    return TrainingExampleOut.model_validate(row)


@router.post("/adaption/estimate", response_model=AdaptionJobOut, status_code=201)
def adaption_estimate(payload: AdaptionEstimateRequest, principal: PrincipalDep) -> AdaptionJobOut:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _error(503, "missing_adaption_key", "Adaption is not configured for this environment.")
    workspace_value = _workspace(principal)
    try:
        rows = verified_training_examples(workspace_value.id, payload.max_rows)
        if len(rows) < 3:
            raise _error(422, "insufficient_verified_examples", "At least three explicitly verified examples are required.")
        examples = [AdaptionExample(instruction=row["instruction"], input=row["input_text"], output=row["target_output"]) for row in rows]
        estimate = create_estimate(examples, settings.adaption_api_key, payload.max_rows)
        job = create_adaption_job(workspace_value.id, principal.user_id, dataset_id=estimate.dataset_id, status=estimate.status, phase="estimated", selected_count=len(examples), row_cap=payload.max_rows, credits=estimate.estimated_credits_consumed, minutes=estimate.estimated_minutes)
        return AdaptionJobOut.model_validate(job)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    except AdaptionServiceError as exc:
        raise _error(exc.status_code, exc.code, exc.message) from exc


@router.post("/adaption/jobs/{job_id:uuid}/run", response_model=AdaptionJobOut)
def adaption_run(job_id: UUID, payload: AdaptionRunRequest, principal: PrincipalDep) -> AdaptionJobOut:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _error(503, "missing_adaption_key", "Adaption is not configured for this environment.")
    workspace_value = _workspace(principal)
    try:
        job = get_adaption_job(workspace_value.id, job_id)
        if job is None:
            raise _error(404, "adaption_job_not_found", "Adaption job was not found.")
        if job["phase"] != "estimated" or not job["dataset_id"]:
            raise _error(409, "adaption_job_not_runnable", "Only a current estimate can be started.")
        run_id, status = start_persisted_run(job["dataset_id"], job["requested_row_cap"] or 40, settings.adaption_api_key)
        row = update_adaption_job(workspace_value.id, job_id, status=status, phase="running", run_id=run_id)
        return AdaptionJobOut.model_validate(row)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    except AdaptionServiceError as exc:
        raise _error(exc.status_code, exc.code, exc.message) from exc


@router.get("/adaption/jobs/{job_id:uuid}", response_model=AdaptionJobOut)
def adaption_status(job_id: UUID, principal: PrincipalDep) -> AdaptionJobOut:
    settings = get_settings()
    workspace_value = _workspace(principal)
    try:
        job = get_adaption_job(workspace_value.id, job_id)
        if job is None:
            raise _error(404, "adaption_job_not_found", "Adaption job was not found.")
        if not settings.adaption_configured or not job["dataset_id"]:
            return AdaptionJobOut.model_validate(job)
        status, phase, error = refresh_persisted_job(job["dataset_id"], settings.adaption_api_key)
        row = update_adaption_job(workspace_value.id, job_id, status=status, phase=phase, error=error, finished=phase in {"failed", "succeeded"})
        return AdaptionJobOut.model_validate(row)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    except AdaptionServiceError as exc:
        raise _error(exc.status_code, exc.code, exc.message) from exc


@router.get("/adaption/jobs/{job_id:uuid}/download")
def adaption_download(job_id: UUID, principal: PrincipalDep) -> Response:
    settings = get_settings()
    if not settings.adaption_configured:
        raise _error(503, "missing_adaption_key", "Adaption is not configured for this environment.")
    workspace_value = _workspace(principal)
    try:
        job = get_adaption_job(workspace_value.id, job_id)
        if job is None:
            raise _error(404, "adaption_job_not_found", "Adaption job was not found.")
        if job["phase"] != "succeeded" or not job["dataset_id"]:
            raise _error(409, "output_not_ready", "Adapted output is not available yet.")
        content = download_persisted_job(job["dataset_id"], settings.adaption_api_key)
        return Response(content=content, media_type="application/jsonl", headers={"Content-Disposition": f'attachment; filename="signaliq-adaption-{job_id}.jsonl"'})
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    except AdaptionServiceError as exc:
        raise _error(exc.status_code, exc.code, exc.message) from exc


@router.patch("/feedback/{record_id:uuid}", response_model=FeedbackOut)
def feedback_update(record_id: UUID, payload: FeedbackUpdate, principal: PrincipalDep) -> FeedbackOut:
    workspace_value = _workspace(principal)
    try:
        row = update_feedback(workspace_value.id, record_id, payload.model_dump(exclude_unset=True))
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    if row is None:
        raise _error(404, "feedback_not_found", "Feedback was not found.")
    return FeedbackOut.model_validate(row)


@router.delete("/feedback/{record_id:uuid}", status_code=204)
def feedback_delete(record_id: UUID, principal: PrincipalDep) -> Response:
    workspace_value = _workspace(principal)
    try:
        deleted = delete_feedback(workspace_value.id, record_id)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    if not deleted:
        raise _error(404, "feedback_not_found", "Feedback was not found.")
    return Response(status_code=204)


@router.get("/issues", response_model=list[IssueOut])
def issues_list(principal: PrincipalDep) -> list[IssueOut]:
    workspace_value = _workspace(principal)
    try:
        return [IssueOut.model_validate(row) for row in list_issue_states(workspace_value.id)]
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc


@router.patch("/issues/{issue_key}", response_model=IssueOut)
def issue_update(issue_key: str, payload: IssueUpdate, principal: PrincipalDep) -> IssueOut:
    if not issue_key or len(issue_key) > 120 or any(char.isspace() for char in issue_key):
        raise _error(422, "validation_error", "Issue key must be a non-empty normalized key.")
    workspace_value = _workspace(principal)
    try:
        return IssueOut.model_validate(upsert_issue_state(workspace_value.id, issue_key, payload.status, payload.notes))
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc


@router.post("/feedback/analyze", response_model=PersistentAnalyzeResponse)
def feedback_analyze(payload: PersistentAnalyzeRequest, principal: PrincipalDep) -> PersistentAnalyzeResponse:
    workspace_value = _workspace(principal)
    try:
        records = feedback_by_ids(workspace_value.id, payload.record_ids)
    except PersistenceUnavailable as exc:
        raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
    found = {row["id"] for row in records}
    missing = [record_id for record_id in payload.record_ids if record_id not in found]
    if not records:
        raise _error(404, "feedback_not_found", "No selected feedback was found.")
    settings = get_settings()
    results: list[dict[str, object]] = []
    failed = list(missing)
    model: str | None = None
    if payload.mode == "demo-rules":
        for record in records:
            result = analyze_text_rules(str(record["text"]), rating=record.get("rating"))
            results.append({"id": record["id"], "sentiment": result["sentiment"], "category": result["category"], "issue_key": result["issue_key"], "severity": result["severity"], "confidence": result["confidence"], "explanation": result["analysis_reason"], "suggested_action": result["suggested_action"], "mode": "demo-rules", "model": None})
    else:
        if not settings.gemini_configured:
            raise _error(503, "missing_gemini_key", "Live Gemini analysis is not configured. Choose labelled demo analysis explicitly or configure Gemini.")
        inputs = [FeedbackIn(id=str(record["id"]), text=redact_text(str(record["text"])), source=str(record["source"]), rating=record.get("rating")) for record in records]
        try:
            response, provider_failed, model = analyze_with_gemini(inputs, settings.gemini_api_key, settings.gemini_model)
        except GeminiAnalysisError as exc:
            status = 429 if exc.code == "provider_rate_limit" else 504 if exc.code == "provider_timeout" else 502
            raise _error(status, exc.code, exc.message) from exc
        failed.extend(UUID(record_id) for record_id in provider_failed)
        results = [{"id": UUID(result.id), "sentiment": result.sentiment, "category": result.category, "issue_key": result.issue_key, "severity": result.severity, "confidence": result.confidence, "explanation": result.explanation, "suggested_action": result.suggested_action, "mode": "live-ai", "model": model} for result in response]
    updated: list[FeedbackOut] = []
    for result in results:
        try:
            row = save_analysis(workspace_value.id, result["id"], result)
        except PersistenceUnavailable as exc:
            raise _error(503, "persistence_not_configured", "Persistent storage is not configured for this environment.") from exc
        if row is not None:
            updated.append(FeedbackOut.model_validate(row))
    warning = f"{len(failed)} record(s) were not updated; existing analysis was preserved." if failed else None
    return PersistentAnalyzeResponse(mode=payload.mode, model=model, updated=updated, failed_ids=failed, warning=warning)
