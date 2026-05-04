from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CHART_CARD_PATH = ROOT / "frontend" / "charts" / "components" / "chart-card.js"
D3_LINE_CHART_PATH = ROOT / "frontend" / "charts" / "components" / "d3-line-chart.js"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_single_tag_threshold_style_mapping_is_locked() -> None:
    chart_card = _read(CHART_CARD_PATH)
    d3_source = _read(D3_LINE_CHART_PATH)

    assert 'THRESHOLD_OVERLAY_ORDER = THRESHOLD_COLUMN_IDS' in chart_card
    assert (
        'THRESHOLD_COLUMN_IDS = Object.freeze(["hihi", "hi", "lo", "lolo", "custom_hi", "custom_lo"])'
        in chart_card
    )
    assert 'hihi: Object.freeze({ label: "HiHi", color: "#d94a4a", dash: THRESHOLD_OVERLAY_DASH })' in chart_card
    assert 'lolo: Object.freeze({ label: "LoLo", color: "#d94a4a", dash: THRESHOLD_OVERLAY_DASH })' in chart_card
    assert 'hi: Object.freeze({ label: "Hi", color: "#d9b84a", dash: THRESHOLD_OVERLAY_DASH })' in chart_card
    assert 'lo: Object.freeze({ label: "Lo", color: "#d9b84a", dash: THRESHOLD_OVERLAY_DASH })' in chart_card
    assert "thresholdLines: buildThresholdOverlayDescriptors()" in chart_card

    assert "normalizeThresholdLines(lines)" in d3_source
    assert 'threshold-overlay-layer' in d3_source
    assert 'renderThresholdLayer()' in d3_source
    assert '.attr("stroke-dasharray", thresholdLine.dash)' in d3_source


def test_single_tag_load_auto_enables_available_threshold_overlays() -> None:
    chart_card = _read(CHART_CARD_PATH)

    assert "buildAutoEnabledThresholdTogglesForSingleTag(tags, contextRows)" in chart_card
    assert "if (!Array.isArray(tags) || tags.length !== 1) return null;" in chart_card
    assert "if (!hasExplicitThresholdState && tags.length === 1) {" in chart_card
    assert "threshold?.is_configured !== true" in chart_card
    assert "thresholdRowState: { ...thresholdRowState }" in chart_card


def test_y_domain_calculations_include_threshold_values_for_reset_and_autoscale() -> None:
    d3_source = _read(D3_LINE_CHART_PATH)

    assert "function collectFiniteThresholdValues(lines)" in d3_source
    assert "const thresholdValues = collectFiniteThresholdValues(thresholdLines);" in d3_source
    assert "const domainValues = [...visibleValues, ...thresholdValues];" in d3_source
    assert "const fullYBounds = hasSeries ? computeFullYBounds(parsedLines, parsedThresholdLines) : [0, 1];" in d3_source
    assert "computeSharedYDomain(renderLines, currentXDomain, normalizationEnabled, parsedThresholdLines)" in d3_source


def test_multi_tag_charts_keep_manual_threshold_toggles_as_source_of_truth() -> None:
    chart_card = _read(CHART_CARD_PATH)

    assert "return tags.flatMap((tag) => {" in chart_card
    assert "function clearThresholdTogglesByGuardrail()" not in chart_card
    assert "Threshold overlays were cleared because this chart has more than one tag." not in chart_card
    assert "if (tags.length !== 1) {" not in chart_card
