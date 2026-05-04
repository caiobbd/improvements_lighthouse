import { renderDateFilter } from "./date-filter.js";
import { storeConstants } from "../state/store.js";

const tableColumnsPickerState = {
  isOpen: false,
  draftSelectedIds: [],
};

function renderGridSwitcher(container, page, actions) {
  const group = document.createElement("div");
  group.className = "control-group";

  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = "Grid";

  [1, 2].forEach((count) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button";
    button.textContent = `${count} col`;
    button.disabled = page.gridColumns === count;
    button.addEventListener("click", () => {
      actions.setGridColumns(page.id, count);
    });
    group.append(button);
  });

  group.prepend(label);
  container.append(group);
}

function renderFrequencyControl(container, page, actions) {
  const group = document.createElement("div");
  group.className = "control-group";

  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = "Frequency";

  const select = document.createElement("select");
  [
    ["auto", "Auto"],
    ["15m", "15m"],
    ["1h", "1h"],
    ["6h", "6h"],
    ["1d", "1d"],
  ].forEach(([value, text]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    select.append(option);
  });

  select.value = page.frequencyMode === "manual" ? page.frequencyWindow || "6h" : "auto";
  select.addEventListener("change", () => {
    const next = select.value;
    if (next === "auto") {
      actions.setFrequency(page.id, "auto", page.frequencyWindow || "6h");
      return;
    }
    actions.setFrequency(page.id, "manual", next);
  });

  group.append(label, select);
  container.append(group);
}

function createSaveStatus(page) {
  const status = document.createElement("span");
  status.className = `page-save-status${page.dirty ? " dirty" : ""}`;
  status.textContent = page.dirty ? "Unsaved changes" : "All changes saved";
  status.title = "Use Actions in the top bar to rename, duplicate, or delete this page.";
  return status;
}

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

function renderTableColumnsControl(container, controlsRoot, snapshot, actions) {
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
  if (!tableColumnsPickerState.isOpen || tableColumnsPickerState.draftSelectedIds.length === 0) {
    tableColumnsPickerState.draftSelectedIds = selectedIds.slice();
  } else {
    tableColumnsPickerState.draftSelectedIds = normalizeDraftColumns(
      tableColumnsPickerState.draftSelectedIds,
      availableColumns,
      selectedIds,
    );
  }

  const group = document.createElement("div");
  group.className = "control-group table-columns-control";

  const label = document.createElement("span");
  label.className = "control-label";
  label.textContent = "Table";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "secondary-button";
  trigger.textContent = `Columns (${selectedIds.length}/${availableColumns.length})`;
  trigger.addEventListener("click", () => {
    tableColumnsPickerState.isOpen = true;
    renderPageControls(controlsRoot, snapshot, actions);
  });

  group.append(label, trigger);
  container.append(group);

  if (!tableColumnsPickerState.isOpen) {
    return;
  }

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
  availableColumns.forEach((column) => {
    const row = document.createElement("label");
    row.className = "table-columns-picker-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = draftSet.has(column.id);
    checkbox.disabled = column.required === true;
    checkbox.addEventListener("change", () => {
      const draft = tableColumnsPickerState.draftSelectedIds.slice();
      if (checkbox.checked) {
        if (!draft.includes(column.id)) {
          draft.push(column.id);
        }
      } else {
        const index = draft.indexOf(column.id);
        if (index >= 0) {
          draft.splice(index, 1);
        }
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
  const selectedList = document.createElement("div");
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
}

export function renderPageControls(container, snapshot, actions) {
  container.innerHTML = "";
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return;

  const left = document.createElement("div");
  left.className = "page-controls-left";

  const dateFilterHost = document.createElement("div");
  renderDateFilter(dateFilterHost, page, actions);

  renderGridSwitcher(left, page, actions);
  left.append(dateFilterHost);
  renderFrequencyControl(left, page, actions);
  renderTableColumnsControl(left, container, snapshot, actions);

  const right = document.createElement("div");
  right.className = "page-controls-right";

  const refreshAll = document.createElement("button");
  refreshAll.type = "button";
  refreshAll.className = "secondary-button";
  refreshAll.textContent = "Refresh Data";
  refreshAll.addEventListener("click", () => actions.refreshCharts(page.id));

  const addChart = document.createElement("button");
  addChart.type = "button";
  addChart.className = "secondary-button";
  addChart.textContent = "Add Chart";
  addChart.disabled = page.charts.length >= storeConstants.MAX_CHARTS_PER_PAGE;
  addChart.title = addChart.disabled
    ? `You can only have ${storeConstants.MAX_CHARTS_PER_PAGE} charts per page.`
    : "Create a new chart";
  addChart.addEventListener("click", () => actions.addChart(page.id));

  const save = document.createElement("button");
  save.type = "button";
  save.className = "primary-button";
  save.textContent = page.dirty ? "Save Page*" : "Save Page";
  save.disabled = !page.dirty;
  save.addEventListener("click", () => actions.savePage(page.id));

  const status = createSaveStatus(page);
  right.append(refreshAll, addChart, save, status);

  if (page.charts.length >= storeConstants.MAX_CHARTS_PER_PAGE) {
    const limit = document.createElement("span");
    limit.className = "page-limit-hint";
    limit.textContent = `Chart limit reached (${storeConstants.MAX_CHARTS_PER_PAGE}).`;
    right.append(limit);
  }

  const layout = document.createElement("div");
  layout.className = "page-controls";
  layout.append(left, right);

  container.append(layout);
}
