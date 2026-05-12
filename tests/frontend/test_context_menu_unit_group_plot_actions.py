from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
APP_PATH = ROOT / "frontend" / "charts" / "app.js"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_context_menu_contains_new_unit_group_actions() -> None:
    source = _read(APP_PATH)
    assert 'label: "Plot Sensors by Unit"' in source
    assert 'label: "Plot Category (group by units)"' in source
    assert "plotSensorsByUnitForEquipment(node);" in source
    assert "plotSensorCategoryByUnit(category);" in source


def test_unit_grouping_uses_na_bucket_and_required_title_convention() -> None:
    source = _read(APP_PATH)
    assert 'const UNIT_FALLBACK_LABEL = "N/A";' in source
    assert 'const CHART_TITLE_SEPARATOR = " — ";' in source
    assert "buildChartsGroupedByUnit(sensors, titlePrefix)" in source
    assert "buildChartFromTags(tags, `${titlePrefix}${CHART_TITLE_SEPARATOR}${unitLabel}`)" in source


def test_existing_plot_by_category_action_still_present() -> None:
    source = _read(APP_PATH)
    assert 'label: "Plot by category"' in source
    assert "await plotByCategoryForEquipment(node);" in source


