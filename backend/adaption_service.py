from __future__ import annotations

import csv
import io
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from backend.schemas import AdaptionExample

COLUMN_MAPPING = {
    "prompt": "instruction",
    "completion": "output",
    "context": ["input"],
}

DOWNLOADABLE_STATUSES = {"succeeded", "ready"}
FAILED_STATUSES = {"failed"}


class AdaptionServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


@dataclass
class AdaptionJob:
    job_id: str
    dataset_id: str
    run_id: str | None = None
    phase: str = "estimated"
    status: str = "awaiting_input"
    row_count: int | None = None
    estimated_credits_consumed: float | None = None
    estimated_minutes: float | None = None
    progress_percent: int | None = None
    processed_rows: int | None = None
    total_rows: int | None = None
    error: str | None = None
    max_rows: int = 40
    examples_count: int = 0
    created_at: float = field(default_factory=time.time)
    downloaded_preview: str | None = None


_jobs: dict[str, AdaptionJob] = {}
_lock = threading.Lock()


def _client_factory(api_key: str) -> Any:
    from adaption import Adaption

    return Adaption(api_key=api_key)


def examples_to_csv(examples: list[AdaptionExample]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["instruction", "input", "output"])
    writer.writeheader()
    for example in examples:
        writer.writerow(
            {
                "instruction": example.instruction.replace("\x00", ""),
                "input": example.input.replace("\x00", ""),
                "output": example.output.replace("\x00", ""),
            }
        )
    return buffer.getvalue()


def _poll_until_ingested(client: Any, dataset_id: str, timeout_seconds: int = 90) -> Any:
    deadline = time.time() + timeout_seconds
    last = None
    while time.time() < deadline:
        last = client.datasets.get_status(dataset_id)
        status = getattr(last, "status", None)
        if status == "failed":
            err = getattr(last, "error_data", None)
            message = getattr(err, "message", None) if err is not None else None
            raise AdaptionServiceError("adaption_ingest_failed", message or "Dataset import failed.", 502)
        if getattr(last, "row_count", None) is not None:
            return last
        if status in {"awaiting_input", "succeeded", "ready"}:
            return last
        time.sleep(2)
    raise AdaptionServiceError("adaption_timeout", "Timed out waiting for Adaption dataset ingestion.", 504)


def create_estimate(
    examples: list[AdaptionExample],
    api_key: str,
    max_rows: int,
    client_factory=_client_factory,
) -> AdaptionJob:
    csv_text = examples_to_csv(examples)
    tmp_dir = Path(tempfile.mkdtemp(prefix="signaliq-adaption-"))
    tmp_path = tmp_dir / "signaliq-feedback-task.csv"
    try:
        tmp_path.write_text(csv_text, encoding="utf-8")
        client = client_factory(api_key)
        uploaded = client.datasets.upload_file(str(tmp_path))
        dataset_id = getattr(uploaded, "dataset_id", None)
        if not dataset_id:
            raise AdaptionServiceError("adaption_upload_failed", "Adaption did not return a dataset_id.", 502)

        ingested = _poll_until_ingested(client, dataset_id)
        estimate = client.datasets.adapt(
            dataset_id,
            column_mapping=COLUMN_MAPPING,
            job_specification={"max_rows": max_rows},
            estimate=True,
        )
        job = AdaptionJob(
            job_id=str(uuid.uuid4()),
            dataset_id=str(dataset_id),
            phase="estimated",
            status=str(getattr(ingested, "status", "awaiting_input")),
            row_count=getattr(ingested, "row_count", len(examples)),
            estimated_credits_consumed=_as_float(getattr(estimate, "estimated_credits_consumed", None)),
            estimated_minutes=_as_float(getattr(estimate, "estimated_minutes", None)),
            max_rows=max_rows,
            examples_count=len(examples),
        )
        with _lock:
            _jobs[job.job_id] = job
        return job
    except AdaptionServiceError:
        raise
    except Exception as exc:
        mapped = _map_sdk_error(exc)
        raise mapped from exc
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
            tmp_dir.rmdir()
        except OSError:
            pass


