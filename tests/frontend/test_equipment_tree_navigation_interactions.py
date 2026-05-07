from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
APP_PATH = ROOT / "frontend" / "charts" / "app.js"
STYLES_PATH = ROOT / "frontend" / "charts" / "styles" / "components.css"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_equipment_tree_row_click_opens_without_collapsing() -> None:
    source = _read(APP_PATH)
    assert 'const isExpanded = sidebarState.expandedEquipmentIds.has(node.id);' in source
    assert 'if (hasChildren && !sidebarState.expandedEquipmentIds.has(node.id)) {' in source
    assert 'if (event.target instanceof Element && event.target.closest(".tree-expander")) return;' in source
    assert 'row.addEventListener("click", (event) => {' in source
    assert "void selectEquipmentNode(node);" in source
    assert "hasFilter ||" not in source
    assert "node.id === sidebarState.selectedEquipmentId;" not in source


def test_equipment_tree_context_menu_and_expander_toggle_remain_explicit() -> None:
    source = _read(APP_PATH)
    assert 'expander.addEventListener("click", (event) => {' in source
    assert "event.stopPropagation();" in source
    assert 'row.addEventListener("contextmenu", openNodeContextMenu);' in source
    assert 'button.addEventListener("contextmenu", (event) => {' in source
    assert "showContextMenu({" in source


def test_equipment_filter_apply_expands_ancestor_paths() -> None:
    source = _read(APP_PATH)
    assert "function expandEquipmentTreeForFilter(filterText) {" in source
    assert "if (!node.name.toLowerCase().includes(filter)) return;" in source
    assert "while (parentId) {" in source
    assert "expanded.add(parentId);" in source
    assert "expandEquipmentTreeForFilter(nextFilter);" in source


def test_equipment_tree_expander_hitbox_is_more_obvious() -> None:
    source = _read(STYLES_PATH)
    assert "grid-template-columns: 20px minmax(0, 1fr);" in source
    assert ".tree-expander {" in source
    assert "width: 18px;" in source
    assert "height: 18px;" in source
    assert ".tree-expander:hover {" in source
    assert ".tree-expander:focus-visible {" in source
    assert ".tree-expander-placeholder {" in source
