import { renderDateFilter } from "./date-filter.js";
import { storeConstants } from "../state/store.js";

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
