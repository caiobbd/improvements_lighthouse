from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from backend.app.api.charts import get_custom_alarms_store
from backend.app.services.custom_alarms_store import CustomAlarmsStore


def _db_path() -> Path:
    root = Path(".test-temp")
    root.mkdir(parents=True, exist_ok=True)
    return root / f"custom_alarms_{uuid4().hex}.db"


def _override_store(client) -> CustomAlarmsStore:
    store = CustomAlarmsStore(_db_path())
    client.app.dependency_overrides[get_custom_alarms_store] = lambda: store
    return store


def test_put_and_get_custom_alarm(client) -> None:
    _override_store(client)

    put_response = client.put(
        "/api/v1/charts/custom-alarms/attr-1",
        json={"custom_hi": 90, "custom_lo": 15},
    )
    assert put_response.status_code == 200
    assert put_response.json()["version_n"] == 1

    get_response = client.get("/api/v1/charts/custom-alarms/attr-1")
    assert get_response.status_code == 200
    body = get_response.json()
    assert body["attribute_id"] == "attr-1"
    assert body["custom_hi"] == 90.0
    assert body["custom_lo"] == 15.0
    assert body["user"] == "unknown"
    client.app.dependency_overrides.clear()


def test_put_increments_version_and_versions_endpoint_is_newest_first(client) -> None:
    _override_store(client)

    for index in range(22):
        response = client.put(
            "/api/v1/charts/custom-alarms/attr-2",
            json={"custom_hi": 100 + index, "custom_lo": 10 + index},
        )
        assert response.status_code == 200

    current_response = client.get("/api/v1/charts/custom-alarms/attr-2")
    assert current_response.status_code == 200
    assert current_response.json()["version_n"] == 22

    versions_response = client.get("/api/v1/charts/custom-alarms/attr-2/versions")
    assert versions_response.status_code == 200
    versions = versions_response.json()["versions"]
    assert len(versions) == 20
    assert versions[0]["version_n"] == 22
    assert versions[-1]["version_n"] == 3
    client.app.dependency_overrides.clear()
