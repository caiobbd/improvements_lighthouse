import { createChartCard } from "./chart-card.js";
import { storeConstants } from "../state/store.js";

function createSyncBus() {
  const handlers = new Map();

  return {
    register(chartId, handler) {
      if (!chartId || !handler) return () => {};
      handlers.set(chartId, handler);
      return () => {
        handlers.delete(chartId);
      };
    },
    broadcastPreview(sourceChartId, range) {
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.setPreviewXDomain?.(range || null);
      });
    },
    clearPreview(sourceChartId) {
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.setPreviewXDomain?.(null);
      });
    },
    commitXDomain(sourceChartId, range) {
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.applyExternalXDomain?.(range || null);
        handler.setPreviewXDomain?.(null);
      });
    },
  };
}

function createAddChartBlock(onAdd, disabled = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "tab-panel-add-chart-wrapper";
  const capValue = storeConstants.MAX_CHARTS_PER_PAGE;

  const block = document.createElement("button");
  block.type = "button";
  block.className = "tab-panel-add-chart secondary-button";
  block.textContent = "+ Add chart";
  block.disabled = disabled;
  block.title = disabled ? `Maximum ${capValue} charts per page.` : "Add chart";
  block.addEventListener("click", onAdd);
  wrapper.append(block);

  if (disabled) {
    const hint = document.createElement("p");
    hint.className = "chart-limit-hint";
    hint.textContent = `Chart limit reached (${capValue}).`;
    wrapper.append(hint);
  }

  return wrapper;
}

function renderEmptyState(container, onAdd) {
  const template = document.getElementById("empty-state-template");
  const fragment = template.content.cloneNode(true);
  const wrapper = document.createElement("div");
  wrapper.append(fragment);

  const action = document.createElement("button");
  action.type = "button";
  action.className = "primary-button";
  action.textContent = "Add first chart";
  action.addEventListener("click", onAdd);

  wrapper.querySelector(".empty-chart-state-container")?.append(action);
  container.append(wrapper);
}

export async function renderChartGrid(container, snapshot, actions) {
  container.innerHTML = "";
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return;

  const columns = Math.max(1, Math.min(2, Number(page.gridColumns || 2)));
  container.dataset.columns = String(columns);

  if (page.charts.length === 0) {
    renderEmptyState(container, () => actions.addChart(page.id));
    return;
  }

  const syncBus = createSyncBus();

  const nodeByChartId = new Map();
  page.charts.forEach((chart) => {
    const node = createChartCard({
      chart,
      page,
      actions,
      syncBus,
    });
    const chartId = chart.id;
    node.dataset.chartId = chartId;
    nodeByChartId.set(chartId, node);
    container.append(node);
  });

  const isAtLimit = page.charts.length >= storeConstants.MAX_CHARTS_PER_PAGE;
  container.append(createAddChartBlock(() => actions.addChart(page.id), isAtLimit));

  if (page.pendingScrollChartId && nodeByChartId.has(page.pendingScrollChartId)) {
    const target = nodeByChartId.get(page.pendingScrollChartId);
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    });
    if (typeof actions.consumePendingChartScroll === "function") {
      actions.consumePendingChartScroll(page.id, page.pendingScrollChartId);
    }
  }
}
