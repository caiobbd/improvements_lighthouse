from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "frontend" / "charts" / "config" / "default-table-columns.json"
STORE_PATH = ROOT / "frontend" / "charts" / "state" / "store.js"
PAGE_CONTROLS_PATH = ROOT / "frontend" / "charts" / "components" / "page-controls.js"


def _load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_repo_manifest_has_required_name_and_defaults() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    assert isinstance(manifest.get("columns"), list)
    assert manifest["columns"], "Expected at least one table-column definition."

    by_id = {entry["id"]: entry for entry in manifest["columns"] if isinstance(entry, dict)}
    assert "name" in by_id, "Expected `name` column in table-column manifest."
    assert by_id["name"].get("required") is True
    assert by_id["name"].get("default") is True
    assert by_id["name"].get("sticky") is True
    assert by_id["color"].get("required") is True
    assert by_id["remove"].get("required") is True
    selected_default_order = [
        entry["id"]
        for entry in manifest["columns"]
        if isinstance(entry, dict) and (entry.get("default") is True or entry.get("required") is True)
    ]
    assert selected_default_order == [
        "name",
        "remove",
        "color",
        "last_value",
        "unit_of_measurement",
        "hi",
        "lo",
        "hihi",
        "lolo",
        "avg_1d",
    ]


def test_store_restores_global_columns_and_exposes_mutations() -> None:
    source = _load_text(STORE_PATH)
    assert "ALWAYS_INCLUDED_TABLE_COLUMN_IDS" in source
    assert "normalizeTableColumnsState" in source
    assert "tableColumns: normalizeTableColumnsState(" in source
    assert "setGlobalTableColumns(columnIds)" in source
    assert "resetGlobalTableColumns()" in source
    assert "resetGlobalTableColumnWidths()" in source
    assert "setTableColumnsManifest(manifest)" in source
    assert "selectedIds" in source


def test_page_controls_renders_global_picker() -> None:
    source = _load_text(PAGE_CONTROLS_PATH)
    assert "renderTableColumnsControl" in source
    assert "table-columns-modal" in source
    assert "actions.setGlobalTableColumns?.(" in source
    assert "Apply Columns" in source
    assert "Selected Order" in source
    assert "table-columns-order-button" in source
    assert '["name", "color", "remove"]' in source
    assert "renderPageControls(controlsRoot, snapshot, actions);" in source
