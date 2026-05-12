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
    assert 'const CHART_TITLE_SEPARATOR = " - ";' in source
    assert "buildChartsGroupedByUnit(sensors, titlePrefix)" in source
    assert "buildChartFromTags(tags, `${titlePrefix}${CHART_TITLE_SEPARATOR}${unitLabel}`)" in source


def test_existing_plot_by_category_action_still_present() -> None:
    source = _read(APP_PATH)
    assert 'label: "Plot by category"' in source
    assert "await plotByCategoryForEquipment(node);" in source


def test_unit_grouping_actions_are_gated_by_unit_metadata_readiness() -> None:
    source = _read(APP_PATH)
    assert "unitMetadataReadyByEquipmentId: new Map()," in source
    assert "function isUnitMetadataReadyForEquipment(itemId)" in source
    assert "async function finalizeUnitMetadataForEquipment(node, normalizedSensors)" in source
    assert "await finalizeUnitMetadataForEquipment(node, normalized);" in source
    assert "buildItemAttributeUnitLookups(payload?.attributes)" in source
    assert 'console.warn("Unable to load item attributes for unit metadata fallback.", error);' in source
    assert "disabled: !isUnitMetadataReadyForEquipment(node.id)," in source
    assert "disabled: !isUnitMetadataReadyForEquipment(selectedNode?.id)," in source
    assert 'setSidebarNotice("Unit metadata is still loading for this equipment.");' in source


