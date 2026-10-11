from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from backend import adaption_service
from backend.config import get_settings
from backend.main import app


@pytest.fixture(autouse=True)
def clear_settings_and_jobs() -> Generator[None, None, None]:
    get_settings.cache_clear()
    adaption_service.reset_jobs()
    yield
    get_settings.cache_clear()
    adaption_service.reset_jobs()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