def start_run(job_id: str, confirm: bool, api_key: str, client_factory=_client_factory) -> AdaptionJob:
    if not confirm:
        raise AdaptionServiceError(
            "confirmation_required",
            "A separate confirmation is required before starting an Adaption run that may consume credits.",
            400,
        )
    job = get_job(job_id)
    try:
        client = client_factory(api_key)
        run = client.datasets.adapt(
            job.dataset_id,
            column_mapping=COLUMN_MAPPING,
            job_specification={"max_rows": job.max_rows},
        )
        job.run_id = getattr(run, "run_id", None)
        job.phase = "running"
        job.status = "running"
        job.error = None
        with _lock:
            _jobs[job.job_id] = job
        return job
    except AdaptionServiceError:
        raise
    except Exception as exc:
        mapped = _map_sdk_error(exc)
        raise mapped from exc


def refresh_job(job_id: str, api_key: str, client_factory=_client_factory) -> AdaptionJob:
    job = get_job(job_id)
    try:
        client = client_factory(api_key)
        status = client.datasets.get_status(job.dataset_id)
        job.status = str(getattr(status, "status", job.status))
        job.row_count = getattr(status, "row_count", job.row_count)
        progress = getattr(status, "progress", None)
        if progress is not None:
            job.progress_percent = getattr(progress, "percent", None)
            job.processed_rows = getattr(progress, "processed_rows", None)
            job.total_rows = getattr(progress, "total_rows", None)
        if job.status in FAILED_STATUSES:
            err = getattr(status, "error_data", None)
            job.error = getattr(err, "message", None) if err is not None else "Adaption reported a failed status."
            job.phase = "failed"
        elif job.status in DOWNLOADABLE_STATUSES:
            job.phase = "succeeded"
            job.error = None
        elif job.status == "running":
            job.phase = "running"
        with _lock:
            _jobs[job.job_id] = job
        return job
    except AdaptionServiceError:
        raise
    except Exception as exc:
        mapped = _map_sdk_error(exc)
        raise mapped from exc


def download_job(job_id: str, api_key: str, client_factory=_client_factory) -> bytes:
    job = refresh_job(job_id, api_key, client_factory=client_factory)
    # Official docs: succeeded datasets contain full output; failed datasets may
    # still contain rows processed before the run stopped. 422/409 if no run started.
    if job.status not in DOWNLOADABLE_STATUSES | FAILED_STATUSES:
        raise AdaptionServiceError(
            "output_not_ready",
            "Adapted output is not available yet. Poll status until succeeded.",
            409,
        )
    try:
        client = client_factory(api_key)
        response = client.datasets.download(job.dataset_id, file_format="jsonl")
        if hasattr(response, "read"):
            content = response.read()
        elif hasattr(response, "text") and callable(response.text):
            content = response.text().encode("utf-8")
        elif isinstance(response, (bytes, bytearray)):
            content = bytes(response)
        else:
            content = str(response).encode("utf-8")
        return content
    except AdaptionServiceError:
        raise
    except Exception as exc:
        mapped = _map_sdk_error(exc)
        raise mapped from exc


def get_job(job_id: str) -> AdaptionJob:
    with _lock:
        job = _jobs.get(job_id)
    if job is None:
        raise AdaptionServiceError("job_not_found", "Unknown Adaption job. Jobs are lost if the server restarts.", 404)
    return job


def reset_jobs() -> None:
    with _lock:
        _jobs.clear()


def _as_float(value: object) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _map_sdk_error(exc: Exception) -> AdaptionServiceError:
    name = exc.__class__.__name__
    message = str(exc)
    lower = message.lower()
    if "timeout" in lower or name.endswith("Timeout"):
        return AdaptionServiceError("adaption_timeout", "The Adaption request timed out.", 504)
    if "429" in message or "rate" in lower:
        return AdaptionServiceError("adaption_rate_limit", "Adaption rate-limited the request.", 429)
    if "401" in message or "auth" in lower:
        return AdaptionServiceError("adaption_auth", "Adaption rejected the API key.", 401)
    return AdaptionServiceError("adaption_error", "Adaption could not complete the requested operation.", 502)
