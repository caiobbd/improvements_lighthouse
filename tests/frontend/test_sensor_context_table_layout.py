from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHART_CARD_PATH = ROOT / "frontend" / "charts" / "components" / "chart-card.js"
STYLES_PATH = ROOT / "frontend" / "charts" / "styles" / "components.css"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_chart_card_wires_sensor_context_batch_and_na_fallback() -> None:
    source = _read(CHART_CARD_PATH)
    assert "getSensorContextBatch" in source
    assert "sensor-context-batch" not in source
    assert "FALLBACK_NA = \"N/A\"" in source
    assert "renderSensorContextTable" in source
    assert "sensor-context-table-container" in source
    assert "estimateColumnWidth(" in source
    assert "setGlobalTableColumnWidth?.(" in source
    assert "sensor-context-cell-text" in source
    assert "Reset Column Widths" in source


def test_chart_card_contains_threshold_columns_mapping() -> None:
    source = _read(CHART_CARD_PATH)
    assert 'case "hihi":' in source
    assert 'case "hi":' in source
    assert 'case "lo":' in source
    assert 'case "lolo":' in source
    assert 'case "custom_hi":' in source
    assert 'case "custom_lo":' in source


def test_sensor_table_css_is_sticky_and_scrollable() -> None:
    source = _read(STYLES_PATH)
    assert ".sensor-context-table-container" in source
    assert "overflow: auto;" in source
    assert "width: 100%;" in source
    assert ".sensor-context-table thead th" in source
    assert "position: sticky;" in source
    assert "top: 0;" in source
    assert ".sensor-context-table th.sticky-column" in source
    assert "left: 0;" in source
    assert ".sensor-context-filler-head" in source
    assert ".sensor-context-filler-cell" in source
    assert ".sensor-context-col-resizer" in source
    assert "cursor: col-resize;" in source
    assert ".sensor-context-cell-text" in source
    assert ".table-columns-modal" in source
    assert "overflow: hidden;" in source
