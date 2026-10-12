from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import UUID, uuid4

from fastapi.testclient import TestClient

from backend import private_api
from backend.auth import Principal, get_current_principal
from backend.main import app


def _row(record_id: UUID, workspace_id: UUID) -> dict[str, object]:
    now = datetime.now(UTC)
    return {"id": record_id, "workspace_id": workspace_id, "text": "Checkout was slow", "source": "manual", "source_reference": None, "submitted_at": now, "rating": 2.0, "sentiment": "unclassified", "category": None, "issue_key": None, "severity": None, "confidence": None, "analysis_explanation": None, "suggested_action": None, "analysis_mode": "unclassified", "analyzed_at": None, "is_sample": False, "created_at": now, "updated_at": now}


def test_private_routes_require_a_bearer_token(client: TestClient) -> None:
    response = client.get("/api/feedback")
    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "authentication_required"


def test_feedback_cannot_cross_workspace_boundary(client: TestClient, monkeypatch) -> None:
    user_a, user_b = str(uuid4()), str(uuid4())
    workspace_a, workspace_b, protected_id = uuid4(), uuid4(), uuid4()
    calls: list[UUID] = []

    def fake_workspace(user_id: str) -> dict[str, object]:
        now = datetime.now(UTC)
        return {"id": workspace_a if user_id == user_a else workspace_b, "name": "Private", "created_at": now, "updated_at": now}

    def fake_update(workspace_id: UUID, record_id: UUID, values: dict[str, object]):
        calls.append(workspace_id)
        return _row(record_id, workspace_id) if workspace_id == workspace_a and record_id == protected_id else None

    monkeypatch.setattr(private_api, "ensure_workspace", fake_workspace)
    monkeypatch.setattr(private_api, "update_feedback", fake_update)
    app.dependency_overrides[get_current_principal] = lambda: Principal(user_id=user_b, email="b@example.test")
    try:
        denied = client.patch(f"/api/feedback/{protected_id}", json={"sentiment": "negative"})
        assert denied.status_code == 404
        assert calls == [workspace_b]
        app.dependency_overrides[get_current_principal] = lambda: Principal(user_id=user_a, email="a@example.test")
        allowed = client.patch(f"/api/feedback/{protected_id}", json={"sentiment": "negative"})
        assert allowed.status_code == 200
        assert calls[-1] == workspace_a
    finally:
        app.dependency_overrides.clear()


def test_live_analysis_never_silently_falls_back_to_demo_rules(client: TestClient, monkeypatch) -> None:
    user_id, workspace_id, record_id = str(uuid4()), uuid4(), uuid4()
    now = datetime.now(UTC)
    monkeypatch.setattr(private_api, "ensure_workspace", lambda _: {"id": workspace_id, "name": "Private", "created_at": now, "updated_at": now})
    monkeypatch.setattr(private_api, "feedback_by_ids", lambda *_: [_row(record_id, workspace_id)])
    monkeypatch.setattr(private_api, "get_settings", lambda: SimpleNamespace(gemini_configured=False))
    app.dependency_overrides[get_current_principal] = lambda: Principal(user_id=user_id, email="owner@example.test")
    try:
        response = client.post("/api/feedback/analyze", json={"record_ids": [str(record_id)], "mode": "live-ai"})
        assert response.status_code == 503
        assert response.json()["detail"]["error"]["code"] == "missing_gemini_key"
    finally:
        app.dependency_overrides.clear()
