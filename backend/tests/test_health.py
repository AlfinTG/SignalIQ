from fastapi.testclient import TestClient


def test_health_does_not_leak_keys(client: TestClient, monkeypatch) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "secret-gemini")
    monkeypatch.setenv("ADAPTION_API_KEY", "secret-adaption")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["service"] == "signaliq"
    assert body["gemini_configured"] is True
    assert body["adaption_configured"] is True
    dumped = response.text
    assert "secret-gemini" not in dumped
    assert "secret-adaption" not in dumped


def test_health_reports_missing_keys(client: TestClient, monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("ADAPTION_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "")
    monkeypatch.setenv("ADAPTION_API_KEY", "")
    from backend.config import get_settings

    get_settings.cache_clear()
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["gemini_configured"] is False
    assert body["adaption_configured"] is False
    assert body["gemini_model"] is None
