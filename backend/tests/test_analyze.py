from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.gemini_client import GeminiAnalysisError, parse_model_payload
from backend.redaction import redact_text


def test_redaction_strips_email_and_phone() -> None:
    text = "Call me at +1 (415) 555-0199 or hello@example.com about card 4111 1111 1111 1111"
    redacted = redact_text(text)
    assert "hello@example.com" not in redacted
    assert "555-0199" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "[REDACTED_NUMBER]" in redacted


def test_parse_model_payload_rejects_unknown_ids() -> None:
    raw = '{"results":[{"id":"a","sentiment":"negative","category":"Payments","issue_key":"checkout-fail","summary":"Pay failed","severity":"high","explanation":"Checkout failed","suggested_action":"Inspect gateway"}]}'
    results, failed = parse_model_payload(raw, {"a", "b"})
    assert len(results) == 1
    assert failed == ["b"]


def test_parse_model_payload_rejects_invalid_json() -> None:
    try:
        parse_model_payload("not-json", {"a"})
        raise AssertionError("expected error")
    except GeminiAnalysisError as exc:
        assert exc.code == "invalid_model_json"


def test_analyze_rejects_empty_payload(client: TestClient) -> None:
    response = client.post("/api/analyze", json={"items": []})
    assert response.status_code == 422


def test_analyze_rejects_duplicate_ids(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.post(
        "/api/analyze",
        json={
            "items": [
                {"id": "1", "text": "hello"},
                {"id": "1", "text": "again"},
            ]
        },
    )
    assert response.status_code == 422


def test_analyze_missing_key(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.post("/api/analyze", json={"items": [{"id": "1", "text": "checkout failed"}]})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "missing_gemini_key"


def test_analyze_provider_failure(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "present")
    from backend.config import get_settings

    get_settings.cache_clear()

    def boom(*_args, **_kwargs):
        raise GeminiAnalysisError("provider_error", "Gemini could not complete analysis.")

    monkeypatch.setattr("backend.main.analyze_with_gemini", boom)
    response = client.post("/api/analyze", json={"items": [{"id": "1", "text": "late delivery"}]})
    assert response.status_code == 502
    assert response.json()["detail"]["code"] == "provider_error"


def test_analyze_success_maps_ids(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "present")
    from backend.config import get_settings
    from backend.schemas import AnalysisItem

    get_settings.cache_clear()

    def fake(*_args, **_kwargs):
        item = AnalysisItem(
            id="1",
            sentiment="negative",
            category="Delivery",
            issue_key="late-delivery",
            summary="Package arrived late",
            severity="medium",
            confidence=0.8,
            explanation="Customer reported a delayed parcel.",
            suggested_action="Review carrier SLA for this route.",
        )
        return [item], [], "gemini-2.5-flash"

    monkeypatch.setattr("backend.main.analyze_with_gemini", fake)
    monkeypatch.setattr("backend.main.redact_text", lambda text: text)
    response = client.post("/api/analyze", json={"items": [{"id": "1", "text": "My parcel is late"}]})
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "live-ai"
    assert body["results"][0]["id"] == "1"


def test_analyze_too_many_rows(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "present")
    monkeypatch.setenv("MAX_ANALYSIS_ROWS", "2")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.post(
        "/api/analyze",
        json={"items": [{"id": str(i), "text": "x"} for i in range(3)]},
    )
    assert response.status_code == 413
