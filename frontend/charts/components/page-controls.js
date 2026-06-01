import { renderDateFilter } from "./date-filter.js?v=20260516-2";
import { storeConstants } from "../state/store.js";

const tableColumnsPickerState = {
  isOpen: false,
  draftSelectedIds: [],
  availableScrollTop: 0,
  selectedScrollTop: 0,
};

const settingsMenuState = {
  openForPageId: null,
};
let settingsMenuDismissListener = null;
let settingsMenuPortalNode = null;
let settingsMenuPositionListener = null;
const REFRESH_ICON_GLYPH = "\u21BB";
const SETTINGS_ICON_GLYPH = "\u2699";
const GRID_LAYOUT_OPTIONS = Object.freeze([
  { columns: 1, label: "1 graph per row", iconClass: "is-one" },
  { columns: 2, label: "2 graphs per row", iconClass: "is-two" },
]);

function normalizeDraftColumns(ids, availableColumns, fallback) {
  const availableSet = new Set((availableColumns || []).map((column) => column.id));
  const requiredIds = (availableColumns || [])
    .filter((column) => column.required)
    .map((column) => column.id);
  ["name", "color", "remove"].forEach((id) => {
    if (!requiredIds.includes(id)) {
      requiredIds.push(id);
    }
  });

  const source = Array.isArray(ids) ? ids : fallback;
  const normalized = source
    .map((entry) => String(entry || "").trim())
    .filter((entry) => availableSet.has(entry));
  const unique = Array.from(new Set(normalized));
  const ordered = unique.slice();
  requiredIds.forEach((id) => {
    if (availableSet.has(id) && !ordered.includes(id)) {
      ordered.push(id);
    }
  });
  if (ordered.includes("name")) {
    return ["name", ...ordered.filter((id) => id !== "name")];
  }
  return ordered;
}

function moveEntry(list, index, direction) {
  const next = list.slice();
  const from = index;
  const to = index + direction;
  if (from < 0 || to < 0 || from >= next.length || to >= next.length) {
    return next;
  }
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

function renderGridControl(container, page, actions) {
  const group = document.createElement("div");
  group.className = "toolbar-cluster grid-icon-cluster";
  const activeGridColumns = Number(page.gridColumns) === 1 ? 1 : 2;

  GRID_LAYOUT_OPTIONS.forEach(({ columns, label, iconClass }) => {
    const isActive = activeGridColumns === columns;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `page-toolbar-icon-button${isActive ? " active" : ""}`;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.disabled = isActive;
    button.addEventListener("click", () => {
      actions.setGridColumns(page.id, columns);
    });

    const icon = document.createElement("span");
    icon.className = `grid-icon ${iconClass}`;
    button.append(icon);
    group.append(button);
  });

  container.append(group);
}

function renderRefreshAndFrequency(container, page, actions) {
  const cluster = document.createElement("div");
  cluster.className = "toolbar-cluster";

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "page-toolbar-icon-button";
  refresh.title = "Reload data";
  refresh.setAttribute("aria-label", "Reload data");
  refresh.textContent = REFRESH_ICON_GLYPH;
  refresh.addEventListener("click", () => actions.refreshCharts(page.id));
  cluster.append(refresh);

  const toggleWrap = document.createElement("label");
  toggleWrap.className = "frequency-toggle";
  const toggleLabel = document.createElement("span");
  toggleLabel.className = "frequency-toggle-label";
  toggleLabel.textContent = "Auto";

  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = String(page.frequencyMode || "").toLowerCase() === "manual";
  toggle.addEventListener("change", () => {
    if (toggle.checked) {
      actions.setFrequency(page.id, "manual", page.frequencyWindow || "6h");
      return;
    }
    actions.setFrequency(page.id, "auto", page.frequencyWindow || "6h");
  });

  const slider = document.createElement("span");
  slider.className = "frequency-toggle-slider";

  const offLabel = document.createElement("span");
  offLabel.className = "frequency-toggle-label";
  offLabel.textContent = "Off";

  toggleWrap.append(toggleLabel, toggle, slider, offLabel);
  cluster.append(toggleWrap);

  if (toggle.checked) {
    const select = document.createElement("select");
    select.className = "frequency-window-select";
    [
      ["15m", "15m"],
      ["1h", "1h"],
      ["6h", "6h"],
      ["1d", "1d"],
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.append(option);
    });
    select.value = String(page.frequencyWindow || "6h").toLowerCase();
    select.addEventListener("change", () => {
      actions.setFrequency(page.id, "manual", select.value);
    });
    cluster.append(select);
  }

  container.append(cluster);
}

