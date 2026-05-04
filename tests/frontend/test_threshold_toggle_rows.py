from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHART_CARD_PATH = ROOT / "frontend" / "charts" / "components" / "chart-card.js"
STYLES_PATH = ROOT / "frontend" / "charts" / "styles" / "components.css"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_threshold_columns_render_clickable_value_controls() -> None:
    source = _read(CHART_CARD_PATH)
    styles = _read(STYLES_PATH)

    assert (
        'THRESHOLD_COLUMN_IDS = Object.freeze(["hihi", "hi", "lo", "lolo", "custom_hi", "custom_lo"])'
        in source
    )
    assert "function isThresholdColumnId(columnId)" in source
    assert 'control.className = "sensor-context-threshold-control"' in source
    assert "control.textContent = thresholdValueText;" in source
    assert 'toggleThresholdLine(row.tagKey, column.id, { keepRowVisible: true });' in source

    assert ".sensor-context-threshold-control {" in styles
    assert ".sensor-context-threshold-control.is-enabled {" in styles


def test_toggled_threshold_builds_derived_rows_with_threshold_context_and_actions() -> None:
    source = _read(CHART_CARD_PATH)

    assert "function buildDerivedThresholdRow(sensorRow, thresholdKey, threshold)" in source
    assert 'name: `${sensorRow.name} | ${resolveThresholdLabel(thresholdKey)}`,' in source
    assert "tag: FALLBACK_NA," in source
    assert "reference: FALLBACK_NA," in source
    assert "categories: []," in source
    assert "const resolved = resolveThresholdValueForSensorUnit(threshold, sensorRow?.unit_of_measurement);" in source
    assert "unit_of_measurement: resolvedUnit," in source
    assert "last_value: Number.isFinite(resolvedValue) ? resolvedValue : null," in source
    assert "resolveThresholdOverlayStyle(row.thresholdKey)?.color || \"#6f7e8f\"" in source
    assert "remove.title = `Hide ${resolveThresholdLabel(row.thresholdKey)} threshold`;" in source


def test_threshold_toggles_start_off_and_change_only_on_click() -> None:
    source = _read(CHART_CARD_PATH)

    assert "normalizeThresholdToggleState(value)" in source
    assert "normalizeThresholdRowState(value)" in source
    assert "if (!value || typeof value !== \"object\") return {};" in source
    assert "if (!cleaned || enabled !== true) return;" in source
    assert "if (nextState[toggleKey] === true) {" in source
    assert "delete nextState[toggleKey];" in source
    assert "nextState[toggleKey] = true;" in source
    assert "function removeThresholdRow(tagKey, thresholdKey)" in source
    assert "if (!isThresholdRowVisible(sensorRow.tagKey, thresholdKey)) return;" in source
