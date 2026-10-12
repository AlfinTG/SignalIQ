from fastapi.testclient import TestClient
from uuid import uuid4


def test_adaption_estimate_requires_authentication(client: TestClient) -> None:
    response = client.post("/api/adaption/estimate", json={"examples": [], "max_rows": 3})
    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "authentication_required"


def test_adaption_run_and_download_require_authentication(client: TestClient) -> None:
    job_id = uuid4()
    run = client.post(f"/api/adaption/jobs/{job_id}/run", json={"confirm": True})
    download = client.get(f"/api/adaption/jobs/{job_id}/download")
    assert run.status_code == 401
    assert download.status_code == 401