function createSettingsMenu(container, snapshot, page, actions) {
  const wrapper = document.createElement("div");
  wrapper.className = "page-settings-menu";
  const pageId = String(page.id);
  const isOpen = settingsMenuState.openForPageId === pageId;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = `page-toolbar-icon-button page-settings-trigger${isOpen ? " active" : ""}${page.dirty ? " dirty" : ""}`;
  trigger.textContent = SETTINGS_ICON_GLYPH;
  trigger.title = page.dirty ? "Settings (unsaved changes)" : "Settings";
  trigger.setAttribute("aria-label", "Page settings");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    settingsMenuState.openForPageId = isOpen ? null : pageId;
    renderPageControls(container, snapshot, actions);
  });
  wrapper.append(trigger);

  if (!isOpen) return wrapper;

  const menu = document.createElement("div");
  menu.className = "page-settings-dropdown page-settings-dropdown-portal";
  menu.setAttribute("role", "menu");

  const closeMenuAndRerender = () => {
    settingsMenuState.openForPageId = null;
    renderPageControls(container, snapshot, actions);
  };

  const addMenuItem = ({ label, onClick, disabled = false, title = "" }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    if (title) button.title = title;
    button.setAttribute("role", "menuitem");
    button.addEventListener("click", () => {
      if (disabled) return;
      onClick?.();
    });
    menu.append(button);
  };

  const activePage = snapshot.pages.find((entry) => entry.id === snapshot.activePageId) || page;
  const atChartLimit = activePage.charts.length >= storeConstants.MAX_CHARTS_PER_PAGE;
  const pageCount = snapshot.pages.length;

  addMenuItem({
    label: "Columns selector",
    onClick: () => {
      tableColumnsPickerState.isOpen = true;
      settingsMenuState.openForPageId = null;
      renderPageControls(container, snapshot, actions);
    },
  });

  addMenuItem({
    label: "Add chart",
    disabled: atChartLimit,
    title: atChartLimit
      ? `Chart limit reached (${storeConstants.MAX_CHARTS_PER_PAGE}).`
      : "Add chart to active page",
    onClick: () => {
      actions.addChart(activePage.id);
      closeMenuAndRerender();
    },
  });

  addMenuItem({
    label: "Save page",
    disabled: !activePage.dirty,
    onClick: () => {
      actions.savePage(activePage.id);
      closeMenuAndRerender();
    },
  });

  addMenuItem({
    label: "Rename page",
    onClick: () => {
      const nextName = window.prompt("Rename page", activePage.name);
      if (!nextName || !nextName.trim()) return;
      actions.renamePage(activePage.id, nextName.trim());
      closeMenuAndRerender();
    },
  });

  addMenuItem({
    label: "Duplicate page",
    onClick: () => {
      actions.duplicatePage(activePage.id);
      closeMenuAndRerender();
    },
  });

  addMenuItem({
    label: "Delete page",
    disabled: pageCount <= 1,
    onClick: () => {
      if (!window.confirm(`Delete page "${activePage.name}"?`)) return;
      actions.deletePage(activePage.id);
      closeMenuAndRerender();
    },
  });

  if (settingsMenuPositionListener) {
    window.removeEventListener("resize", settingsMenuPositionListener);
    window.removeEventListener("scroll", settingsMenuPositionListener, true);
    settingsMenuPositionListener = null;
  }

  if (settingsMenuPortalNode) {
    settingsMenuPortalNode.remove();
    settingsMenuPortalNode = null;
  }
  settingsMenuPortalNode = menu;
  menu.style.visibility = "hidden";
  menu.style.right = "auto";
  menu.style.left = "0";
  menu.style.top = "0";
  menu.style.width = "220px";
  menu.style.maxWidth = "min(260px, calc(100vw - 16px))";
  document.body.append(menu);
  const positionPortalMenu = (attempt = 0) => {
    if (settingsMenuPortalNode !== menu) return;
    if (!trigger.isConnected) {
      if (attempt < 4) {
        requestAnimationFrame(() => positionPortalMenu(attempt + 1));
      }
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    if (triggerRect.width <= 0 && triggerRect.height <= 0) {
      if (attempt < 4) {
        requestAnimationFrame(() => positionPortalMenu(attempt + 1));
      }
      return;
    }
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const alignedLeft = triggerRect.right - menuRect.width;
    const left = Math.max(
      8,
      Math.min(alignedLeft, viewportWidth - menuRect.width - 8),
    );
    const belowTop = triggerRect.bottom + 6;
    const aboveTop = triggerRect.top - menuRect.height - 6;
    const top =
      belowTop + menuRect.height <= viewportHeight - 8 || aboveTop < 8
        ? Math.min(belowTop, viewportHeight - menuRect.height - 8)
        : aboveTop;
    menu.style.top = `${Math.round(Math.max(8, top))}px`;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.visibility = "visible";
  };
  settingsMenuPositionListener = () => {
    positionPortalMenu(0);
  };
  window.addEventListener("resize", settingsMenuPositionListener);
  window.addEventListener("scroll", settingsMenuPositionListener, true);
  requestAnimationFrame(positionPortalMenu);

  if (settingsMenuDismissListener) {
    document.removeEventListener("pointerdown", settingsMenuDismissListener, true);
    settingsMenuDismissListener = null;
  }

  settingsMenuDismissListener = (event) => {
    if (wrapper.contains(event.target)) return;
    if (settingsMenuPortalNode?.contains(event.target)) return;
    settingsMenuState.openForPageId = null;
    renderPageControls(container, snapshot, actions);
  };
  queueMicrotask(() => {
    document.addEventListener("pointerdown", settingsMenuDismissListener, true);
  });

  return wrapper;
}

