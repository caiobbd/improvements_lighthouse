from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from backend.app.services.custom_alarms_store import CustomAlarmsStore


def _db_path() -> Path:
    root = Path(".test-temp")
    root.mkdir(parents=True, exist_ok=True)
    return root / f"custom_alarms_{uuid4().hex}.db"


def test_custom_alarm_history_is_capped_at_20_versions() -> None:
    store = CustomAlarmsStore(_db_path())
    attribute_id = "attr-123"

    for index in range(25):
        store.upsert(
            attribute_id,
            custom_hi=80 + index,
            custom_lo=20 + index,
            user="unknown",
        )

    current = store.get_current(attribute_id)
    assert current is not None
    assert current["version_n"] == 25
    assert current["custom_hi"] == 104.0
    assert current["custom_lo"] == 44.0

    versions = store.list_versions(attribute_id, limit=20)
    assert len(versions) == 20
    assert versions[0]["version_n"] == 25
    assert versions[-1]["version_n"] == 6


def test_first_upsert_sets_audit_metadata() -> None:
    store = CustomAlarmsStore(_db_path())
    created = store.upsert(
        "attr-1",
        custom_hi=99.0,
        custom_lo=11.0,
        user="unknown",
    )

    assert created["version_n"] == 1
    assert created["user"] == "unknown"
    assert created["created_date"]
    assert created["updated_date"]
