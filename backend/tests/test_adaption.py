from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.adaption_service import AdaptionJob, AdaptionServiceError, examples_to_csv
from backend.schemas import AdaptionExample


def _examples() -> list[dict[str, str]]:
    return [
        {
            "instruction": "Classify this customer feedback.",
            "input": "Payment failed at checkout.",
            "output": '{"sentiment":"negative","category":"Payments"}',
        },
        {
            "instruction": "Classify this customer feedback.",
            "input": "Driver was late.",
            "output": '{"sentiment":"negative","category":"Delivery"}',
        },
        {
            "instruction": "Classify this customer feedback.",
            "input": "Love the quality.",
            "output": '{"sentiment":"positive","category":"Product quality"}',
        },
    ]


def test_examples_to_csv_has_expected_headers() -> None:
    examples = [AdaptionExample(**row) for row in _examples()]
    csv_text = examples_to_csv(examples)
    assert csv_text.splitlines()[0] == "instruction,input,output"
    assert "Payment failed" in csv_text


def test_estimate_missing_key(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ADAPTION_API_KEY", "")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.post("/api/adaption/estimate", json={"examples": _examples()})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "missing_adaption_key"


def test_run_requires_confirmation(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ADAPTION_API_KEY", "present")
    from backend import adaption_service
    from backend.config import get_settings

    get_settings.cache_clear()
    adaption_service._jobs["job-1"] = AdaptionJob(job_id="job-1", dataset_id="ds-1")
    response = client.post("/api/adaption/run", json={"job_id": "job-1", "confirm": False})
    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "confirmation_required"


def test_estimate_maps_sdk_failure(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ADAPTION_API_KEY", "present")
    from backend.config import get_settings

    get_settings.cache_clear()

    def boom(*_args, **_kwargs):
        raise AdaptionServiceError("adaption_error", "Adaption could not complete the requested operation.", 502)

    monkeypatch.setattr("backend.main.create_estimate", boom)
    response = client.post("/api/adaption/estimate", json={"examples": _examples()})
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "adaption_error"


def test_mocked_success_estimate_and_status(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ADAPTION_API_KEY", "present")
    from backend.config import get_settings
    from backend.adaption_service import AdaptionJob

    get_settings.cache_clear()

    fake_job = AdaptionJob(
        job_id="job-ok",
        dataset_id="ds-ok",
        status="awaiting_input",
        phase="estimated",
        row_count=3,
        estimated_credits_consumed=12.0,
        estimated_minutes=4.0,
    )

    monkeypatch.setattr("backend.main.create_estimate", lambda *args, **kwargs: fake_job)
    estimate = client.post("/api/adaption/estimate", json={"examples": _examples()})
    assert estimate.status_code == 200
    body = estimate.json()
    assert body["estimate"] is True
    assert body["estimated_credits_consumed"] == 12.0
    assert "job-ok" == body["job_id"]

    from backend import adaption_service

    adaption_service._jobs["job-ok"] = fake_job

    def refresh(job_id: str, api_key: str, client_factory=None):
        fake_job.status = "succeeded"
        fake_job.phase = "succeeded"
        return fake_job

    monkeypatch.setattr("backend.main.refresh_job", refresh)
    status = client.get("/api/adaption/jobs/job-ok")
    assert status.status_code == 200
    assert status.json()["download_ready"] is True
    assert status.json()["status"] == "succeeded"


def test_download_not_ready(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("ADAPTION_API_KEY", "present")
    from backend.config import get_settings
    from backend.adaption_service import AdaptionServiceError

    get_settings.cache_clear()

    def not_ready(*_args, **_kwargs):
        raise AdaptionServiceError("output_not_ready", "Adapted output is not available yet.", 409)

    monkeypatch.setattr("backend.main.download_job", not_ready)
    response = client.get("/api/adaption/jobs/missing/download")
    assert response.status_code == 409
