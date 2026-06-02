import { createChartCard } from "./chart-card.js?v=20260516-2";
import { storeConstants } from "../state/store.js";

const gridRuntimeByContainer = new WeakMap();

function createSyncBus() {
  const handlers = new Map();
  const cursorState = {
    hoverTimestamp: null,
    pinnedCursors: [],
  };

  function normalizeTimestamp(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.valueOf())) return null;
    return parsed.toISOString();
  }

  function normalizePinnedCursors(pins) {
    const next = [];
    const seen = new Set();
    (Array.isArray(pins) ? pins : []).forEach((pin, index) => {
      if (!pin || typeof pin !== "object") return;
      const timestamp = normalizeTimestamp(pin.timestamp);
      if (!timestamp) return;
      const id = String(pin.id || `pin-${index + 1}`);
      if (seen.has(id)) return;
      seen.add(id);
      next.push({ id, timestamp });
    });
    return next.slice(0, 5);
  }

  function clonePinnedCursors() {
    return cursorState.pinnedCursors.map((pin) => ({ ...pin }));
  }

  function broadcastCursorState() {
    const hoverTimestamp = cursorState.hoverTimestamp;
    const pins = clonePinnedCursors();
    handlers.forEach((handler) => {
      handler.setHoverTimestamp?.(hoverTimestamp);
      handler.setPinnedCursors?.(pins);
    });
  }

  return {
    register(chartId, handler) {
      if (!chartId || !handler) return () => {};
      handlers.set(chartId, handler);
      handler.setHoverTimestamp?.(cursorState.hoverTimestamp);
      handler.setPinnedCursors?.(clonePinnedCursors());
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
    setHoverTimestamp(sourceChartId, timestamp) {
      cursorState.hoverTimestamp = normalizeTimestamp(timestamp);
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.setHoverTimestamp?.(cursorState.hoverTimestamp);
      });
      return cursorState.hoverTimestamp;
    },
    clearHoverTimestamp(sourceChartId) {
      cursorState.hoverTimestamp = null;
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.setHoverTimestamp?.(null);
      });
      return null;
    },
    setPinnedCursors(sourceChartId, pins) {
      cursorState.pinnedCursors = normalizePinnedCursors(pins);
      const next = clonePinnedCursors();
      handlers.forEach((handler, chartId) => {
        if (chartId === sourceChartId) return;
        handler.setPinnedCursors?.(next);
      });
      return next;
    },
    clearCursors() {
      cursorState.hoverTimestamp = null;
      cursorState.pinnedCursors = [];
      broadcastCursorState();
    },
    getCursorState() {
      return {
        hoverTimestamp: cursorState.hoverTimestamp,
        pinnedCursors: clonePinnedCursors(),
      };
    },
  };
}

function renderEmptyState(container, page, actions) {
  const template = document.getElementById("empty-state-template");
  const fragment = template.content.cloneNode(true);
  const wrapper = document.createElement("div");
  wrapper.className = "chart-grid-empty-state";
  wrapper.dataset.role = "chart-grid-empty-state";
  wrapper.append(fragment);
  const iconNode = wrapper.querySelector(".empty-state-icon");
  if (iconNode) {
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "empty-state-icon-button";
    trigger.textContent = "+";
    trigger.title = "Add chart";
    trigger.setAttribute("aria-label", "Add chart");
    trigger.addEventListener("click", () => {
      actions.addChart(page.id);
    });
    iconNode.replaceWith(trigger);
  }
  container.append(wrapper);
  return wrapper;
}

function buildAddChartTile(page, actions) {
  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "chart-add-tile";
  tile.dataset.role = "chart-add-tile";
  tile.title = "Add chart";
  tile.setAttribute("aria-label", "Add chart");
  tile.innerHTML = `
    <span class="chart-add-tile-plus" aria-hidden="true">+</span>
    <span class="chart-add-tile-label">Add chart</span>
  `;
  tile.addEventListener("click", () => {
    actions.addChart(page.id);
  });
  return tile;
}

function isElementOutOfViewport(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
  return rect.bottom > viewportHeight || rect.top < 0;
}

function getRuntime(container) {
  let runtime = gridRuntimeByContainer.get(container);
  if (runtime) return runtime;
    runtime = {
      activePageId: null,
      columns: null,
      syncBus: createSyncBus(),
      chartEntries: new Map(),
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
  const tableColumns = snapshot.tableColumns || null;
  const runtime = getRuntime(container);

  if (runtime.activePageId !== page.id) {
    runtime.chartEntries.forEach((entry) => destroyEntry(entry));
    runtime.chartEntries.clear();
    runtime.emptyStateNode?.remove?.();
    runtime.emptyStateNode = null;
    runtime.columns = null;
    runtime.syncBus = createSyncBus();
    runtime.activePageId = page.id;
    container.innerHTML = "";
  }

  const columns = Math.max(1, Math.min(2, Number(page.gridColumns || 2)));
  const columnsChanged = runtime.columns !== columns;
  runtime.columns = columns;
  container.dataset.columns = String(columns);

  if (page.charts.length === 0) {
    runtime.chartEntries.forEach((entry) => destroyEntry(entry));
    runtime.chartEntries.clear();
    runtime.emptyStateNode?.remove?.();
    runtime.emptyStateNode = null;
    container.innerHTML = "";
    runtime.emptyStateNode = renderEmptyState(container, page, actions);
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
        tableColumns,
        actions,
        syncBus: runtime.syncBus,
      });
      entry = {
        node,
        api: node.__chartCardApi || null,
      };
      runtime.chartEntries.set(chart.id, entry);
    } else {
      entry.api?.update?.(chart, page, tableColumns);
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

  const canAddMoreCharts = page.charts.length < storeConstants.MAX_CHARTS_PER_PAGE;
  container.querySelectorAll('[data-role="chart-add-tile"]').forEach((node) => node.remove());
  if (canAddMoreCharts) {
    container.append(buildAddChartTile(page, actions));
  }

  if (columnsChanged) {
    requestAnimationFrame(() => {
      runtime.chartEntries.forEach((entry) => {
        entry?.api?.resize?.();
      });
    });
  }

  if (page.pendingScrollChartId && nodeByChartId.has(page.pendingScrollChartId)) {
    const targetId = page.pendingScrollChartId;
    const target = nodeByChartId.get(targetId);
    if (typeof actions.consumePendingChartScroll === "function") {
      actions.consumePendingChartScroll(page.id, targetId);
    }
    requestAnimationFrame(() => {
      if (!target || !target.isConnected || !isElementOutOfViewport(target)) return;
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
}
