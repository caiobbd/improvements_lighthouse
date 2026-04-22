import { createChartCard } from "./chart-card.js";
import { storeConstants } from "../state/store.js";

const gridRuntimeByContainer = new WeakMap();

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
    resetAllViews() {
      handlers.forEach((handler) => {
        handler.setPreviewXDomain?.(null);
        handler.resetView?.();
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
  wrapper.className = "chart-grid-empty-state";
  wrapper.dataset.role = "chart-grid-empty-state";
  wrapper.append(fragment);

  const action = document.createElement("button");
  action.type = "button";
  action.className = "primary-button";
  action.textContent = "Add first chart";
  action.addEventListener("click", onAdd);

  wrapper.querySelector(".empty-chart-state-container")?.append(action);
  container.append(wrapper);
  return wrapper;
}

function getRuntime(container) {
  let runtime = gridRuntimeByContainer.get(container);
  if (runtime) return runtime;
  runtime = {
    activePageId: null,
    syncBus: createSyncBus(),
    chartEntries: new Map(),
    addChartBlock: null,
    emptyStateNode: null,
  };
  gridRuntimeByContainer.set(container, runtime);
  return runtime;
}

function destroyEntry(entry) {
  entry?.api?.destroy?.();
  entry?.node?.remove?.();
}

export async function renderChartGrid(container, snapshot, actions) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return;
  const runtime = getRuntime(container);

  if (runtime.activePageId !== page.id) {
    runtime.chartEntries.forEach((entry) => destroyEntry(entry));
    runtime.chartEntries.clear();
    runtime.addChartBlock?.remove?.();
    runtime.addChartBlock = null;
    runtime.emptyStateNode?.remove?.();
    runtime.emptyStateNode = null;
    runtime.syncBus = createSyncBus();
    runtime.activePageId = page.id;
    container.innerHTML = "";
  }

  const columns = Math.max(1, Math.min(2, Number(page.gridColumns || 2)));
  container.dataset.columns = String(columns);

  if (page.charts.length === 0) {
    runtime.chartEntries.forEach((entry) => destroyEntry(entry));
    runtime.chartEntries.clear();
    runtime.addChartBlock?.remove?.();
    runtime.addChartBlock = null;
    runtime.emptyStateNode?.remove?.();
    runtime.emptyStateNode = null;
    container.innerHTML = "";
    runtime.emptyStateNode = renderEmptyState(container, () => actions.addChart(page.id));
    return;
  }

  runtime.emptyStateNode?.remove?.();
  runtime.emptyStateNode = null;
  container.querySelectorAll('[data-role="chart-grid-empty-state"]').forEach((node) => node.remove());

  const nodeByChartId = new Map();
  page.charts.forEach((chart) => {
    let entry = runtime.chartEntries.get(chart.id);
    if (!entry) {
      const node = createChartCard({
        chart,
        page,
        actions,
        syncBus: runtime.syncBus,
      });
      entry = {
        node,
        api: node.__chartCardApi || null,
      };
      runtime.chartEntries.set(chart.id, entry);
    } else {
      entry.api?.update?.(chart, page);
    }

    const node = entry.node;
    const chartId = chart.id;
    node.dataset.chartId = chartId;
    nodeByChartId.set(chartId, node);
  });

  const activeChartIds = new Set(page.charts.map((chart) => chart.id));
  Array.from(runtime.chartEntries.entries()).forEach(([chartId, entry]) => {
    if (activeChartIds.has(chartId)) return;
    destroyEntry(entry);
    runtime.chartEntries.delete(chartId);
  });

  page.charts.forEach((chart) => {
    const node = nodeByChartId.get(chart.id);
    if (node) {
      container.append(node);
    }
  });

  const isAtLimit = page.charts.length >= storeConstants.MAX_CHARTS_PER_PAGE;
  runtime.addChartBlock?.remove?.();
  runtime.addChartBlock = createAddChartBlock(() => actions.addChart(page.id), isAtLimit);
  container.append(runtime.addChartBlock);

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
