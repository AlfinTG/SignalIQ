import pytest
from fastapi.testclient import TestClient


def test_widget_js_served(client: TestClient) -> None:
    res = client.get("/widget.js")
    assert res.status_code == 200
    assert "signaliq" in res.text.lower() or "feedback" in res.text.lower()


def test_legacy_management_routes_are_retired(client: TestClient) -> None:
    res = client.get("/api/projects")
    assert res.status_code == 410
    assert res.json()["error"]["code"] == "legacy_route_retired"


def test_public_form_and_submission(client: TestClient) -> None:
    # 1. Fetch default form
    form_res = client.get("/api/public/forms/form-default")
    assert form_res.status_code == 200
    form_data = form_res.json()
    assert form_data["id"] == "form-default"
    assert form_data["status"] == "published"

    # 2. Submit public feedback
    submit_res = client.post(
        "/api/public/submit",
        json={
            "form_id": "form-default",
            "text": "The payment gateway timed out on the final checkout screen.",
            "rating": 1.0,
            "source": "widget",
            "custom_data": {"user_id": "usr-123", "browser": "Chrome"}
        }
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["ok"] is True
    assert "submission_id" in sub_data

    # Public submit acknowledgement does not grant access to private management data.
    private_read = client.get(f"/api/projects/{form_data['project_id']}/submissions")
    assert private_read.status_code == 410


def test_public_submission_rejects_wrong_origin_and_invalid_custom_data(client: TestClient) -> None:
    wrong_origin = client.post(
        "/api/public/submit",
        headers={"Origin": "https://untrusted.example"},
        json={"form_id": "form-default", "text": "This should not be accepted."},
    )
    assert wrong_origin.status_code == 403
    assert wrong_origin.json()["detail"]["code"] == "origin_not_allowed"

    invalid_custom_data = client.post(
        "/api/public/submit",
        json={"form_id": "form-default", "text": "This should not be accepted.", "custom_data": {"notes": "x" * 501}},
    )
    assert invalid_custom_data.status_code == 422


def test_legacy_adaption_routes_are_not_anonymous_management_routes(client: TestClient) -> None:
    response = client.post("/api/adaption/estimate", json={"max_rows": 3})
    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "authentication_required"
