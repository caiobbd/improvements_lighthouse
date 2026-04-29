from __future__ import annotations

from backend.app.services.profiling_adapter import ProfilingAdapter


def test_threshold_duplicate_resolution_prefers_non_null_then_internal_then_newest() -> None:
    thresholds = ProfilingAdapter._build_threshold_context(  # noqa: SLF001
        [
            {"name": "Hi", "value": None, "is_external": False, "updated_at": "2026-01-03T00:00:00Z"},
            {"name": "Hi", "value": 81, "is_external": True, "updated_at": "2026-01-04T00:00:00Z"},
            {"name": "Hi", "value": 82, "is_external": False, "updated_at": "2026-01-01T00:00:00Z"},
            {"name": "LoLo", "value": 10, "is_external": False, "updated_at": "2026-01-01T00:00:00Z"},
            {"name": "LoLo", "value": 12, "is_external": False, "updated_at": "2026-01-02T00:00:00Z"},
        ]
    )

    assert thresholds["hi"].value == 82
    assert thresholds["hi"].is_external is False
    assert thresholds["lolo"].value == 12


def test_threshold_context_is_empty_when_sub_attributes_missing() -> None:
    thresholds = ProfilingAdapter._build_threshold_context(None)  # noqa: SLF001
    assert thresholds == {}