function renderTableColumnsControl(container, snapshot, actions) {
  const controlsRoot = container;
  if (!tableColumnsPickerState.isOpen) return;
  const tableColumns = snapshot?.tableColumns;
  const availableColumns = Array.isArray(tableColumns?.availableColumns)
    ? tableColumns.availableColumns
    : [];
  if (availableColumns.length === 0) return;

  const selectedIds = normalizeDraftColumns(
    tableColumns?.selectedIds,
    availableColumns,
    tableColumns?.defaultSelectedIds || [],
  );
  tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
    tableColumnsPickerState.draftSelectedIds.length > 0
      ? tableColumnsPickerState.draftSelectedIds
      : selectedIds,
    availableColumns,
    selectedIds,
  );

  const backdrop = document.createElement("div");
  backdrop.className = "table-columns-modal-backdrop";

  const modal = document.createElement("section");
  modal.className = "table-columns-modal";
  modal.addEventListener("click", (event) => event.stopPropagation());

  const titleRow = document.createElement("header");
  titleRow.className = "table-columns-modal-header";
  const title = document.createElement("h3");
  title.textContent = "Table Columns";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "secondary-button";
  close.textContent = "Cancel";
  close.addEventListener("click", () => {
    tableColumnsPickerState.isOpen = false;
    tableColumnsPickerState.draftSelectedIds = selectedIds.slice();
    renderPageControls(controlsRoot, snapshot, actions);
  });
  titleRow.append(title, close);

  const body = document.createElement("div");
  body.className = "table-columns-modal-body";

  const availablePanel = document.createElement("div");
  availablePanel.className = "table-columns-modal-panel";
  const availableTitle = document.createElement("h4");
  availableTitle.textContent = "Available";
  const availableList = document.createElement("div");
  availableList.className = "table-columns-picker-list";
  const draftSet = new Set(tableColumnsPickerState.draftSelectedIds);
  let selectedList = null;

  const rememberModalScroll = () => {
    tableColumnsPickerState.availableScrollTop = Math.max(0, availableList.scrollTop || 0);
    tableColumnsPickerState.selectedScrollTop = Math.max(
      0,
      selectedList ? selectedList.scrollTop || 0 : tableColumnsPickerState.selectedScrollTop,
    );
  };

  availableColumns.forEach((column) => {
    const row = document.createElement("label");
    row.className = "table-columns-picker-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = draftSet.has(column.id);
    checkbox.disabled = column.required === true;
    checkbox.addEventListener("change", () => {
      rememberModalScroll();
      const draft = tableColumnsPickerState.draftSelectedIds.slice();
      if (checkbox.checked) {
        if (!draft.includes(column.id)) draft.push(column.id);
      } else {
        const index = draft.indexOf(column.id);
        if (index >= 0) draft.splice(index, 1);
      }
      tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
        draft,
        availableColumns,
        selectedIds,
      );
      renderPageControls(controlsRoot, snapshot, actions);
    });
    const text = document.createElement("span");
    text.textContent = column.label || column.id;
    row.append(checkbox, text);
    availableList.append(row);
  });
  availablePanel.append(availableTitle, availableList);

  const selectedPanel = document.createElement("div");
  selectedPanel.className = "table-columns-modal-panel";
  const selectedTitle = document.createElement("h4");
  selectedTitle.textContent = "Selected Order";
  selectedList = document.createElement("div");
  selectedList.className = "table-columns-selected-list";

  const draftSelected = normalizeDraftColumns(
    tableColumnsPickerState.draftSelectedIds,
    availableColumns,
    selectedIds,
  );

  draftSelected.forEach((columnId, index) => {
    const column = availableColumns.find((entry) => entry.id === columnId);
    if (!column) return;
    const row = document.createElement("div");
    row.className = "table-columns-selected-row";

    const text = document.createElement("span");
    text.textContent = column.label || column.id;

    const controls = document.createElement("div");
    controls.className = "table-columns-selected-row-actions";
    const isPinned = column.id === "name";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "icon-button table-columns-order-button";
    up.textContent = "Up";
    up.disabled = isPinned || index <= 1;
    up.addEventListener("click", () => {
      rememberModalScroll();
      const current = tableColumnsPickerState.draftSelectedIds.slice();
      tableColumnsPickerState.draftSelectedIds = moveEntry(current, index, -1);
      tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
        tableColumnsPickerState.draftSelectedIds,
        availableColumns,
        selectedIds,
      );
      renderPageControls(controlsRoot, snapshot, actions);
    });

    const down = document.createElement("button");
    down.type = "button";
    down.className = "icon-button table-columns-order-button";
    down.textContent = "Down";
    down.disabled = isPinned || index < 1 || index >= draftSelected.length - 1;
    down.addEventListener("click", () => {
      rememberModalScroll();
      const current = tableColumnsPickerState.draftSelectedIds.slice();
      tableColumnsPickerState.draftSelectedIds = moveEntry(current, index, 1);
      tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
        tableColumnsPickerState.draftSelectedIds,
        availableColumns,
        selectedIds,
      );
      renderPageControls(controlsRoot, snapshot, actions);
    });

    controls.append(up, down);
    row.append(text, controls);
    selectedList.append(row);
  });
  selectedPanel.append(selectedTitle, selectedList);
  body.append(availablePanel, selectedPanel);

  const footer = document.createElement("footer");
  footer.className = "table-columns-modal-footer";

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "secondary-button";
  reset.textContent = "Reset Defaults";
  reset.addEventListener("click", () => {
    rememberModalScroll();
    tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
      tableColumns?.defaultSelectedIds || selectedIds,
      availableColumns,
      selectedIds,
    );
    renderPageControls(controlsRoot, snapshot, actions);
  });

  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "primary-button";
  apply.textContent = "Apply Columns";
  apply.addEventListener("click", () => {
    const nextIds = normalizeDraftColumns(
      tableColumnsPickerState.draftSelectedIds,
      availableColumns,
      selectedIds,
    );
    tableColumnsPickerState.isOpen = false;
    tableColumnsPickerState.draftSelectedIds = nextIds.slice();
    renderPageControls(controlsRoot, snapshot, actions);
    actions.setGlobalTableColumns?.(nextIds);
  });

  footer.append(reset, apply);
  modal.append(titleRow, body, footer);
  backdrop.append(modal);
  container.append(backdrop);

  availableList.addEventListener(
    "scroll",
    () => {
      tableColumnsPickerState.availableScrollTop = Math.max(0, availableList.scrollTop || 0);
    },
    { passive: true },
  );
  selectedList.addEventListener(
    "scroll",
    () => {
      tableColumnsPickerState.selectedScrollTop = Math.max(0, selectedList.scrollTop || 0);
    },
    { passive: true },
  );
  requestAnimationFrame(() => {
    availableList.scrollTop = Math.max(0, Number(tableColumnsPickerState.availableScrollTop || 0));
    selectedList.scrollTop = Math.max(0, Number(tableColumnsPickerState.selectedScrollTop || 0));
  });
}

