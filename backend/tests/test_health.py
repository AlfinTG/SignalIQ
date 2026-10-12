from fastapi.testclient import TestClient
from backend.config import Settings


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


def test_cors_origins_require_explicit_values() -> None:
    assert Settings(cors_origins="").cors_origin_list == []
    assert Settings().cors_origin_list == ["https://signal-iq-hazel.vercel.app"]
    assert Settings(cors_origins="https://app.example, http://localhost:5173/").cors_origin_list == [
        "https://app.example",
        "http://localhost:5173",
    ]


def test_cors_allows_only_the_deployed_frontend(client: TestClient) -> None:
    allowed = client.options(
        "/api/health",
        headers={
            "Origin": "https://signal-iq-hazel.vercel.app",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://signal-iq-hazel.vercel.app"

    blocked = client.options(
        "/api/health",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
    )
    assert blocked.status_code == 400
    assert "access-control-allow-origin" not in blocked.headers
