from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
D3_CHART_PATH = ROOT / "frontend" / "charts" / "components" / "d3-line-chart.js"
STYLES_PATH = ROOT / "frontend" / "charts" / "styles" / "components.css"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_pinned_cursor_hover_hit_zone_is_explicit_and_hover_scoped() -> None:
    source = _read(D3_CHART_PATH)

    assert "const PIN_HIGHLIGHT_RADIUS = PIN_HIT_RADIUS + 4;" in source
    assert '.attr("class", "pinned-cursor-hit-zone")' in source
    assert '.style("display", pin.id === hoveredPinId ? "block" : "none");' in source
    assert "function syncHoveredPin(coords) {" in source
    assert "const didHoverPinChange = syncHoveredPin(coords);" in source
    assert "if (didHoverPinChange) {" in source
    assert "renderPinnedCursors();" in source
    assert "setHoveredPinId(null);" in source


def test_pinned_cursor_hit_zone_style_is_subtle_and_non_interactive() -> None:
    styles = _read(STYLES_PATH)

    assert ".pinned-cursor-hit-zone {" in styles
    assert "fill: rgba(11, 20, 31, 0.08);" in styles
    assert "stroke: rgba(11, 20, 31, 0.16);" in styles
    assert "pointer-events: none;" in styles


def test_bottom_pan_zone_hover_hint_is_explicit_and_pointer_scoped() -> None:
    source = _read(D3_CHART_PATH)
    styles = _read(STYLES_PATH)

    assert '.attr("class", "pan-zone-hover-hint")' in source
    assert ".attr(\"y\", innerHeight * (1 - PAN_ZONE_RATIO))" in source
    assert ".attr(\"height\", innerHeight * PAN_ZONE_RATIO)" in source
    assert "function setPanZoneHintVisible(nextVisible) {" in source
    assert "function renderPanZoneHint() {" in source
    assert "const showPanHint = isPanZone(coords.y, innerHeight) && !findPinHitTarget(coords);" in source
    assert ".pan-zone-hover-hint {" in styles
    assert "fill: rgba(11, 20, 31, 0.07);" in styles
    assert "stroke: rgba(11, 20, 31, 0.14);" in styles
    assert "pointer-events: none;" in styles