export function renderPageControls(container, snapshot, actions) {
  container.innerHTML = "";
  if (settingsMenuState.openForPageId === null && settingsMenuDismissListener) {
    document.removeEventListener("pointerdown", settingsMenuDismissListener, true);
    settingsMenuDismissListener = null;
  }
  if (settingsMenuState.openForPageId === null && settingsMenuPositionListener) {
    window.removeEventListener("resize", settingsMenuPositionListener);
    window.removeEventListener("scroll", settingsMenuPositionListener, true);
    settingsMenuPositionListener = null;
  }
  if (settingsMenuState.openForPageId === null && settingsMenuPortalNode) {
    settingsMenuPortalNode.remove();
    settingsMenuPortalNode = null;
  }
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return;

  const toolbar = document.createElement("div");
  toolbar.className = "page-controls-toolbar";

  const rightCluster = document.createElement("div");
  rightCluster.className = "page-controls-right-cluster";

  const dateRangeHost = document.createElement("div");
  renderDateFilter(dateRangeHost, page, actions);
  rightCluster.append(dateRangeHost);

  renderRefreshAndFrequency(rightCluster, page, actions);
  renderGridControl(rightCluster, page, actions);
  rightCluster.append(createSettingsMenu(container, snapshot, page, actions));

  toolbar.append(rightCluster);

  container.append(toolbar);
  renderTableColumnsControl(container, snapshot, actions);
}

