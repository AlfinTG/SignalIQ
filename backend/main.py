from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from backend.adaption_service import (
    AdaptionServiceError,
    create_estimate,
    download_job,
    refresh_job,
    start_run,
)
from backend.config import get_settings
from backend.gemini_client import GeminiAnalysisError, analyze_with_gemini
from backend.redaction import redact_text
from backend.schemas import (
    AdaptionEstimateRequest,
    AdaptionEstimateResponse,
    AdaptionJobStatus,
    AdaptionRunRequest,
    AdaptionRunResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    ErrorBody,
    FeedbackIn,
)

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

app = FastAPI(title="SignalIQ", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _http_error(status: int, code: str, error: str, detail: str | None = None) -> HTTPException:
    return HTTPException(status_code=status, detail=ErrorBody(error=error, code=code, detail=detail).model_dump())


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
