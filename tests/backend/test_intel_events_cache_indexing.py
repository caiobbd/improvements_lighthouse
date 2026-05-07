from __future__ import annotations

import pandas as pd

from backend.app.models.charts import EquipmentTreeNode
from backend.app.services.profiling_adapter import ProfilingAdapter


def _clear_adapter_class_caches() -> None:
    ProfilingAdapter._equipment_tree_cache.clear()  # noqa: SLF001
    ProfilingAdapter._equipment_tree_refreshing_keys.clear()  # noqa: SLF001
    ProfilingAdapter._intel_events_cache.clear()  # noqa: SLF001
    ProfilingAdapter._descendant_item_ids_cache.clear()  # noqa: SLF001


def _event_row(
    *,
    event_id: str,
    name: str,
    item_id: str,
    event_type: str,
    status: str,
    start_date: str,
) -> dict[str, object]:
    return {
        "id": event_id,
        "name": name,
        "item_id": item_id,
        "event_type": event_type,
        "start_date": start_date,
        "end_date": None,
        "data.status": status,
        "data.severity": "HIGH",
        "data.description": "desc",
        "data.prognosis": "prog",
        "data.trend_display_start_date": start_date,
    }


class _FakeWorkspace:
    def __init__(self) -> None:
        self.get_all_events_calls: list[str | None] = []
        self._shape_events = pd.DataFrame(
            [
                _event_row(
                    event_id="evt-shape",
                    name="Shape event",
                    item_id="item-child-1",
                    event_type="Shape Intel",
                    status="OPEN",
                    start_date="2026-01-03T10:00:00Z",
                ),
                _event_row(
                    event_id="evt-duplicate",
                    name="Duplicate from Shape",
                    item_id="item-child-1",
                    event_type="Shape Intel",
                    status="OPEN",
                    start_date="2026-01-02T10:00:00Z",
                ),
            ]
        )
        self._hex_events = pd.DataFrame(
            [
                _event_row(
                    event_id="evt-hex",
                    name="HEX event",
                    item_id="item-child-2",
                    event_type="ShapeIntel - Heat Exchanger",
                    status="CLOSED",
                    start_date="2026-01-04T10:00:00Z",
                ),
                _event_row(
                    event_id="evt-duplicate",
                    name="Duplicate from HEX",
                    item_id="item-child-2",
                    event_type="ShapeIntel - Heat Exchanger",
                    status="CLOSED",
                    start_date="2026-01-01T10:00:00Z",
                ),
            ]
        )

    def get_item_tree(self) -> dict[str, object]:
        return {"items": []}

    def get_all_events(
        self,
        type: str | None = None,
        limit: int | None = None,
        end_date_from: str | None = None,
        end_date_to: str | None = None,
        cursor: int | None = None,
    ) -> pd.DataFrame:
        del limit, end_date_from, end_date_to, cursor
        self.get_all_events_calls.append(type)
        if type == "Shape Intel":
            return self._shape_events.copy()
        if type == "ShapeIntel - Heat Exchanger":
            return self._hex_events.copy()
        return pd.DataFrame()


def _fake_tree_nodes() -> list[EquipmentTreeNode]:
    return [
        EquipmentTreeNode(
            id="modec-root",
            name="MODEC do Brasil",
            parent_id=None,
            has_children=True,
            depth=0,
            path_ids=["modec-root"],
            path_names=["MODEC do Brasil"],
        ),
        EquipmentTreeNode(
            id="item-parent",
            name="Platform",
            parent_id="modec-root",
            has_children=True,
            depth=1,
            path_ids=["modec-root", "item-parent"],
            path_names=["MODEC do Brasil", "Platform"],
        ),
        EquipmentTreeNode(
            id="item-child-1",
            name="Compressor 1",
            parent_id="item-parent",
            has_children=False,
            depth=2,
            path_ids=["modec-root", "item-parent", "item-child-1"],
            path_names=["MODEC do Brasil", "Platform", "Compressor 1"],
        ),
        EquipmentTreeNode(
            id="item-child-2",
            name="Compressor 2",
            parent_id="item-parent",
            has_children=False,
            depth=2,
            path_ids=["modec-root", "item-parent", "item-child-2"],
            path_names=["MODEC do Brasil", "Platform", "Compressor 2"],
        ),
    ]


def _mock_tree_on_adapter(adapter: ProfilingAdapter) -> None:
    nodes = _fake_tree_nodes()
    roots = ["modec-root"]

    def _get_equipment_tree(
        ancestor_id: str | None = None,  # noqa: ARG001
        lean: bool = False,  # noqa: ARG001
    ) -> tuple[list[str], list[EquipmentTreeNode]]:
        return roots, [node.model_copy(deep=True) for node in nodes]

    adapter.get_equipment_tree = _get_equipment_tree  # type: ignore[method-assign]


def test_fetch_all_intel_events_includes_hex_and_deduplicates_by_event_id() -> None:
    _clear_adapter_class_caches()
    try:
        adapter = ProfilingAdapter(workspace=_FakeWorkspace())
        _mock_tree_on_adapter(adapter)
        events = adapter._fetch_all_intel_events()  # noqa: SLF001

        ids = [entry["event_id"] for entry in events]
        assert set(ids) == {"evt-shape", "evt-hex", "evt-duplicate"}
        duplicate = next(entry for entry in events if entry["event_id"] == "evt-duplicate")
        assert duplicate["item_id"] == "item-child-1"
        assert duplicate["event_type"] == "Shape Intel"
    finally:
        _clear_adapter_class_caches()


def test_get_intel_events_uses_cached_index_for_descendant_filtering() -> None:
    _clear_adapter_class_caches()
    try:
        workspace = _FakeWorkspace()
        adapter = ProfilingAdapter(workspace=workspace)
        _mock_tree_on_adapter(adapter)

        first, status_options = adapter.get_intel_events(
            item_id="item-parent",
            include_descendants=True,
        )
        second, _ = adapter.get_intel_events(
            item_id="item-parent",
            include_descendants=True,
            status="open",
        )

        assert workspace.get_all_events_calls == ["Shape Intel", "ShapeIntel - Heat Exchanger"]
        assert [entry["event_id"] for entry in first] == ["evt-hex", "evt-shape", "evt-duplicate"]
        assert status_options == ["CLOSED", "OPEN"]
        assert [entry["event_id"] for entry in second] == ["evt-shape", "evt-duplicate"]
    finally:
        _clear_adapter_class_caches()
