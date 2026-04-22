import { getTimeSeries, getTimeSeriesByTags, ApiClientError } from "../services/api-client.js";
import { renderLineChart } from "./d3-line-chart.js";
import { createLegendPanel } from "./legend-panel.js";

const SERIES_COLORS = [
  "#2a6f97",
  "#188b84",
  "#ce7c3a",
  "#b84b43",
  "#6f7e8f",
  "#3f8d48",
  "#4e7bc2",
  "#9f6ab8",
  "#b27b3a",
  "#2d8f9f",
  "#637989",
  "#a35757",
];
const SENSOR_DRAG_MIME = "application/x-lighthouse-sensor-tag";
const GLOBAL_SENSOR_DRAG_KEY = "__lighthouseDraggedSensorTag";
const INLINE_NOTICE_MS = 2600;
const chartRuntimeCache = new Map();

function resolveDateParams(page) {
  const end = new Date();
  let start = new Date(end);

  if (page.datePreset === "custom" && page.startDate && page.endDate) {
    return { start_date: page.startDate, end_date: page.endDate };
  }

  if (page.datePreset === "7d") {
    start.setDate(end.getDate() - 7);
  } else if (page.datePreset === "90d") {
    start.setDate(end.getDate() - 90);
  } else {
    start.setDate(end.getDate() - 30);
  }

  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

function resolveFallbackXDomainForPage(page) {
  const { start_date, end_date } = resolveDateParams(page);
  const start = new Date(`${start_date}T00:00:00Z`);
  const end = new Date(`${end_date}T23:59:59Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    const fallbackEnd = new Date();
    const fallbackStart = new Date(fallbackEnd);
    fallbackStart.setDate(fallbackEnd.getDate() - 30);
    return [fallbackStart.toISOString(), fallbackEnd.toISOString()];
  }
  return [start.toISOString(), end.toISOString()];
}

function resolveEffectiveWindow(page, dateParams) {
  if (String(page?.frequencyMode || "").toLowerCase() === "manual") {
    const selected = String(page?.frequencyWindow || "").toLowerCase();
    if (["15m", "1h", "6h", "1d"].includes(selected)) {
      return selected;
    }
  }

  const start = new Date(`${dateParams.start_date}T00:00:00Z`);
  const end = new Date(`${dateParams.end_date}T00:00:00Z`);
  const daySpan = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  if (daySpan <= 1) return "15m";
  if (daySpan <= 7) return "1h";
  if (daySpan <= 30) return "6h";
  return "1d";
}

function normalizeMessage(error) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "Unable to load chart data.";
}

function toTagKey(tag) {
  const itemId = String(tag?.itemId || tag?.item_id || "").trim();
  const attributeId = String(tag?.attributeId || tag?.attribute_id || "").trim();
  const attributeName = String(tag?.attributeName || tag?.attribute_name || "").trim().toLowerCase();
  return `${itemId}::${attributeId || attributeName}`;
}

function hashToPaletteIndex(value) {
  const input = String(value || "");
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash) % SERIES_COLORS.length;
}

function getTagColor(tag) {
  return SERIES_COLORS[hashToPaletteIndex(toTagKey(tag))];
}

function normalizeTag(tag) {
  if (!tag) return null;
  const normalized = {
    assetName: tag.assetName || tag.asset_name || "",
    itemId: tag.itemId || tag.item_id || "",
    attributeId: tag.attributeId || tag.attribute_id || "",
    attributeName: tag.attributeName || tag.attribute_name || "",
    label: tag.label || tag.attributeName || tag.attribute_name || "",
  };
  if (!normalized.itemId || !(normalized.attributeId || normalized.attributeName)) {
    return null;
  }
  if (!normalized.label) {
    normalized.label = normalized.attributeName || normalized.attributeId;
  }
  return normalized;
}

function getChartTags(chart) {
  if (Array.isArray(chart?.selectedTags) && chart.selectedTags.length > 0) {
    return chart.selectedTags.map(normalizeTag).filter(Boolean);
  }

  const fallbackAttribute = chart?.attributeName || chart?.fromAttributes?.[0] || "";
  if (!chart?.itemId || !(chart?.attributeId || fallbackAttribute)) {
    return [];
  }

  return [
    {
      assetName: chart.assetName || "",
      itemId: chart.itemId || "",
      attributeId: chart.attributeId || "",
      attributeName: chart.attributeName || fallbackAttribute,
      label: chart.attributeName || fallbackAttribute,
    },
  ];
}

function parseDraggedSensorTag(event) {
  const globalRaw =
    typeof window !== "undefined" && window?.[GLOBAL_SENSOR_DRAG_KEY]
      ? window[GLOBAL_SENSOR_DRAG_KEY]
      : "";
  const transfer = event?.dataTransfer;
  const raw = transfer
    ? transfer.getData(SENSOR_DRAG_MIME) ||
      transfer.getData("text/plain") ||
      transfer.getData("application/json") ||
      globalRaw
    : globalRaw;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return normalizeTag(parsed);
  } catch {
    return null;
  }
}

function canAcceptDraggedSensorTag(event) {
  const transfer = event?.dataTransfer;
  if (!transfer) {
    return Boolean(parseDraggedSensorTag(event));
  }
  const types = Array.from(transfer.types || []);
  if (
    types.includes(SENSOR_DRAG_MIME) ||
    types.includes("text/plain") ||
    types.includes("application/json")
  ) {
    return true;
  }
  return Boolean(parseDraggedSensorTag(event));
}

function buildChartPatchFromTags(tags, chart) {
  const selectedTags = tags.map(normalizeTag).filter(Boolean);
  const first = selectedTags[0] || null;

  if (!first) {
    return {
      selectedTags: [],
      assetName: "",
      itemId: null,
      attributeId: null,
      attributeName: null,
      fromAttributes: [],
      fromCategories: [],
    };
  }

  return {
    selectedTags,
    assetName: first.assetName || chart.assetName || "",
    itemId: first.itemId || null,
    attributeId: first.attributeId || null,
    attributeName: first.attributeName || null,
    fromAttributes: [],
    fromCategories: [],
  };
}

function toSerializableDomain(domain) {
  if (!Array.isArray(domain) || domain.length !== 2) return null;
  const start = new Date(domain[0]);
  const end = new Date(domain[1]);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
    return null;
  }
  return [start.toISOString(), end.toISOString()];
}

function cloneForRuntime(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function buildChartRuntimeKey(page, chart) {
  return `${String(page?.id || "")}::${String(chart?.id || "")}`;
}

function buildQueryContextKey(page) {
  const dateParams = resolveDateParams(page);
  const effectiveWindow = resolveEffectiveWindow(page, dateParams);
  return `${dateParams.start_date}|${dateParams.end_date}|${effectiveWindow}`;
}

function buildTagSetKey(tags) {
  return (Array.isArray(tags) ? tags : [])
    .map((tag) => toTagKey(tag))
    .sort()
    .join("|");
}

function buildActionMenu(entries) {
  const menu = document.createElement("div");
  menu.className = "chart-action-menu";
  entries.forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.label;
    button.disabled = Boolean(entry.disabled);
    if (entry.title) {
      button.title = entry.title;
    }
    if (entry.disabled) {
      button.classList.add("is-disabled");
    }
    button.addEventListener("click", () => {
      if (entry.disabled) return;
      entry.onClick?.();
    });
    menu.append(button);
  });
  return menu;
}

async function loadSeriesForTags(tags, page, options = {}) {
  const dateParams = resolveDateParams(page);
  const window = resolveEffectiveWindow(page, dateParams);
  const forceRefresh = Boolean(options.forceRefresh);
  const payload = await getTimeSeriesByTags({
    tags: tags.map((tag) => ({
      tag_key: toTagKey(tag),
      asset_name: tag.assetName,
      item_id: tag.itemId,
      attribute_id: tag.attributeId || undefined,
      attribute_name: tag.attributeName || undefined,
      label: tag.label,
    })),
    window,
    start_date: dateParams.start_date,
    end_date: dateParams.end_date,
    force_refresh: forceRefresh,
  });

  const settled = Array.isArray(payload?.tags)
    ? payload.tags.map((entry) => ({ status: "fulfilled", value: entry }))
    : [];
  const series = [];
  const errors = [];
  const tagByKey = new Map(tags.map((tag) => [toTagKey(tag), tag]));

  settled.forEach((result, index) => {
    if (result.status !== "fulfilled") {
      errors.push(normalizeMessage(result.reason));
      return;
    }

    if (result.value?.error) {
      errors.push(String(result.value.error));
      return;
    }

    const sourceTag =
      tagByKey.get(String(result.value?.tag_key || "")) ||
      tags[index] ||
      normalizeTag(result.value);
    const lines = result.value?.series || [];
    lines.forEach((line) => {
      if (!Array.isArray(line.points) || line.points.length === 0) return;
      const tagKey = toTagKey(sourceTag);
      series.push({
        ...line,
        id: `${tagKey}::${line.name || "series"}`,
        tagKey,
        name: sourceTag?.label || line.name,
        color: getTagColor(sourceTag),
      });
    });
  });

  if (series.length === 0 && errors.length > 0) {
    throw new ApiClientError(errors[0]);
  }
  return {
    series,
    effectiveWindow: payload?.effective_window || payload?.window || window,
  };
}

function getLineTagKey(line) {
  return String(line?.tagKey || "");
}

function computeYDomainFromSeries(series) {
  const values = (Array.isArray(series) ? series : []).flatMap((line) =>
    (Array.isArray(line?.points) ? line.points : [])
      .map((point) => Number(point?.value))
      .filter((value) => Number.isFinite(value)),
  );

  if (values.length === 0) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  if (max <= min) {
    const pad = Math.max(Math.abs(max) * 0.08, 0.5);
    return [min - pad, max + pad];
  }

  const padding = (max - min) * 0.08;
  return [min - padding, max + padding];
}

export function createChartCard({ chart, page, actions, syncBus = null, forceRefresh = false }) {
  const card = document.createElement("article");
  card.className = "chart-card";

  const header = document.createElement("header");
  header.className = "chart-card-header";

  const titleGroup = document.createElement("div");
  titleGroup.className = "chart-title-group";

  const title = document.createElement("h3");
  title.className = "chart-card-title";
  title.textContent = chart.title || "Untitled chart";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.className = "chart-title-input";
  titleInput.value = title.textContent;
  titleInput.hidden = true;

  const editTitle = document.createElement("button");
  editTitle.type = "button";
  editTitle.className = "chart-title-edit icon-button";
  editTitle.textContent = "Edit";
  editTitle.title = "Rename chart";
  editTitle.setAttribute("aria-label", "Rename chart");

  titleGroup.append(title, titleInput, editTitle);

  const actionGroup = document.createElement("div");
  actionGroup.className = "chart-actions";

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "icon-button";
  refresh.textContent = "Refresh";
  refresh.dataset.role = "chart-refresh";

  const helpWrap = document.createElement("div");
  helpWrap.className = "chart-help";

  const helpButton = document.createElement("button");
  helpButton.type = "button";
  helpButton.className = "icon-button chart-help-button";
  helpButton.textContent = "?";
  helpButton.title = "Chart interaction shortcuts";
  helpButton.setAttribute("aria-label", "Chart interaction shortcuts");

  const helpTooltip = document.createElement("div");
  helpTooltip.className = "chart-help-tooltip";
  helpTooltip.innerHTML = `
    <p><strong>Shortcuts</strong></p>
    <p>Drag: Zoom XY</p>
    <p>Ctrl + Drag: Zoom X</p>
    <p>Alt + Drag: Zoom Y</p>
    <p>Shift + Drag: Pan X</p>
    <p>Ctrl + Wheel: Zoom X</p>
    <p>Alt + Wheel: Zoom Y</p>
    <p>Ctrl + Shift + Drag: Sync X zoom (all charts)</p>
    <p>Use Actions menu for reset commands</p>
  `;
  helpWrap.append(helpButton, helpTooltip);

  const menuButton = document.createElement("button");
  menuButton.type = "button";
  menuButton.className = "icon-button";
  menuButton.textContent = "Actions";

  actionGroup.append(refresh, helpWrap, menuButton);
  header.append(titleGroup, actionGroup);

  const body = document.createElement("div");
  body.className = "chart-card-body";
  body.innerHTML = "";

  const footer = document.createElement("div");
  footer.className = "chart-card-footer";

  const inlineNotice = document.createElement("div");
  inlineNotice.className = "chart-inline-notice hidden";

  header.classList.add("chart-drop-target", "chart-drop-zone-header");
  body.classList.add("chart-drop-target", "chart-drop-zone-body");
  footer.classList.add("chart-drop-target", "chart-drop-zone-tags");

  const runtimeKey = buildChartRuntimeKey(page, chart);
  const cachedRuntime = chartRuntimeCache.get(runtimeKey);
  let currentSeries = Array.isArray(cachedRuntime?.series) ? cloneForRuntime(cachedRuntime.series) : [];
  const hiddenSeries = new Set(Array.isArray(cachedRuntime?.hiddenSeries) ? cachedRuntime.hiddenSeries : []);
  let chartRenderHandle = null;
  let latestLoadToken = 0;
  let inlineNoticeTimeout = null;
  let loadState = cachedRuntime?.loadState || (currentSeries.length > 0 ? "has_data" : "idle");
  let lastQueryContextKey = cachedRuntime?.queryContextKey || null;
  let lastTagSetKey = cachedRuntime?.tagSetKey || "";
  const interactionState = {
    currentXDomain: Array.isArray(cachedRuntime?.interactionState?.currentXDomain)
      ? cloneForRuntime(cachedRuntime.interactionState.currentXDomain)
      : null,
    currentYDomain: Array.isArray(cachedRuntime?.interactionState?.currentYDomain)
      ? cloneForRuntime(cachedRuntime.interactionState.currentYDomain)
      : null,
    previewXDomain: Array.isArray(cachedRuntime?.interactionState?.previewXDomain)
      ? cloneForRuntime(cachedRuntime.interactionState.previewXDomain)
      : null,
  };

  function persistRuntimeCache() {
    chartRuntimeCache.set(runtimeKey, {
      series: cloneForRuntime(currentSeries),
      hiddenSeries: Array.from(hiddenSeries),
      loadState,
      queryContextKey: lastQueryContextKey,
      tagSetKey: lastTagSetKey,
      interactionState: {
        currentXDomain: toSerializableDomain(interactionState.currentXDomain),
        currentYDomain: Array.isArray(interactionState.currentYDomain)
          ? cloneForRuntime(interactionState.currentYDomain)
          : null,
        previewXDomain: toSerializableDomain(interactionState.previewXDomain),
      },
    });
  }

  function getEmptyStateMessage() {
    if (loadState === "loading") {
      return "Loading timeseries data...";
    }
    if (loadState === "no_data") {
      return "No data available for selected tags and date range.";
    }
    return "Select tags to load data.";
  }

  function setInlineNotice(message = "") {
    if (inlineNoticeTimeout) {
      window.clearTimeout(inlineNoticeTimeout);
      inlineNoticeTimeout = null;
    }
    const text = String(message || "").trim();
    if (!text) {
      inlineNotice.classList.add("hidden");
      inlineNotice.textContent = "";
      return;
    }
    inlineNotice.textContent = text;
    inlineNotice.classList.remove("hidden");
    inlineNoticeTimeout = window.setTimeout(() => {
      inlineNotice.classList.add("hidden");
      inlineNotice.textContent = "";
      inlineNoticeTimeout = null;
    }, INLINE_NOTICE_MS);
  }

  function persistChartPatch(patch) {
    if (typeof actions.updateChartSilent === "function") {
      actions.updateChartSilent(page.id, chart.id, patch);
    } else {
      actions.updateChart(page.id, chart.id, patch);
    }
  }

  function persistChartTitle(nextTitle) {
    const cleaned = String(nextTitle || "").trim();
    if (!cleaned || cleaned === chart.title) {
      title.textContent = chart.title || "Untitled chart";
      titleInput.value = title.textContent;
      return;
    }
    chart.title = cleaned;
    title.textContent = cleaned;
    titleInput.value = cleaned;
    persistChartPatch({ title: cleaned });
  }

  function setTitleEditing(editing) {
    title.hidden = editing;
    titleInput.hidden = !editing;
    if (editing) {
      titleInput.value = title.textContent;
      titleInput.focus();
      titleInput.select();
    }
  }

  editTitle.addEventListener("click", () => {
    setTitleEditing(true);
  });

  titleInput.addEventListener("blur", () => {
    persistChartTitle(titleInput.value);
    setTitleEditing(false);
  });

  titleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      persistChartTitle(titleInput.value);
      setTitleEditing(false);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      titleInput.value = title.textContent;
      setTitleEditing(false);
    }
  });

  function clearModeForGuardrails() {
    const patch = {};
    if (chart.normalizationEnabled && chart.splitYAxisEnabled) {
      chart.splitYAxisEnabled = false;
      patch.splitYAxisEnabled = false;
      setInlineNotice("Split Y disabled while normalization is enabled.");
    }
    if (chart.splitYAxisEnabled && currentSeries.length > 4) {
      chart.splitYAxisEnabled = false;
      patch.splitYAxisEnabled = false;
      setInlineNotice("Split Y disabled because this chart has more than 4 tags.");
    }
    if (Object.keys(patch).length > 0) {
      persistChartPatch(patch);
    }
  }

  const unregisterSync =
    typeof syncBus?.register === "function"
      ? syncBus.register(chart.id, {
          setPreviewXDomain(range) {
            interactionState.previewXDomain = toSerializableDomain(range);
            chartRenderHandle?.setPreviewXDomain?.(interactionState.previewXDomain);
          },
          applyExternalXDomain(range) {
            interactionState.currentXDomain = toSerializableDomain(range);
            chartRenderHandle?.applyExternalXDomain?.(interactionState.currentXDomain);
          },
          resetView() {
            interactionState.previewXDomain = null;
            chartRenderHandle?.setPreviewXDomain?.(null);
            chartRenderHandle?.resetView?.();
            persistRuntimeCache();
          },
        })
      : () => {};

  function renderLegend() {
    footer.innerHTML = "";
    if (!currentSeries.length) return;
    footer.append(
      createLegendPanel({
        series: currentSeries,
        hiddenSeries,
        onToggle: (seriesKey) => {
          if (hiddenSeries.has(seriesKey)) hiddenSeries.delete(seriesKey);
          else hiddenSeries.add(seriesKey);
          drawChart();
          renderLegend();
          renderActionMenu();
          persistRuntimeCache();
        },
        onRemove: (seriesKey, line) => {
          const lineTagKey = getLineTagKey(line);
          if (!lineTagKey) return;

          const tags = getChartTags(chart);
          const nextTags = tags.filter((tag) => toTagKey(tag) !== lineTagKey);
          const patch = buildChartPatchFromTags(nextTags, chart);
          Object.assign(chart, patch);

          Array.from(hiddenSeries).forEach((hiddenKey) => {
            if (String(hiddenKey).startsWith(`${lineTagKey}::`)) {
              hiddenSeries.delete(hiddenKey);
            }
          });
          hiddenSeries.delete(seriesKey);
          persistChartPatch(patch);
          void load();
          persistRuntimeCache();
        },
      }),
    );
  }

  function renderYAutoScaleButton() {
    if (!chartRenderHandle?.autoScaleY || !currentSeries.length) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chart-y-autoscale";
    button.textContent = "Y";
    button.title = "Auto-scale Y axis";
    button.setAttribute("aria-label", "Auto-scale Y axis");
    button.addEventListener("click", () => {
      chartRenderHandle.autoScaleY();
    });
    body.append(button);
  }

  function ensureLoadingOverlay() {
    let overlay = body.querySelector('[data-role="chart-loading-overlay"]');
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "chart-body-loading-banner";
      overlay.dataset.role = "chart-loading-overlay";
      body.append(overlay);
    }
    overlay.textContent = "Loading timeseries data...";
    overlay.classList.toggle("visible", card.classList.contains("is-loading"));
  }

  function drawChart() {
    if (chartRenderHandle?.destroy) {
      chartRenderHandle.destroy();
    }

    body.innerHTML = "";
    const alarmSpan =
      String(page?.pageType || "").toLowerCase() === "alarm" && page?.alarmMeta
        ? {
            start: page.alarmMeta.spanStart || page.alarmMeta.startDate || null,
            end: page.alarmMeta.spanEnd || page.alarmMeta.endDate || null,
          }
        : null;
    chartRenderHandle = renderLineChart({
      container: body,
      series: currentSeries,
      hiddenSeries,
      height: 300,
      alarmSpan,
      interactionState,
      previewXDomain: interactionState.previewXDomain,
      fallbackXDomain: resolveFallbackXDomainForPage(page),
      emptyStateMessage: getEmptyStateMessage(),
      normalizationEnabled: chart.normalizationEnabled === true,
      splitYAxisEnabled: chart.splitYAxisEnabled === true,
      onInteractionStateChange: (nextState) => {
        if (nextState?.xDomain) interactionState.currentXDomain = nextState.xDomain;
        if (nextState?.yDomain) interactionState.currentYDomain = nextState.yDomain;
        interactionState.previewXDomain = nextState?.previewXDomain || null;
        persistRuntimeCache();
      },
      onSyncPreviewChange: (range) => {
        interactionState.previewXDomain = range || null;
        if (range) {
          syncBus?.broadcastPreview?.(chart.id, range);
        } else {
          syncBus?.clearPreview?.(chart.id);
        }
        persistRuntimeCache();
      },
      onSyncCommit: (range) => {
        if (!range) return;
        interactionState.currentXDomain = range;
        interactionState.previewXDomain = null;
        syncBus?.commitXDomain?.(chart.id, range);
        persistRuntimeCache();
      },
    });
    if (interactionState.previewXDomain) {
      chartRenderHandle.setPreviewXDomain?.(interactionState.previewXDomain);
    }
    renderYAutoScaleButton();
    ensureLoadingOverlay();
  }

  function clearDropState() {
    header.classList.remove("is-drop-active");
    body.classList.remove("is-drop-active");
    footer.classList.remove("is-drop-active");
    card.classList.remove("is-drop-target-active");
  }

  function resolveDropZone(event) {
    const pointerY = Number(event?.clientY || 0);
    const headerRect = header.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();

    if (pointerY <= headerRect.bottom) {
      return { zone: "header", element: header };
    }
    if (pointerY >= footerRect.top) {
      return { zone: "tags", element: footer };
    }
    return { zone: "body", element: body };
  }

  function setActiveDropZone(zoneElement) {
    clearDropState();
    if (!zoneElement) return;
    zoneElement.classList.add("is-drop-active");
    card.classList.add("is-drop-target-active");
  }

  function wireCardDropHandling() {
    if (typeof actions.onSensorDropToChart !== "function") return;

    card.addEventListener(
      "dragenter",
      (event) => {
        if (!canAcceptDraggedSensorTag(event)) return;
        event.preventDefault();
        const target = resolveDropZone(event);
        setActiveDropZone(target.element);
      },
      true,
    );

    card.addEventListener(
      "dragover",
      (event) => {
        if (!canAcceptDraggedSensorTag(event)) return;
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        const target = resolveDropZone(event);
        setActiveDropZone(target.element);
      },
      true,
    );

    card.addEventListener(
      "dragleave",
      (event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget && card.contains(nextTarget)) {
          return;
        }
        clearDropState();
      },
      true,
    );

    card.addEventListener(
      "drop",
      (event) => {
        const sensorTag = parseDraggedSensorTag(event);
        if (typeof window !== "undefined" && window?.[GLOBAL_SENSOR_DRAG_KEY]) {
          delete window[GLOBAL_SENSOR_DRAG_KEY];
        }
        const target = resolveDropZone(event);
        clearDropState();
        if (!sensorTag) return;

        event.preventDefault();
        event.stopPropagation();
        actions.onSensorDropToChart({
          pageId: page.id,
          chartId: chart.id,
          sensorTag,
          dropZone: target.zone,
        });
      },
      true,
    );
  }

  function setLoadingState(loading) {
    if (loading) {
      loadState = "loading";
    }
    refresh.disabled = loading;
    refresh.textContent = loading ? "Refreshing..." : "Refresh";
    card.classList.toggle("is-loading", loading);
    if (loading && currentSeries.length === 0) {
      drawChart();
      persistRuntimeCache();
      return;
    }
    ensureLoadingOverlay();
    persistRuntimeCache();
  }

  function toggleNormalization() {
    const nextEnabled = chart.normalizationEnabled !== true;
    const patch = { normalizationEnabled: nextEnabled };
    if (nextEnabled && chart.splitYAxisEnabled) {
      patch.splitYAxisEnabled = false;
      chart.splitYAxisEnabled = false;
      setInlineNotice("Split Y disabled while normalization is enabled.");
    }
    chart.normalizationEnabled = nextEnabled;
    persistChartPatch(patch);
    drawChart();
    renderLegend();
    renderActionMenu();
    persistRuntimeCache();
  }

  function toggleSplitYAxis() {
    if (chart.normalizationEnabled) {
      setInlineNotice("Split Y is unavailable while normalization is enabled.");
      return;
    }
    if (currentSeries.length > 4) {
      setInlineNotice("Split Y supports up to 4 tags per chart.");
      return;
    }

    const nextEnabled = chart.splitYAxisEnabled !== true;
    chart.splitYAxisEnabled = nextEnabled;
    persistChartPatch({ splitYAxisEnabled: nextEnabled });
    drawChart();
    renderLegend();
    renderActionMenu();
    persistRuntimeCache();
  }

  function resetZoom() {
    chartRenderHandle?.resetView?.();
  }

  function resetZoomAllPlots() {
    syncBus?.resetAllViews?.();
  }

  function renderActionMenu() {
    const splitBlockedByNormalization = chart.normalizationEnabled === true;
    const splitBlockedByCount = currentSeries.length > 4;
    const splitBlockedReason = splitBlockedByNormalization
      ? "Unavailable while normalization is active."
      : splitBlockedByCount
        ? "Available only for charts with up to 4 tags."
        : "";

    const entries = [
      {
        label: "Add new tags",
        onClick: () => actions.editChartTags(page.id, chart),
      },
      {
        label: "Reset Zoom",
        onClick: () => resetZoom(),
      },
      {
        label: "Reset Zoom All Plots",
        onClick: () => resetZoomAllPlots(),
      },
      {
        label: chart.normalizationEnabled ? "Disable Normalization" : "Enable Normalization",
        onClick: () => toggleNormalization(),
      },
      {
        label: chart.splitYAxisEnabled ? "Disable Split Y" : "Enable Split Y",
        disabled: splitBlockedByNormalization || splitBlockedByCount,
        title: splitBlockedReason,
        onClick: () => toggleSplitYAxis(),
      },
      {
        label: "Delete chart",
        onClick: () => actions.removeChart(page.id, chart.id),
      },
    ];

    const previous = actionGroup.querySelector(".chart-action-menu");
    if (previous) {
      previous.remove();
    }
    actionGroup.append(buildActionMenu(entries));
  }

  async function load(options = {}) {
    const loadToken = ++latestLoadToken;
    const requestKey = typeof actions.beginChartRefresh === "function" ? actions.beginChartRefresh(chart.id) : null;
    const tags = getChartTags(chart);
    const hasLegacyQuery =
      Boolean(chart.attributeId || chart.attributeName) ||
      (Array.isArray(chart.fromAttributes) && chart.fromAttributes.length > 0) ||
      (Array.isArray(chart.fromCategories) && chart.fromCategories.length > 0);
    const hasQuery = tags.length > 0 || hasLegacyQuery;
    const hasRenderedSeries = currentSeries.length > 0;
    const forceRefresh = Boolean(options.forceRefresh);
    const queryContextKey = buildQueryContextKey(page);
    const tagSetKey = buildTagSetKey(tags);
    const queryContextChanged = queryContextKey !== lastQueryContextKey;

    if (!hasQuery) {
      loadState = "idle";
      currentSeries = [];
      hiddenSeries.clear();
      interactionState.currentYDomain = null;
      lastQueryContextKey = queryContextKey;
      lastTagSetKey = tagSetKey;
      drawChart();
      renderLegend();
      renderActionMenu();
      persistRuntimeCache();
      if (typeof actions.endChartRefresh === "function") {
        actions.endChartRefresh(requestKey);
      }
      return;
    }

    setLoadingState(true);

    try {
      if (tags.length > 0) {
        const requestedTagKeys = new Set(tags.map((tag) => toTagKey(tag)));
        currentSeries = currentSeries.filter((line) => requestedTagKeys.has(getLineTagKey(line)));
        Array.from(hiddenSeries).forEach((seriesKey) => {
          const [seriesTagKey] = String(seriesKey || "").split("::");
          if (seriesTagKey && !requestedTagKeys.has(seriesTagKey)) {
            hiddenSeries.delete(seriesKey);
          }
        });

        const hasSeriesForTag = new Set(currentSeries.map((line) => getLineTagKey(line)).filter(Boolean));
        let tagsToFetch = tags;
        if (!forceRefresh && !queryContextChanged && hasRenderedSeries) {
          tagsToFetch = tags.filter((tag) => !hasSeriesForTag.has(toTagKey(tag)));
        }

        if (tagsToFetch.length > 0) {
          const result = await loadSeriesForTags(tagsToFetch, page, { forceRefresh });
          if (loadToken !== latestLoadToken) return;

          const fetchedTagKeys = new Set(tagsToFetch.map((tag) => toTagKey(tag)));
          const fullReload = forceRefresh || queryContextChanged || tagsToFetch.length === tags.length;
          if (fullReload) {
            currentSeries = result.series;
          } else {
            const retained = currentSeries.filter((line) => !fetchedTagKeys.has(getLineTagKey(line)));
            currentSeries = [...retained, ...result.series];
          }
        }
      } else {
        const dateParams = resolveDateParams(page);
        const payload = await getTimeSeries({
          asset_name: chart.assetName,
          item_id: chart.itemId,
          attribute_id: chart.attributeId,
          attribute_name: chart.attributeName,
          window: resolveEffectiveWindow(page, dateParams),
          start_date: dateParams.start_date,
          end_date: dateParams.end_date,
          from_categories: chart.fromCategories || [],
          from_attributes: chart.fromAttributes || [],
          force_refresh: forceRefresh,
        });
        if (loadToken !== latestLoadToken) return;
        currentSeries = (payload.series || []).map((line, index) => ({
          ...line,
          id: String(line.id || line.name || `legacy-${index + 1}`),
          color: line.color || SERIES_COLORS[index % SERIES_COLORS.length],
        }));
      }

      lastQueryContextKey = queryContextKey;
      lastTagSetKey = tagSetKey;
      loadState = currentSeries.length > 0 ? "has_data" : "no_data";
      if (currentSeries.length > 0) {
        interactionState.currentYDomain =
          chart.normalizationEnabled === true ? [0, 1] : computeYDomainFromSeries(currentSeries);
      } else {
        interactionState.currentYDomain = null;
      }
      clearModeForGuardrails();
      drawChart();
      renderLegend();
      renderActionMenu();
      persistRuntimeCache();
    } catch (error) {
      if (loadToken !== latestLoadToken) return;
      const message = normalizeMessage(error);
      setInlineNotice(message);
      console.warn("Chart refresh failed; keeping previous data", error);
      if (!hasRenderedSeries) {
        loadState = "no_data";
        currentSeries = [];
        interactionState.currentYDomain = null;
        drawChart();
        renderLegend();
      }
      persistRuntimeCache();
    } finally {
      if (typeof actions.endChartRefresh === "function") {
        actions.endChartRefresh(requestKey);
      }
      if (loadToken === latestLoadToken) {
        setLoadingState(false);
      }
    }
  }

  renderActionMenu();

  let actionMenuCloseTimer = null;
  const ACTION_MENU_CLOSE_DELAY_MS = 180;

  function clearActionMenuCloseTimer() {
    if (actionMenuCloseTimer) {
      window.clearTimeout(actionMenuCloseTimer);
      actionMenuCloseTimer = null;
    }
  }

  function openActionMenu() {
    clearActionMenuCloseTimer();
    actionGroup.classList.add("is-menu-open");
  }

  function scheduleActionMenuClose() {
    clearActionMenuCloseTimer();
    actionMenuCloseTimer = window.setTimeout(() => {
      actionGroup.classList.remove("is-menu-open");
      actionMenuCloseTimer = null;
    }, ACTION_MENU_CLOSE_DELAY_MS);
  }

  actionGroup.addEventListener("mouseenter", openActionMenu);
  actionGroup.addEventListener("mouseleave", scheduleActionMenuClose);
  actionGroup.addEventListener("focusin", openActionMenu);
  actionGroup.addEventListener("focusout", scheduleActionMenuClose);
  actionGroup.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      actionGroup.classList.remove("is-menu-open");
      clearActionMenuCloseTimer();
    }
  });

  helpWrap.addEventListener("mouseenter", () => helpWrap.classList.add("open"));
  helpWrap.addEventListener("mouseleave", () => helpWrap.classList.remove("open"));
  helpWrap.addEventListener("focusin", () => helpWrap.classList.add("open"));
  helpWrap.addEventListener("focusout", () => helpWrap.classList.remove("open"));

  refresh.addEventListener("click", () => {
    void load({ forceRefresh: true });
  });

  body.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.altKey) return;
      event.preventDefault();
      event.stopPropagation();
      chartRenderHandle?.handleWheelZoom?.(event);
    },
    { passive: false },
  );

  wireCardDropHandling();

  card.append(header, body, inlineNotice, footer);
  drawChart();
  renderLegend();
  persistRuntimeCache();
  queueMicrotask(() => {
    void load({ forceRefresh });
  });

  card.__chartCardApi = {
    update(nextChart, nextPage) {
      chart = nextChart;
      page = nextPage;
      title.textContent = chart.title || "Untitled chart";
      titleInput.value = title.textContent;
      renderActionMenu();
      void load();
    },
    destroy() {
      unregisterSync();
      if (inlineNoticeTimeout) {
        window.clearTimeout(inlineNoticeTimeout);
        inlineNoticeTimeout = null;
      }
      clearActionMenuCloseTimer();
      chartRenderHandle?.destroy?.();
    },
  };

  return card;
}
