import { store, storeConstants } from "./state/store.js";
import {
  ApiClientError,
  getEquipmentSensors,
  getEquipmentTree,
  getIntelEvents,
  getItemAttributes,
  getPages,
  getSensorContextBatch,
  getTableColumnsManifest,
} from "./services/api-client.js";
import { renderTabNavigation } from "./components/tab-navigation.js?v=20260519-1";
import { renderPageControls } from "./components/page-controls.js?v=20260519-1";
import { renderChartGrid } from "./components/chart-grid.js?v=20260519-1";
import { openChartSelectorModal } from "./components/chart-selector-modal.js";
import { openCustomAlarmModal } from "./components/custom-alarm-modal.js?v=20260504-1";
import { renderSafeMarkdown } from "./utils/safe-markdown.js";

const ROOT_PARENT_KEY = "__root__";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "lighthouse.charts.sidebars.collapsed.v1";
const SIDEBAR_WIDTH_STORAGE_KEY = "lighthouse.charts.sidebars.width.v1";
const SIDEBAR_ACTIVE_CONTEXT_STORAGE_KEY = "lighthouse.charts.sidebars.activeContext.v1";
const SIDEBAR_MIN_WIDTH_PX = 320;
const SIDEBAR_MAX_WIDTH_PX = 440;
const SIDEBAR_DEFAULT_WIDTH_PX = 360;
const SIDEBAR_COLLAPSED_WIDTH_PX = 56;
const SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX = 1400;
const SIDEBAR_CONTEXT_EQUIPMENT = "equipment";
const SIDEBAR_CONTEXT_SENSORS = "sensors";
const SIDEBAR_CONTEXT_EVENTS = "events";
const SENSOR_DRAG_MIME = "application/x-lighthouse-sensor-tag";
const GLOBAL_SENSOR_DRAG_KEY = "__lighthouseDraggedSensorTag";
const ALARM_NARRATIVE_COLLAPSE_THRESHOLD = 900;
const UNIT_FALLBACK_LABEL = "N/A";
const CHART_TITLE_SEPARATOR = " - ";

const tabNavigationRoot = document.getElementById("tab-navigation");
const pageControlsRoot = document.getElementById("page-controls");
const refreshProgressRoot = document.getElementById("refresh-progress");
const alarmDetailsRowRoot = document.getElementById("alarm-details-row");
const chartGridRoot = document.getElementById("chart-grid");
const sidebarsRoot = document.getElementById("charts-sidebars");
const chartsPageRoot = document.getElementById("charts-page-root");
const refreshRequestsInFlight = new Set();

function clampSidebarWidth(rawWidth) {
  const numericWidth = Number(rawWidth);
  if (!Number.isFinite(numericWidth)) {
    return SIDEBAR_DEFAULT_WIDTH_PX;
  }
  return Math.min(SIDEBAR_MAX_WIDTH_PX, Math.max(SIDEBAR_MIN_WIDTH_PX, Math.round(numericWidth)));
}

function normalizeSidebarContext(nextContext) {
  if (nextContext === SIDEBAR_CONTEXT_SENSORS) return SIDEBAR_CONTEXT_SENSORS;
  if (nextContext === SIDEBAR_CONTEXT_EVENTS) return SIDEBAR_CONTEXT_EVENTS;
  return SIDEBAR_CONTEXT_EQUIPMENT;
}

const initialSidebarWidth = clampSidebarWidth(
  window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY),
);
const initialSidebarContext = normalizeSidebarContext(
  window.localStorage.getItem(SIDEBAR_ACTIVE_CONTEXT_STORAGE_KEY),
);
const initialSidebarCollapsed = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";

const sidebarState = {
  userCollapsed: initialSidebarCollapsed,
  collapsed: initialSidebarCollapsed,
  effectiveCollapseReason: "remembered",
  widthPx: initialSidebarWidth,
  activeContext: initialSidebarContext,
  loadingEquipment: false,
  equipmentError: "",
  equipmentNodes: [],
  equipmentRoots: [],
  nodeById: new Map(),
  childrenByParent: new Map(),
  expandedEquipmentIds: new Set(),
  equipmentFilter: "",
  equipmentFilterDraft: "",
  selectedEquipmentId: null,
  loadingSensors: false,
  sensorsError: "",
  sensorCategories: [],
  sensorList: [],
  unitMetadataReadyByEquipmentId: new Map(),
  expandedSensorCategories: new Set(),
  loadingEvents: false,
  eventsError: "",
  eventsList: [],
  eventStatusOptions: [],
  eventStatusFilter: "",
  preloadedEvents: false,
  notice: "",
  equipmentScrollTop: 0,
  sensorsScrollTop: 0,
  eventsScrollTop: 0,
};

let contextMenuCleanup = null;
let noticeTimeoutHandle = null;
const alarmNarrativeExpandedByPage = new Map();

function captureSidebarScrollSnapshot() {
  if (!sidebarsRoot) return;
  sidebarsRoot.querySelectorAll("[data-sidebar-scroll-key]").forEach((host) => {
    const key = host.dataset.sidebarScrollKey;
    if (!key) return;
    sidebarState[key] = host.scrollTop;
  });
}

function bindSidebarScrollPersistence(host, key) {
  if (!host) return;
  host.dataset.sidebarScrollKey = key;
  host.addEventListener(
    "scroll",
    () => {
      sidebarState[key] = host.scrollTop;
    },
    { passive: true },
  );
}

function restoreSidebarScroll(host, key) {
  if (!host) return;
  const target = Math.max(0, Number(sidebarState[key] || 0));
  host.scrollTop = target;
  requestAnimationFrame(() => {
    if (!host.isConnected) return;
    host.scrollTop = target;
  });
}

function isSidebarContextLoading(contextId) {
  if (contextId === SIDEBAR_CONTEXT_SENSORS) return sidebarState.loadingSensors;
  if (contextId === SIDEBAR_CONTEXT_EVENTS) return sidebarState.loadingEvents;
  return sidebarState.loadingEquipment;
}

function toTagKey(tag) {
  const itemId = String(tag?.itemId || tag?.item_id || "").trim();
  const attributeId = String(tag?.attributeId || tag?.attribute_id || "").trim();
  const attributeName = String(tag?.attributeName || tag?.attribute_name || "")
    .trim()
    .toLowerCase();
  return `${itemId}::${attributeId || attributeName}`;
}

function normalizeTag(tag) {
  const normalized = {
    assetName: tag?.assetName || tag?.asset_name || "",
    itemId: tag?.itemId || tag?.item_id || "",
    attributeId: tag?.attributeId || tag?.attribute_id || "",
    attributeName: tag?.attributeName || tag?.attribute_name || "",
    label: tag?.label || tag?.attributeName || tag?.attribute_name || "",
  };
  if (!normalized.itemId || !(normalized.attributeId || normalized.attributeName)) {
    return null;
  }
  if (!normalized.label) {
    normalized.label = normalized.attributeName || normalized.attributeId;
  }
  return normalized;
}

function dedupeTags(tags) {
  const byKey = new Map();
  (tags || []).forEach((rawTag) => {
    const tag = normalizeTag(rawTag);
    if (!tag) return;
    byKey.set(toTagKey(tag), tag);
  });
  return Array.from(byKey.values());
}

function toChartPatch(tags, currentChart = null) {
  const selectedTags = dedupeTags(tags);
  const first = selectedTags[0] || null;

  return {
    title: currentChart?.title || first?.label || "Chart",
    assetName: first?.assetName || "",
    itemId: first?.itemId || null,
    attributeId: first?.attributeId || null,
    attributeName: first?.attributeName || null,
    fromCategories: [],
    fromAttributes: [],
    selectedTags,
  };
}

function getInitialTagsForChart(chart) {
  if (Array.isArray(chart?.selectedTags) && chart.selectedTags.length > 0) {
    return chart.selectedTags;
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

function normalizeSensor(rawSensor) {
  if (!rawSensor) return null;
  const itemId = String(rawSensor.item_id || rawSensor.itemId || "").trim();
  const attributeId = String(rawSensor.attribute_id || rawSensor.attributeId || "").trim();
  const attributeName = String(rawSensor.attribute_name || rawSensor.attributeName || "").trim();
  if (!itemId || !attributeId || !attributeName) return null;

  const sensor = {
    key:
      String(rawSensor.key || "").trim() ||
      `${itemId}::${attributeId || attributeName.toLowerCase()}`,
    itemId,
    assetName: String(rawSensor.asset_name || rawSensor.assetName || "").trim(),
    attributeId,
    attributeName,
    label: String(rawSensor.label || attributeName).trim(),
    categories: Array.isArray(rawSensor.categories)
      ? rawSensor.categories.map((entry) => String(entry || "")).filter(Boolean)
      : [],
    reference: rawSensor.reference ? String(rawSensor.reference) : "",
    unit:
      String(
        rawSensor.unit ??
          rawSensor.unit_of_measurement ??
          rawSensor.unitOfMeasurement ??
          rawSensor.uom ??
          "",
      ).trim() || null,
    unitMetadataLoaded:
      rawSensor.unit_metadata_loaded === true ||
      rawSensor.unitMetadataLoaded === true ||
      Object.prototype.hasOwnProperty.call(rawSensor, "unit") ||
      Object.prototype.hasOwnProperty.call(rawSensor, "unit_of_measurement") ||
      Object.prototype.hasOwnProperty.call(rawSensor, "unitOfMeasurement") ||
      Object.prototype.hasOwnProperty.call(rawSensor, "uom"),
    isTimeseriesDataSource:
      rawSensor.is_timeseries_data_source === true || rawSensor.isTimeseriesDataSource === true,
  };
  return sensor;
}

function resolveUnitFromAttributeEntry(rawAttribute) {
  const directUnit = String(
    rawAttribute?.unit_of_measurement ??
      rawAttribute?.unitOfMeasurement ??
      rawAttribute?.unit ??
      rawAttribute?.uom ??
      "",
  ).trim();
  if (directUnit) {
    return directUnit;
  }

  const subAttributes = Array.isArray(rawAttribute?.sub_attributes)
    ? rawAttribute.sub_attributes
    : Array.isArray(rawAttribute?.subAttributes)
      ? rawAttribute.subAttributes
      : [];
  for (const entry of subAttributes) {
    const subUnit = String(
      entry?.unit ?? entry?.unit_of_measurement ?? entry?.unitOfMeasurement ?? entry?.uom ?? "",
    ).trim();
    if (subUnit) {
      return subUnit;
    }
  }
  return null;
}

function buildItemAttributeUnitLookups(attributes) {
  const byAttributeId = new Map();
  const byAttributeName = new Map();

  (Array.isArray(attributes) ? attributes : []).forEach((rawAttribute) => {
    const attributeId = String(
      rawAttribute?.id ?? rawAttribute?.attribute_id ?? rawAttribute?.attributeId ?? "",
    ).trim();
    const attributeName = String(
      rawAttribute?.name ?? rawAttribute?.attribute_name ?? rawAttribute?.attributeName ?? "",
    )
      .trim()
      .toLowerCase();
    const resolvedUnit = resolveUnitFromAttributeEntry(rawAttribute);

    if (attributeId) {
      byAttributeId.set(attributeId, resolvedUnit);
    }
    if (attributeName) {
      byAttributeName.set(attributeName, resolvedUnit);
    }
  });

  return {
    byAttributeId,
    byAttributeName,
  };
}

function applyResolvedUnitToSensor(sensor, unitLookups) {
  if (!sensor) return;
  const byAttributeId = unitLookups?.byAttributeId instanceof Map ? unitLookups.byAttributeId : new Map();
  const byAttributeName =
    unitLookups?.byAttributeName instanceof Map ? unitLookups.byAttributeName : new Map();

  const attributeId = String(sensor.attributeId || "").trim();
  const attributeName = String(sensor.attributeName || "").trim().toLowerCase();
  let resolvedUnit = String(sensor.unit ?? "").trim() || null;

  if (!resolvedUnit && attributeId && byAttributeId.has(attributeId)) {
    resolvedUnit = byAttributeId.get(attributeId);
  }
  if (!resolvedUnit && attributeName && byAttributeName.has(attributeName)) {
    resolvedUnit = byAttributeName.get(attributeName);
  }

  sensor.unit = String(resolvedUnit ?? "").trim() || null;
  sensor.unitMetadataLoaded = true;
}

async function finalizeUnitMetadataForEquipment(node, normalizedSensors) {
  const categories = Array.isArray(normalizedSensors?.categories) ? normalizedSensors.categories : [];
  const allSensors = Array.isArray(normalizedSensors?.allSensors) ? normalizedSensors.allSensors : [];

  if (allSensors.length === 0) {
    normalizedSensors.unitMetadataReady = true;
    return normalizedSensors;
  }

  const hasMissingMetadata = allSensors.some((sensor) => sensor.unitMetadataLoaded !== true);
  let unitLookups = { byAttributeId: new Map(), byAttributeName: new Map() };

  if (hasMissingMetadata) {
    try {
      const payload = await getItemAttributes({
        item_id: node?.id,
        asset_name: node?.name,
        timeseries_only: true,
      });
      unitLookups = buildItemAttributeUnitLookups(payload?.attributes);
    } catch (error) {
      console.warn("Unable to load item attributes for unit metadata fallback.", error);
    }
  }

  categories.forEach((category) => {
    (Array.isArray(category?.sensors) ? category.sensors : []).forEach((sensor) => {
      applyResolvedUnitToSensor(sensor, unitLookups);
    });
  });
  allSensors.forEach((sensor) => {
    applyResolvedUnitToSensor(sensor, unitLookups);
  });
  normalizedSensors.unitMetadataReady = true;
  return normalizedSensors;
}

function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed;
}

function formatDateTime(value) {
  const parsed = parseDateTime(value);
  if (!parsed) return "N/A";
  return parsed.toLocaleString();
}

function formatDateOnly(value) {
  const parsed = parseDateTime(value);
  if (!parsed) return null;
  return parsed.toISOString().slice(0, 10);
}

function formatDisplayText(value, fallback = "N/A") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function formatElapsedDuration(startValue, endValue) {
  const start = parseDateTime(startValue);
  if (!start) return "N/A";
  const end = parseDateTime(endValue) || new Date();
  const deltaMs = Math.max(0, end.valueOf() - start.valueOf());
  const totalMinutes = Math.floor(deltaMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function uniqueStrings(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ),
  );
}

function buildAlarmDisplayWarnings(alarmMeta) {
  const warnings = uniqueStrings(alarmMeta?.warnings || []);
  const requiredFields = [
    ["status", "Status"],
    ["eventType", "Type"],
    ["severity", "Severity"],
    ["name", "Name"],
    ["startDate", "Start date"],
    ["description", "Description"],
    ["prognosis", "Prognosis"],
    ["trendDisplayStartDate", "Trend start date"],
  ];
  requiredFields.forEach(([fieldName, label]) => {
    if (!String(alarmMeta?.[fieldName] || "").trim()) {
      warnings.push(`Missing ${label}.`);
    }
  });
  if (!Array.isArray(alarmMeta?.eventTimeseriesAttributes) || !alarmMeta.eventTimeseriesAttributes.length) {
    warnings.push("Missing event timeseries attributes.");
  }
  return uniqueStrings(warnings);
}

function normalizeAlarmDisplayModel(alarmMeta) {
  const endDate = String(alarmMeta?.endDate || "").trim() || new Date().toISOString();
  const warnings = buildAlarmDisplayWarnings(alarmMeta);
  const descriptionRaw = String(alarmMeta?.description || "").trim();
  const prognosisRaw = String(alarmMeta?.prognosis || "").trim();
  const requestedCount = Array.isArray(alarmMeta?.eventTimeseriesAttributes)
    ? alarmMeta.eventTimeseriesAttributes.length
    : 0;
  const matchedCount = Array.isArray(alarmMeta?.matchedAttributes)
    ? alarmMeta.matchedAttributes.length
    : 0;
  const unmatchedCount = Array.isArray(alarmMeta?.unmatchedAttributes)
    ? alarmMeta.unmatchedAttributes.length
    : 0;

  const narrativeLength = `${descriptionRaw}\n${prognosisRaw}`.trim().length;

  return {
    title: formatDisplayText(alarmMeta?.name, "Alarm"),
    status: formatDisplayText(alarmMeta?.status),
    severity: formatDisplayText(alarmMeta?.severity),
    eventType: formatDisplayText(alarmMeta?.eventType),
    assetName: formatDisplayText(alarmMeta?.assetName),
    eventId: formatDisplayText(alarmMeta?.eventId),
    startDate: alarmMeta?.startDate || "",
    endDate,
    trendDisplayStartDate: alarmMeta?.trendDisplayStartDate || "",
    startDisplay: formatDateTime(alarmMeta?.startDate),
    endDisplay: formatDateTime(endDate),
    trendStartDisplay: formatDateTime(alarmMeta?.trendDisplayStartDate),
    elapsedDisplay: formatElapsedDuration(alarmMeta?.startDate, endDate),
    descriptionRaw,
    prognosisRaw,
    warnings,
    requestedCount,
    matchedCount,
    unmatchedCount,
    narrativeCanCollapse: narrativeLength > ALARM_NARRATIVE_COLLAPSE_THRESHOLD,
  };
}

function normalizeEventCard(rawEvent) {
  if (!rawEvent) return null;
  const itemId = String(rawEvent.item_id || rawEvent.itemId || "").trim();
  const name = String(rawEvent.name || "").trim();
  if (!itemId || !name) return null;
  const warnings = uniqueStrings(rawEvent.warnings);
  return {
    eventId: String(rawEvent.event_id || rawEvent.eventId || "").trim() || `${itemId}:${name}`,
    itemId,
    assetName: String(rawEvent.asset_name || rawEvent.assetName || "").trim(),
    name,
    eventType: String(rawEvent.event_type || rawEvent.eventType || "").trim(),
    status: String(rawEvent.status || "").trim(),
    severity: String(rawEvent.severity || "").trim(),
    startDate: rawEvent.start_date || rawEvent.startDate || "",
    endDate: rawEvent.end_date || rawEvent.endDate || "",
    trendDisplayStartDate:
      rawEvent.trend_display_start_date || rawEvent.trendDisplayStartDate || "",
    description: String(rawEvent.description || "").trim(),
    prognosis: String(rawEvent.prognosis || "").trim(),
    eventTimeseriesAttributes: uniqueStrings(
      rawEvent.event_timeseries_attributes || rawEvent.eventTimeseriesAttributes,
    ),
    warnings,
  };
}

function getAlarmWindowFromEvent(event) {
  const now = new Date();
  const endCandidate = parseDateTime(event?.endDate);
  const end = endCandidate || now;
  const trendStart = parseDateTime(event?.trendDisplayStartDate);
  const fallbackFromEnd = endCandidate ? new Date(endCandidate) : null;
  if (fallbackFromEnd) {
    fallbackFromEnd.setDate(fallbackFromEnd.getDate() - 300);
  }
  const fallbackFromNow = new Date(now);
  fallbackFromNow.setDate(fallbackFromNow.getDate() - 300);
  const start = trendStart || fallbackFromEnd || fallbackFromNow;
  return {
    start,
    end,
  };
}

function getAlarmSpanFromEvent(event) {
  const now = new Date();
  const start = parseDateTime(event?.startDate);
  const end = parseDateTime(event?.endDate) || now;
  return {
    start,
    end,
  };
}

function buildAlarmPageName(eventName) {
  const safeName = String(eventName || "Unnamed Alarm").trim() || "Unnamed Alarm";
  return `[Alarm] ${safeName}`;
}

function sensorToTag(sensor) {
  return normalizeTag({
    assetName: sensor.assetName,
    itemId: sensor.itemId,
    attributeId: sensor.attributeId,
    attributeName: sensor.attributeName,
    label: sensor.label,
  });
}

function buildSensorContextBatchPayload(tag, page) {
  const useCustomDateRange = String(page?.datePreset || "").toLowerCase() === "custom";
  return {
    start_date: useCustomDateRange ? page?.startDate || null : null,
    end_date: useCustomDateRange ? page?.endDate || null : null,
    window: String(page?.frequencyWindow || "6h").trim() || "6h",
    tags: [
      {
        tag_key: toTagKey(tag),
        asset_name: tag.assetName,
        item_id: tag.itemId,
        attribute_id: tag.attributeId || null,
        attribute_name: tag.attributeName || null,
        label: tag.label || null,
      },
    ],
  };
}

async function loadSensorThresholdContext(sensor) {
  const tag = sensorToTag(sensor);
  if (!tag) return null;

  try {
    const snapshot = store.getState();
    const activePage = getActivePage(snapshot);
    const payload = await getSensorContextBatch(buildSensorContextBatchPayload(tag, activePage));
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    const attributeId = String(sensor?.attributeId || "").trim();
    if (attributeId) {
      const byAttributeId = rows.find((row) => String(row?.attribute_id || "").trim() === attributeId);
      if (byAttributeId) return byAttributeId;
    }

    const tagKey = toTagKey(tag);
    const byTagKey = rows.find((row) => String(row?.tag_key || "").trim() === tagKey);
    return byTagKey || rows[0] || null;
  } catch (error) {
    console.warn("Unable to load sensor threshold context for custom alarm modal.", error);
    return null;
  }
}

async function openCustomAlarmAuthoring(sensor, { onSaved } = {}) {
  const thresholdContext = await loadSensorThresholdContext(sensor);
  await openCustomAlarmModal({
    sensor,
    thresholdContext,
    onSaved,
  });
}

function setGlobalDraggedSensorTag(tag) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(tag);
  window[GLOBAL_SENSOR_DRAG_KEY] = payload;
}

function clearGlobalDraggedSensorTag() {
  if (typeof window === "undefined") return;
  if (window?.[GLOBAL_SENSOR_DRAG_KEY]) {
    delete window[GLOBAL_SENSOR_DRAG_KEY];
  }
}

function getActivePage(snapshot) {
  return snapshot.pages.find((item) => item.id === snapshot.activePageId) || null;
}

function collectPlottedTagKeys(snapshot) {
  const activePage = getActivePage(snapshot);
  const keys = new Set();
  if (!activePage) return keys;

  activePage.charts.forEach((chart) => {
    getInitialTagsForChart(chart).forEach((tag) => {
      const normalized = normalizeTag(tag);
      if (!normalized) return;
      keys.add(toTagKey(normalized));
    });
  });
  return keys;
}

function buildChartFromTags(tags, title = "") {
  const patch = toChartPatch(tags, null);
  patch.title = title || patch.title;
  return patch;
}

function invalidateSidebarRender() {
  renderState.sidebarSignature = "";
  void render(store.getState());
}

function renderRefreshProgress() {
  if (!refreshProgressRoot) return;
  const count = refreshRequestsInFlight.size;
  if (count === 0) {
    refreshProgressRoot.className = "refresh-progress hidden";
    refreshProgressRoot.innerHTML = "";
    return;
  }

  refreshProgressRoot.className = "refresh-progress";
  refreshProgressRoot.innerHTML = `
    <div class="refresh-progress-bar" aria-hidden="true"></div>
    <span class="refresh-progress-label">Updating charts (${count})...</span>
  `;
}

function beginChartRefresh(chartId) {
  const requestKey = `${chartId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
  refreshRequestsInFlight.add(requestKey);
  renderRefreshProgress();
  return requestKey;
}

function endChartRefresh(requestKey) {
  if (!requestKey) return;
  if (refreshRequestsInFlight.delete(requestKey)) {
    renderRefreshProgress();
  }
}

function closeContextMenu() {
  if (typeof contextMenuCleanup === "function") {
    contextMenuCleanup();
    contextMenuCleanup = null;
  }
}

function showContextMenu({ x, y, items }) {
  closeContextMenu();
  if (!Array.isArray(items) || items.length === 0) return;

  const menu = document.createElement("div");
  menu.className = "charts-context-menu";
  menu.style.left = `${Math.max(8, x)}px`;
  menu.style.top = `${Math.max(8, y)}px`;

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    button.addEventListener("click", async () => {
      closeContextMenu();
      if (typeof item.onSelect === "function") {
        await item.onSelect();
      }
    });
    menu.append(button);
  });

  document.body.append(menu);

  const onPointerDown = (event) => {
    if (!menu.contains(event.target)) {
      closeContextMenu();
    }
  };
  const onEscape = (event) => {
    if (event.key === "Escape") {
      closeContextMenu();
    }
  };
  document.addEventListener("mousedown", onPointerDown, true);
  document.addEventListener("keydown", onEscape);

  contextMenuCleanup = () => {
    document.removeEventListener("mousedown", onPointerDown, true);
    document.removeEventListener("keydown", onEscape);
    menu.remove();
  };
}

function setSidebarNotice(message) {
  sidebarState.notice = String(message || "").trim();
  if (noticeTimeoutHandle) {
    window.clearTimeout(noticeTimeoutHandle);
    noticeTimeoutHandle = null;
  }
  if (sidebarState.notice) {
    noticeTimeoutHandle = window.setTimeout(() => {
      sidebarState.notice = "";
      invalidateSidebarRender();
    }, 3500);
  }
  invalidateSidebarRender();
}

function isViewportAutoCollapsed() {
  return window.innerWidth < SIDEBAR_AUTO_COLLAPSE_BREAKPOINT_PX;
}

function isDocumentFullscreen() {
  return Boolean(document.fullscreenElement);
}

function getEffectiveSidebarState() {
  if (isDocumentFullscreen()) {
    return { collapsed: false, reason: "fullscreen-force-open" };
  }
  if (isViewportAutoCollapsed()) {
    return { collapsed: true, reason: "responsive-auto-collapse" };
  }
  return { collapsed: sidebarState.userCollapsed, reason: "remembered" };
}

function syncSidebarLayoutContract() {
  if (!chartsPageRoot) return;
  chartsPageRoot.style.setProperty("--charts-sidebar-width", `${sidebarState.widthPx}px`);
  chartsPageRoot.style.setProperty(
    "--charts-sidebar-collapsed-width",
    `${SIDEBAR_COLLAPSED_WIDTH_PX}px`,
  );
  chartsPageRoot.classList.toggle("sidebar-collapsed", sidebarState.collapsed);
}

function applySidebarCollapsePrecedence({ invalidate = true } = {}) {
  const nextState = getEffectiveSidebarState();
  const changed =
    sidebarState.collapsed !== nextState.collapsed ||
    sidebarState.effectiveCollapseReason !== nextState.reason;
  sidebarState.collapsed = nextState.collapsed;
  sidebarState.effectiveCollapseReason = nextState.reason;
  syncSidebarLayoutContract();
  if (changed && invalidate) {
    invalidateSidebarRender();
  }
  return changed;
}

function setSidebarWidth(nextWidth, { persist = true } = {}) {
  const normalizedWidth = clampSidebarWidth(nextWidth);
  if (normalizedWidth === sidebarState.widthPx) return false;
  sidebarState.widthPx = normalizedWidth;
  if (persist) {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(normalizedWidth));
  }
  syncSidebarLayoutContract();
  return true;
}

function setSidebarCollapsedByUser(nextCollapsed) {
  sidebarState.userCollapsed = Boolean(nextCollapsed);
  window.localStorage.setItem(
    SIDEBAR_COLLAPSED_STORAGE_KEY,
    sidebarState.userCollapsed ? "1" : "0",
  );
  applySidebarCollapsePrecedence();
}

function setSidebarContext(nextContext, { expandSidebar = false } = {}) {
  const normalizedContext = normalizeSidebarContext(nextContext);
  const contextChanged = sidebarState.activeContext !== normalizedContext;
  if (contextChanged) {
    sidebarState.activeContext = normalizedContext;
    window.localStorage.setItem(SIDEBAR_ACTIVE_CONTEXT_STORAGE_KEY, normalizedContext);
  }

  if (expandSidebar) {
    setSidebarCollapsedByUser(false);
    if (sidebarState.effectiveCollapseReason === "responsive-auto-collapse") {
      setSidebarNotice("Sidebar remains collapsed below 1400px.");
    }
  }

  if (contextChanged) {
    invalidateSidebarRender();
    if (normalizedContext === SIDEBAR_CONTEXT_EVENTS && sidebarState.selectedEquipmentId) {
      void loadIntelEventsForSelectedEquipment({ forceReload: true });
    }
  }
}

function startSidebarResize(pointerDownEvent) {
  if (sidebarState.collapsed) return;
  if (pointerDownEvent.button !== 0) return;
  pointerDownEvent.preventDefault();

  const startX = pointerDownEvent.clientX;
  const initialWidth = sidebarState.widthPx;
  document.body.classList.add("chart-sidebar-resizing");

  const onPointerMove = (moveEvent) => {
    const deltaX = moveEvent.clientX - startX;
    setSidebarWidth(initialWidth + deltaX, { persist: false });
  };

  const onPointerUp = () => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.body.classList.remove("chart-sidebar-resizing");
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(sidebarState.widthPx));
    renderState.gridSignature = "";
    void render(store.getState());
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
}

function buildChildrenByParent(nodes) {
  const childrenByParent = new Map();
  nodes.forEach((node) => {
    const parentKey = node.parentId || ROOT_PARENT_KEY;
    const existing = childrenByParent.get(parentKey) || [];
    existing.push(node);
    childrenByParent.set(parentKey, existing);
  });
  Array.from(childrenByParent.keys()).forEach((key) => {
    const sorted = (childrenByParent.get(key) || []).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    childrenByParent.set(key, sorted);
  });
  return childrenByParent;
}

function buildVisibleEquipmentIds() {
  const filter = sidebarState.equipmentFilter.trim().toLowerCase();
  if (!filter) {
    return new Set(sidebarState.equipmentNodes.map((node) => node.id));
  }

  const visible = new Set();
  sidebarState.equipmentNodes.forEach((node) => {
    if (!node.name.toLowerCase().includes(filter)) return;
    visible.add(node.id);
    node.pathIds.forEach((pathId) => visible.add(pathId));
  });
  return visible;
}

function expandEquipmentTreeForFilter(filterText) {
  const filter = String(filterText || "").trim().toLowerCase();
  if (!filter) return;

  const expanded = new Set(sidebarState.expandedEquipmentIds);
  sidebarState.equipmentNodes.forEach((node) => {
    if (!node.name.toLowerCase().includes(filter)) return;

    let parentId = node.parentId;
    while (parentId) {
      expanded.add(parentId);
      parentId = sidebarState.nodeById.get(parentId)?.parentId || null;
    }
  });

  sidebarState.expandedEquipmentIds = expanded;
}

function normalizeEquipmentNode(rawNode) {
  return {
    id: String(rawNode.id || "").trim(),
    name: String(rawNode.name || "").trim(),
    parentId: rawNode.parent_id ? String(rawNode.parent_id) : null,
    externalId: rawNode.external_id ? String(rawNode.external_id) : "",
    hasChildren: Boolean(rawNode.has_children),
    depth: Number(rawNode.depth || 0),
    pathIds: Array.isArray(rawNode.path_ids)
      ? rawNode.path_ids.map((entry) => String(entry || "")).filter(Boolean)
      : [],
    pathNames: Array.isArray(rawNode.path_names)
      ? rawNode.path_names.map((entry) => String(entry || "")).filter(Boolean)
      : [],
  };
}

function loadEquipmentTreeFromPayload(payload) {
  const rawNodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  const parsedNodes = rawNodes.map(normalizeEquipmentNode).filter((node) => node.id && node.name);
  const modecRoot = parsedNodes.find(
    (node) => node.name.trim().toLowerCase() === "modec do brasil",
  );

  const nodes = modecRoot
    ? parsedNodes.filter((node) => node.pathIds.includes(modecRoot.id))
    : parsedNodes;
  const roots = modecRoot
    ? [modecRoot.id]
    : Array.isArray(payload?.roots) && payload.roots.length > 0
      ? payload.roots.map((entry) => String(entry || "")).filter(Boolean)
      : nodes
          .filter((node) => !node.parentId)
          .map((node) => node.id);

  const normalizedRoots =
    Array.isArray(payload?.roots) && payload.roots.length > 0
      ? roots
      : roots.filter((rootId) => nodes.some((node) => node.id === rootId));

  sidebarState.equipmentNodes = nodes;
  sidebarState.equipmentRoots = normalizedRoots.length > 0 ? normalizedRoots : roots;
  sidebarState.nodeById = new Map(nodes.map((node) => [node.id, node]));
  sidebarState.childrenByParent = buildChildrenByParent(nodes);
  sidebarState.equipmentFilterDraft = sidebarState.equipmentFilter;
  if (sidebarState.expandedEquipmentIds.size === 0) {
    sidebarState.expandedEquipmentIds = new Set(sidebarState.equipmentRoots.slice(0, 6));
  }

  if (
    sidebarState.selectedEquipmentId &&
    !sidebarState.nodeById.has(sidebarState.selectedEquipmentId)
  ) {
    sidebarState.selectedEquipmentId = null;
    sidebarState.sensorCategories = [];
    sidebarState.sensorList = [];
  }
}

function normalizeSensorCategories(payload) {
  const categories = [];
  const allSensors = [];
  const sensorByKey = new Map();
  let unitMetadataReady = false;
  const filteredCategoryNames = new Set([
    "hidden",
    "uncategorized",
    "calculated variables",
    "failure modes list",
    "aura_equipment",
    "health score calculation",
  ]);
  const sourceCategories = (Array.isArray(payload?.categories) ? payload.categories : []).filter(
    (entry) => {
      const categoryName = String(entry?.category || "").trim().toLowerCase();
      return !filteredCategoryNames.has(categoryName);
    },
  );

  sourceCategories.forEach((categoryEntry) => {
    const categoryName = String(categoryEntry?.category || "").trim() || "Uncategorized";
    const sensors = Array.isArray(categoryEntry?.sensors)
      ? categoryEntry.sensors
          .map(normalizeSensor)
          .filter((sensor) => sensor && sensor.isTimeseriesDataSource === true)
      : [];
    if (sensors.length === 0) {
      return;
    }
    categories.push({ category: categoryName, sensors });
    sensors.forEach((sensor) => {
      if (!sensorByKey.has(sensor.key)) {
        sensorByKey.set(sensor.key, sensor);
      } else {
        const existing = sensorByKey.get(sensor.key);
        existing.categories = Array.from(new Set([...existing.categories, ...sensor.categories]));
      }
    });
  });

  sensorByKey.forEach((sensor) => {
    allSensors.push(sensor);
  });

  categories.sort((left, right) => left.category.localeCompare(right.category));
  categories.forEach((entry) => {
    entry.sensors.sort((left, right) => left.label.localeCompare(right.label));
  });
  allSensors.sort((left, right) => left.label.localeCompare(right.label));
  return { categories, allSensors, unitMetadataReady };
}

async function preloadIntelEvents() {
  try {
    await getIntelEvents();
    sidebarState.preloadedEvents = true;
  } catch (error) {
    console.warn("Failed to preload Shape Intel events.", error);
    sidebarState.preloadedEvents = false;
  }
}

async function loadIntelEventsForSelectedEquipment(options = {}) {
  const selectedNode = options.targetNode
    ? sidebarState.nodeById.get(String(options.targetNode.id)) || options.targetNode
    : sidebarState.selectedEquipmentId
      ? sidebarState.nodeById.get(sidebarState.selectedEquipmentId)
      : null;
  if (!selectedNode) {
    sidebarState.eventsList = [];
    sidebarState.eventStatusOptions = [];
    sidebarState.eventsError = "";
    invalidateSidebarRender();
    return;
  }

  const forceReload = Boolean(options.forceReload);
  const requestedEquipmentId = String(selectedNode.id || "").trim();
  if (!forceReload && sidebarState.eventsList.length > 0 && !sidebarState.eventsError) {
    return;
  }

  sidebarState.loadingEvents = true;
  sidebarState.eventsError = "";
  if (forceReload) {
    sidebarState.eventsList = [];
  }
  invalidateSidebarRender();

  try {
    const payload = await getIntelEvents({
      item_id: selectedNode.id,
      include_descendants: true,
      status: sidebarState.eventStatusFilter || null,
    });
    const normalizedEvents = (Array.isArray(payload?.events) ? payload.events : [])
      .map(normalizeEventCard)
      .filter(Boolean);
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.eventsList = normalizedEvents;
    sidebarState.eventStatusOptions = uniqueStrings(payload?.status_options || payload?.statusOptions);
  } catch (error) {
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.eventsError = error?.message || "Unable to load Intel events for equipment.";
    sidebarState.eventsList = [];
    sidebarState.eventStatusOptions = [];
  } finally {
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.loadingEvents = false;
    invalidateSidebarRender();
  }
}

async function loadEquipmentTree() {
  sidebarState.loadingEquipment = true;
  sidebarState.equipmentError = "";
  invalidateSidebarRender();

  try {
    const payload = await getEquipmentTree();
    if (!payload || !Array.isArray(payload.nodes)) {
      throw new Error(
        "Equipment tree payload is invalid. Verify API base URL and backend version.",
      );
    }
    loadEquipmentTreeFromPayload(payload);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      sidebarState.equipmentError =
        "Equipment endpoint not found (GET /equipment-tree). Restart backend on latest code.";
    } else {
      sidebarState.equipmentError = error?.message || "Unable to load equipment tree.";
    }
    sidebarState.equipmentNodes = [];
    sidebarState.equipmentRoots = [];
    sidebarState.nodeById = new Map();
    sidebarState.childrenByParent = new Map();
  } finally {
    sidebarState.loadingEquipment = false;
    invalidateSidebarRender();
  }
}

async function selectEquipmentNode(node, options = {}) {
  const shouldReload = Boolean(options.forceReload);
  if (!node || !node.id) return;

  if (
    !shouldReload &&
    sidebarState.selectedEquipmentId === node.id &&
    sidebarState.sensorList.length > 0
  ) {
    return;
  }

  const requestedEquipmentId = String(node.id);
  sidebarState.selectedEquipmentId = requestedEquipmentId;
  sidebarState.loadingSensors = true;
  sidebarState.sensorsError = "";
  sidebarState.sensorCategories = [];
  sidebarState.sensorList = [];
  sidebarState.unitMetadataReadyByEquipmentId.set(node.id, false);
  sidebarState.sensorsScrollTop = 0;
  sidebarState.eventsError = "";
  sidebarState.eventsList = [];
  sidebarState.eventStatusOptions = [];
  sidebarState.eventStatusFilter = "";
  sidebarState.eventsScrollTop = 0;
  invalidateSidebarRender();

  const eventsPromise = loadIntelEventsForSelectedEquipment({
    forceReload: true,
    targetNode: node,
  });

  try {
    const payload = await getEquipmentSensors({ item_id: node.id, asset_name: node.name });
    const normalized = normalizeSensorCategories(payload);
    await finalizeUnitMetadataForEquipment(node, normalized);
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.sensorCategories = normalized.categories;
    sidebarState.sensorList = normalized.allSensors;
    sidebarState.unitMetadataReadyByEquipmentId.set(node.id, normalized.unitMetadataReady);
    sidebarState.expandedSensorCategories = new Set(
      normalized.categories.map((entry) => entry.category),
    );
  } catch (error) {
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.sensorsError = error?.message || "Unable to load sensors for equipment.";
    sidebarState.sensorCategories = [];
    sidebarState.sensorList = [];
    sidebarState.unitMetadataReadyByEquipmentId.set(node.id, false);
  } finally {
    if (sidebarState.selectedEquipmentId !== requestedEquipmentId) return;
    sidebarState.loadingSensors = false;
    invalidateSidebarRender();
  }

  void eventsPromise;
}

function addChartsWithCap(chartEntries) {
  const snapshot = store.getState();
  const page = getActivePage(snapshot);
  if (!page) {
    setSidebarNotice("No active page selected.");
    return { requested: 0, added: 0, limitReached: false };
  }

  const result = store.addCharts(page.id, chartEntries);
  if (result.requested === 0) {
    return result;
  }
  if (result.added > 0 && !result.limitReached) {
    setSidebarNotice(`Added ${result.added} chart${result.added > 1 ? "s" : ""}.`);
  } else if (result.added > 0 && result.limitReached) {
    setSidebarNotice(
      `Added ${result.added} of ${result.requested} charts (limit ${storeConstants.MAX_CHARTS_PER_PAGE}).`,
    );
  } else {
    setSidebarNotice(`Chart limit reached (${storeConstants.MAX_CHARTS_PER_PAGE}).`);
  }
  return result;
}

function toggleSidebarCollapse() {
  const nextUserCollapsed = !sidebarState.userCollapsed;
  setSidebarCollapsedByUser(nextUserCollapsed);
  if (!nextUserCollapsed && sidebarState.effectiveCollapseReason === "responsive-auto-collapse") {
    setSidebarNotice("Sidebar remains collapsed below 1400px.");
  }
}

function appendTagToChart({ pageId, chartId, sensorTag }) {
  const normalizedTag = normalizeTag(sensorTag);
  if (!normalizedTag) return false;

  const snapshot = store.getState();
  const page = snapshot.pages.find((entry) => entry.id === pageId);
  if (!page) return false;
  const chart = page.charts.find((entry) => entry.id === chartId);
  if (!chart) return false;

  const currentTags = dedupeTags(getInitialTagsForChart(chart));
  const hasTag = currentTags.some((tag) => toTagKey(tag) === toTagKey(normalizedTag));
  if (hasTag) {
    setSidebarNotice("Sensor is already plotted in this chart.");
    return false;
  }

  const nextPatch = toChartPatch([...currentTags, normalizedTag], chart);
  store.updateChart(pageId, chartId, nextPatch);
  setSidebarNotice("Sensor added to chart.");
  return true;
}

async function plotAllSensorsForEquipment(node) {
  await selectEquipmentNode(node);
  if (!sidebarState.sensorList.length) {
    setSidebarNotice("No timeseries sensors available for this equipment.");
    return;
  }

  const charts = sidebarState.sensorList
    .map((sensor) => sensorToTag(sensor))
    .filter(Boolean)
    .map((tag) => buildChartFromTags([tag], tag.label));
  addChartsWithCap(charts);
}

async function plotByCategoryForEquipment(node) {
  await selectEquipmentNode(node);
  if (!sidebarState.sensorCategories.length) {
    setSidebarNotice("No categorized sensors available for this equipment.");
    return;
  }

  const charts = [];
  sidebarState.sensorCategories.forEach((category) => {
    const tags = category.sensors.map((sensor) => sensorToTag(sensor)).filter(Boolean);
    if (!tags.length) return;
    charts.push(buildChartFromTags(tags, `${node.name} - ${category.category}`));
  });
  if (!charts.length) {
    setSidebarNotice("No category charts were generated.");
    return;
  }
  addChartsWithCap(charts);
}

function plotSingleSensor(sensor) {
  const tag = sensorToTag(sensor);
  if (!tag) {
    setSidebarNotice("Invalid sensor selection.");
    return;
  }
  addChartsWithCap([buildChartFromTags([tag], tag.label)]);
}

function getTagsForSensorCategory(category) {
  return dedupeTags(
    (Array.isArray(category?.sensors) ? category.sensors : [])
      .map((sensor) => sensorToTag(sensor))
      .filter(Boolean),
  );
}

function plotSensorCategory(category, selectedNode) {
  const tags = getTagsForSensorCategory(category);
  if (!tags.length) {
    setSidebarNotice("No timeseries sensors available in this category.");
    return;
  }
  const equipmentName = String(selectedNode?.name || "Equipment").trim();
  const categoryName = String(category?.category || "Category").trim();
  addChartsWithCap([buildChartFromTags(tags, `${equipmentName} - ${categoryName}`)]);
}

function plotSensorCategorySensors(category) {
  const tags = getTagsForSensorCategory(category);
  if (!tags.length) {
    setSidebarNotice("No timeseries sensors available in this category.");
    return;
  }
  const charts = tags.map((tag) => buildChartFromTags([tag], tag.label));
  addChartsWithCap(charts);
}

function getNormalizedUnitLabel(sensor) {
  const unitLabel = String(sensor?.unit ?? "").trim();
  return unitLabel || UNIT_FALLBACK_LABEL;
}

function isUnitMetadataReadyForEquipment(itemId) {
  const normalizedItemId = String(itemId || "").trim();
  if (!normalizedItemId) return false;
  return sidebarState.unitMetadataReadyByEquipmentId.get(normalizedItemId) === true;
}

function buildChartsGroupedByUnit(sensors, titlePrefix) {
  const tagsByUnit = new Map();
  (Array.isArray(sensors) ? sensors : []).forEach((sensor) => {
    const tag = sensorToTag(sensor);
    if (!tag) return;
    const unitLabel = getNormalizedUnitLabel(sensor);
    const existing = tagsByUnit.get(unitLabel) || [];
    existing.push(tag);
    tagsByUnit.set(unitLabel, existing);
  });

  return Array.from(tagsByUnit.entries()).map(([unitLabel, tags]) =>
    buildChartFromTags(tags, `${titlePrefix}${CHART_TITLE_SEPARATOR}${unitLabel}`),
  );
}

async function plotSensorsByUnitForEquipment(node) {
  if (!isUnitMetadataReadyForEquipment(node?.id)) {
    setSidebarNotice("Unit metadata is still loading for this equipment.");
    return;
  }
  await selectEquipmentNode(node);
  if (!sidebarState.sensorList.length) {
    setSidebarNotice("No timeseries sensors available for this equipment.");
    return;
  }

  const assetName = String(node?.name || "Equipment").trim();
  const charts = buildChartsGroupedByUnit(sidebarState.sensorList, assetName);
  if (!charts.length) {
    setSidebarNotice("No unit-grouped charts were generated.");
    return;
  }
  addChartsWithCap(charts);
}

function plotSensorCategoryByUnit(category) {
  if (!isUnitMetadataReadyForEquipment(sidebarState.selectedEquipmentId)) {
    setSidebarNotice("Unit metadata is still loading for this equipment.");
    return;
  }
  const sensors = Array.isArray(category?.sensors) ? category.sensors : [];
  const categoryName = String(category?.category || "Category").trim();
  const charts = buildChartsGroupedByUnit(sensors, categoryName);
  if (!charts.length) {
    setSidebarNotice("No timeseries sensors available in this category.");
    return;
  }
  addChartsWithCap(charts);
}

function renderEquipmentTreeList(target, snapshot) {
  target.innerHTML = "";
  const filter = sidebarState.equipmentFilter.trim();
  const hasFilter = filter.length > 0;
  const visibleIds = buildVisibleEquipmentIds();

  const childrenFor = (parentKey) => {
    return (sidebarState.childrenByParent.get(parentKey) || []).filter((node) =>
      visibleIds.has(node.id),
    );
  };

  const renderBranch = (parentKey, depth) => {
    const branchChildren = childrenFor(parentKey);
    branchChildren.forEach((node) => {
      const row = document.createElement("div");
      row.className = "equipment-tree-row";
      row.style.setProperty("--tree-depth", String(depth));

      const hasChildren = childrenFor(node.id).length > 0;
      const isExpanded = sidebarState.expandedEquipmentIds.has(node.id);

      const openNodeContextMenu = (event) => {
        event.preventDefault();
        showContextMenu({
          x: event.clientX,
          y: event.clientY,
          items: [
            {
              label: "Plot by category",
              onSelect: async () => {
                await plotByCategoryForEquipment(node);
              },
            },
            {
              label: "Plot Sensors by Unit",
              disabled: !isUnitMetadataReadyForEquipment(node.id),
              onSelect: async () => {
                await plotSensorsByUnitForEquipment(node);
              },
            },
            {
              label: "Plot all sensors",
              onSelect: async () => {
                await plotAllSensorsForEquipment(node);
              },
            },
          ],
        });
      };

      const handleRowActivate = () => {
        const didExpand = hasChildren && !sidebarState.expandedEquipmentIds.has(node.id);
        if (didExpand) {
          sidebarState.expandedEquipmentIds.add(node.id);
        }

        const selectionIsNoOp =
          sidebarState.selectedEquipmentId === node.id && sidebarState.sensorList.length > 0;
        if (selectionIsNoOp) {
          if (didExpand) {
            invalidateSidebarRender();
          }
          return;
        }

        void selectEquipmentNode(node);
      };

      let expander = null;
      if (hasChildren) {
        expander = document.createElement("button");
        expander.type = "button";
        expander.className = "tree-expander";
        expander.setAttribute("aria-label", isExpanded ? "Collapse node" : "Expand node");
        expander.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        expander.addEventListener("click", (event) => {
          event.stopPropagation();
          if (sidebarState.expandedEquipmentIds.has(node.id)) {
            sidebarState.expandedEquipmentIds.delete(node.id);
          } else {
            sidebarState.expandedEquipmentIds.add(node.id);
          }
          invalidateSidebarRender();
        });
      } else {
        expander = document.createElement("span");
        expander.className = "tree-expander-placeholder";
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = `equipment-node-button${sidebarState.selectedEquipmentId === node.id ? " active" : ""}`;
      button.textContent = node.name;
      button.title = node.pathNames.join(" / ");
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handleRowActivate();
      });
      button.addEventListener("contextmenu", (event) => {
        event.stopPropagation();
        openNodeContextMenu(event);
      });
      row.addEventListener("click", (event) => {
        if (event.button !== 0) return;
        if (event.target instanceof Element && event.target.closest(".tree-expander")) return;
        handleRowActivate();
      });
      row.addEventListener("contextmenu", openNodeContextMenu);

      row.append(expander, button);
      target.append(row);

      if (hasChildren && isExpanded) {
        renderBranch(node.id, depth + 1);
      }
    });
  };

  renderBranch(ROOT_PARENT_KEY, 0);

  if (target.children.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sidebar-status";
    empty.textContent = hasFilter ? "No equipment matches this filter." : "No equipment available.";
    target.append(empty);
  }

  void snapshot;
}

function renderSensorSidebar(target, snapshot) {
  target.innerHTML = "";
  const selectedNode = sidebarState.selectedEquipmentId
    ? sidebarState.nodeById.get(sidebarState.selectedEquipmentId)
    : null;

  if (!selectedNode) {
    const empty = document.createElement("div");
    empty.className = "sidebar-status";
    empty.textContent = "Select an equipment to view sensors.";
    target.append(empty);
    return;
  }

  if (sidebarState.loadingSensors) {
    const loading = document.createElement("div");
    loading.className = "sidebar-status";
    loading.textContent = "Loading timeseries sensors...";
    target.append(loading);
    return;
  }

  if (sidebarState.sensorsError) {
    const error = document.createElement("div");
    error.className = "sidebar-status is-error";
    error.textContent = sidebarState.sensorsError;
    target.append(error);
    return;
  }

  if (!sidebarState.sensorCategories.length) {
    const empty = document.createElement("div");
    empty.className = "sidebar-status";
    empty.textContent = "No timeseries sensors for this equipment.";
    target.append(empty);
    return;
  }

  const plottedTagKeys = collectPlottedTagKeys(snapshot);

  sidebarState.sensorCategories.forEach((category) => {
    const section = document.createElement("section");
    section.className = "sensor-category";

    const isExpanded =
      sidebarState.expandedSensorCategories.size === 0 ||
      sidebarState.expandedSensorCategories.has(category.category);

    const header = document.createElement("button");
    header.type = "button";
    header.className = "sensor-category-header";
    header.textContent = `${category.category} (${category.sensors.length})`;
    header.setAttribute("aria-expanded", isExpanded ? "true" : "false");
    header.addEventListener("click", () => {
      if (sidebarState.expandedSensorCategories.has(category.category)) {
        sidebarState.expandedSensorCategories.delete(category.category);
      } else {
        sidebarState.expandedSensorCategories.add(category.category);
      }
      invalidateSidebarRender();
    });
    header.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      showContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            label: "Plot category",
            onSelect: () => {
              plotSensorCategory(category, selectedNode);
            },
          },
          {
            label: "Plot category sensors",
            onSelect: () => {
              plotSensorCategorySensors(category);
            },
          },
          {
            label: "Plot Category (group by units)",
            disabled: !isUnitMetadataReadyForEquipment(selectedNode?.id),
            onSelect: () => {
              plotSensorCategoryByUnit(category);
            },
          },
        ],
      });
    });
    section.append(header);

    const list = document.createElement("div");
    list.className = "sensor-list";
    if (!isExpanded) {
      list.hidden = true;
    }

    category.sensors.forEach((sensor) => {
      const row = document.createElement("div");
      row.className = "sensor-row";
      row.title = sensor.label;
      const tag = sensorToTag(sensor);
      const rowId = `${sensor.key || `${sensor.itemId}::${sensor.attributeId}`}`;
      row.dataset.rowId = rowId;
      row.draggable = Boolean(tag);
      if (tag) {
        row.addEventListener("dragstart", (event) => {
          const payload = JSON.stringify(tag);
          setGlobalDraggedSensorTag(tag);
          if (!event.dataTransfer) return;
          event.dataTransfer.effectAllowed = "copy";
          event.dataTransfer.setData(SENSOR_DRAG_MIME, payload);
          event.dataTransfer.setData("text/plain", payload);
        });
        row.addEventListener("dragend", () => {
          clearGlobalDraggedSensorTag();
        });
      }

      row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showContextMenu({
          x: event.clientX,
          y: event.clientY,
          items: [
            {
              label: "Plot to new chart",
              onSelect: () => {
                plotSingleSensor(sensor);
              },
            },
            {
              label: "Create custom alarms",
              onSelect: async () => {
                await openCustomAlarmAuthoring(sensor, {
                  onSaved: async () => {
                    setSidebarNotice(`Custom alarms saved for ${sensor.label}.`);
                    actions.refreshCharts?.();
                  },
                });
              },
            },
          ],
        });
      });

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = true;
      checkbox.setAttribute("draggable", "false");
      checkbox.checked = plottedTagKeys.has(toTagKey(sensorToTag(sensor)));

      const label = document.createElement("span");
      label.className = "sensor-label";
      label.setAttribute("draggable", "false");
      label.textContent = sensor.label;

      row.append(checkbox, label);
      list.append(row);
    });

    section.append(list);
    target.append(section);
  });
}

async function resolveEventAttributesForAlarm(event) {
  const requestedNames = uniqueStrings(event?.eventTimeseriesAttributes);
  if (!event?.itemId || requestedNames.length === 0) {
    return {
      tags: [],
      matched: [],
      unmatched: requestedNames,
      warnings: [],
    };
  }

  try {
    const payload = await getItemAttributes({
      item_id: event.itemId,
      timeseries_only: true,
    });
    const attributes = Array.isArray(payload?.attributes) ? payload.attributes : [];
    const normalizedAttributes = attributes
      .map((entry) => ({
        id: String(entry?.id || "").trim(),
        name: String(entry?.name || "").trim(),
        reference: String(entry?.reference || "").trim(),
      }))
      .filter((entry) => entry.id && entry.name);

    const usedAttributeIds = new Set();
    const matched = [];
    const unmatched = [];
    const tags = [];

    requestedNames.forEach((requestedName) => {
      const loweredRequested = requestedName.toLowerCase();
      const exact =
        normalizedAttributes.find((attribute) => attribute.name === requestedName) ||
        normalizedAttributes.find((attribute) => attribute.name.toLowerCase() === loweredRequested) ||
        normalizedAttributes.find((attribute) => attribute.name.toLowerCase().includes(loweredRequested));

      if (!exact) {
        unmatched.push(requestedName);
        return;
      }
      if (usedAttributeIds.has(exact.id)) {
        return;
      }

      usedAttributeIds.add(exact.id);
      matched.push(exact.name);
      tags.push(
        normalizeTag({
          assetName: event.assetName || "",
          itemId: event.itemId,
          attributeId: exact.id,
          attributeName: exact.name,
          label: exact.reference ? `${exact.name} [${exact.reference}]` : exact.name,
        }),
      );
    });

    return {
      tags: tags.filter(Boolean),
      matched,
      unmatched,
      warnings: [],
    };
  } catch (error) {
    return {
      tags: [],
      matched: [],
      unmatched: requestedNames,
      warnings: [error?.message || "Unable to resolve event attributes from API."],
    };
  }
}

async function plotAlarmEventInNewPage(event) {
  if (!event) return;

  setSidebarNotice("Creating alarm page...");
  const { start: windowStart, end: windowEnd } = getAlarmWindowFromEvent(event);
  const { start: spanStart, end: spanEnd } = getAlarmSpanFromEvent(event);
  const attributeResolution = await resolveEventAttributesForAlarm(event);

  const warnings = uniqueStrings([
    ...event.warnings,
    ...attributeResolution.warnings,
    ...(attributeResolution.unmatched.length > 0
      ? [`Unmatched event attributes: ${attributeResolution.unmatched.join(", ")}`]
      : []),
    ...(!spanStart ? ["Missing alarm start_date for span overlay."] : []),
  ]);

  const alarmMeta = {
    eventId: event.eventId,
    itemId: event.itemId,
    assetName: event.assetName,
    name: event.name,
    eventType: event.eventType,
    status: event.status,
    severity: event.severity,
    startDate: event.startDate || "",
    endDate: event.endDate || "",
    trendDisplayStartDate: event.trendDisplayStartDate || "",
    description: event.description,
    prognosis: event.prognosis,
    eventTimeseriesAttributes: event.eventTimeseriesAttributes,
    matchedAttributes: attributeResolution.matched,
    unmatchedAttributes: attributeResolution.unmatched,
    spanStart: spanStart ? spanStart.toISOString() : "",
    spanEnd: spanEnd ? spanEnd.toISOString() : "",
    windowStart: windowStart ? windowStart.toISOString() : "",
    windowEnd: windowEnd ? windowEnd.toISOString() : "",
    warnings,
  };

  const charts = [];
  if (attributeResolution.tags.length > 0) {
    charts.push(
      buildChartFromTags(
        attributeResolution.tags,
        `${event.name || "Alarm"} - All sensors`,
      ),
    );
    charts.push(
      ...attributeResolution.tags.map((tag) => buildChartFromTags([tag], tag.label)),
    );
  }
  store.addPageWithConfig({
    name: buildAlarmPageName(event.name),
    pageType: "alarm",
    alarmMeta,
    gridColumns: 2,
    datePreset: "custom",
    startDate: formatDateOnly(windowStart),
    endDate: formatDateOnly(windowEnd),
    frequencyMode: "auto",
    frequencyWindow: "6h",
    charts,
    dirty: true,
  });

  if (!charts.length) {
    setSidebarNotice("Alarm page created, but no matching event attributes were found.");
    return;
  }
  setSidebarNotice(`Alarm page created with ${charts.length} chart${charts.length > 1 ? "s" : ""}.`);
}

function renderEventsSidebar(target) {
  target.innerHTML = "";
  const selectedNode = sidebarState.selectedEquipmentId
    ? sidebarState.nodeById.get(sidebarState.selectedEquipmentId)
    : null;
  if (!selectedNode) {
    const empty = document.createElement("div");
    empty.className = "sidebar-status";
    empty.textContent = "Select an equipment to view events.";
    target.append(empty);
    return;
  }

  const filterRow = document.createElement("div");
  filterRow.className = "event-filter-row";
  const filterLabel = document.createElement("label");
  filterLabel.className = "event-filter-label";
  filterLabel.textContent = "Status";
  const statusSelect = document.createElement("select");
  statusSelect.className = "event-status-select";
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All statuses";
  statusSelect.append(allOption);
  sidebarState.eventStatusOptions.forEach((optionValue) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    statusSelect.append(option);
  });
  statusSelect.value = sidebarState.eventStatusFilter || "";
  statusSelect.addEventListener("change", () => {
    sidebarState.eventStatusFilter = statusSelect.value;
    void loadIntelEventsForSelectedEquipment({ forceReload: true });
  });
  filterRow.append(filterLabel, statusSelect);
  target.append(filterRow);

  if (sidebarState.loadingEvents) {
    const loading = document.createElement("div");
    loading.className = "sidebar-status";
    loading.textContent = "Loading Shape Intel events...";
    target.append(loading);
    return;
  }

  if (sidebarState.eventsError) {
    const error = document.createElement("div");
    error.className = "sidebar-status is-error";
    error.textContent = sidebarState.eventsError;
    target.append(error);
    return;
  }

  if (!sidebarState.eventsList.length) {
    const empty = document.createElement("div");
    empty.className = "sidebar-status";
    empty.textContent = "No Shape Intel events for this equipment.";
    target.append(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "event-card-list";

  sidebarState.eventsList.forEach((event) => {
    const card = document.createElement("article");
    card.className = "event-card";
    card.title = event.name;
    card.addEventListener("contextmenu", (clickEvent) => {
      clickEvent.preventDefault();
      showContextMenu({
        x: clickEvent.clientX,
        y: clickEvent.clientY,
        items: [
          {
            label: "Plot alarm in new page",
            onSelect: async () => {
              await plotAlarmEventInNewPage(event);
            },
          },
        ],
      });
    });

    card.innerHTML = `
      <h4 class="event-card-title">${event.name}</h4>
      <dl class="event-card-grid">
        <div><dt>Status</dt><dd>${event.status || "N/A"}</dd></div>
        <div><dt>Type</dt><dd>${event.eventType || "N/A"}</dd></div>
        <div><dt>Severity</dt><dd>${event.severity || "N/A"}</dd></div>
        <div><dt>Start</dt><dd>${formatDateTime(event.startDate)}</dd></div>
      </dl>
    `;
    list.append(card);
  });

  target.append(list);
}

function renderAlarmDetailsRow(snapshot) {
  if (!alarmDetailsRowRoot) return;
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  const alarmMeta = page?.alarmMeta || null;
  const isAlarmPage = String(page?.pageType || "").toLowerCase() === "alarm" && alarmMeta;

  if (!isAlarmPage) {
    alarmDetailsRowRoot.classList.add("hidden");
    alarmDetailsRowRoot.innerHTML = "";
    return;
  }

  function createChip(label, value, className = "") {
    const chip = document.createElement("span");
    chip.className = `alarm-chip${className ? ` ${className}` : ""}`;
    const chipLabel = document.createElement("span");
    chipLabel.className = "alarm-chip-label";
    chipLabel.textContent = `${label}:`;
    const chipValue = document.createElement("span");
    chipValue.className = "alarm-chip-value";
    chipValue.textContent = value;
    chip.append(chipLabel, chipValue);
    return chip;
  }

  function createFact(label, value) {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    wrap.append(dt, dd);
    return wrap;
  }

  function createNarrativeSection(title, rawText) {
    const section = document.createElement("section");
    section.className = "alarm-narrative-section";
    const heading = document.createElement("h4");
    heading.textContent = title;
    section.append(heading);

    if (!rawText) {
      const empty = document.createElement("p");
      empty.className = "alarm-narrative-empty";
      empty.textContent = "N/A";
      section.append(empty);
      return section;
    }

    const renderResult = renderSafeMarkdown(rawText);
    const content = document.createElement("div");
    content.className = "alarm-markdown";
    if (renderResult.hasContent) {
      content.innerHTML = renderResult.html;
    } else {
      const empty = document.createElement("p");
      empty.className = "alarm-narrative-empty";
      empty.textContent = "N/A";
      content.append(empty);
    }
    section.append(content);

    if (renderResult.usedFallback) {
      const fallback = document.createElement("details");
      fallback.className = "alarm-raw-fallback";
      const summary = document.createElement("summary");
      summary.textContent = "View raw text";
      const pre = document.createElement("pre");
      pre.textContent = rawText;
      fallback.append(summary, pre);
      section.append(fallback);
    }
    return section;
  }

  const model = normalizeAlarmDisplayModel(alarmMeta);
  const isExpanded = alarmNarrativeExpandedByPage.get(page.id) === true;

  alarmDetailsRowRoot.classList.remove("hidden");
  alarmDetailsRowRoot.innerHTML = "";

  const card = document.createElement("article");
  card.className = "alarm-details-card";

  const head = document.createElement("div");
  head.className = "alarm-details-head";
  const titleWrap = document.createElement("div");
  titleWrap.className = "alarm-title-wrap";
  const title = document.createElement("h3");
  title.title = model.title;
  title.textContent = model.title;
  const subtitle = document.createElement("p");
  subtitle.className = "alarm-title-subline";
  subtitle.textContent = `Start: ${model.startDisplay} | Elapsed: ${model.elapsedDisplay}`;
  titleWrap.append(title, subtitle);
  const statusBadge = document.createElement("span");
  statusBadge.className = "alarm-badge";
  statusBadge.textContent = model.status;
  head.append(titleWrap, statusBadge);

  const chips = document.createElement("div");
  chips.className = "alarm-chip-row";
  chips.append(
    createChip("Asset", model.assetName),
    createChip("Type", model.eventType),
    createChip("Severity", model.severity),
    createChip("ID", model.eventId),
    createChip("Matched", `${model.matchedCount}/${model.requestedCount}`),
  );

  if (model.unmatchedCount > 0) {
    chips.append(createChip("Unmatched", String(model.unmatchedCount), "is-warning"));
  }

  const facts = document.createElement("dl");
  facts.className = "alarm-details-grid";
  facts.append(
    createFact("Start", model.startDisplay),
    createFact("End", model.endDisplay),
    createFact("Trend Start", model.trendStartDisplay),
    createFact("Status", model.status),
  );

  const narrativeWrap = document.createElement("section");
  narrativeWrap.className = "alarm-narrative";
  if (model.narrativeCanCollapse && !isExpanded) {
    narrativeWrap.classList.add("is-collapsed");
  }
  narrativeWrap.append(
    createNarrativeSection("Description", model.descriptionRaw),
    createNarrativeSection("Prognosis", model.prognosisRaw),
  );

  if (model.narrativeCanCollapse) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "secondary-button alarm-narrative-toggle";
    toggle.textContent = isExpanded ? "Show less" : "Show more";
    toggle.addEventListener("click", () => {
      const nextExpanded = !(alarmNarrativeExpandedByPage.get(page.id) === true);
      alarmNarrativeExpandedByPage.set(page.id, nextExpanded);
      narrativeWrap.classList.toggle("is-collapsed", !nextExpanded);
      toggle.textContent = nextExpanded ? "Show less" : "Show more";
    });
    card.append(head, chips, facts, narrativeWrap, toggle);
  } else {
    card.append(head, chips, facts, narrativeWrap);
  }

  if (model.warnings.length) {
    const warningBox = document.createElement("div");
    warningBox.className = "alarm-warning";
    const heading = document.createElement("p");
    heading.className = "alarm-warning-title";
    heading.textContent = "Warnings";
    const list = document.createElement("ul");
    model.warnings.forEach((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      list.append(item);
    });
    warningBox.append(heading, list);
    card.append(warningBox);
  }

  alarmDetailsRowRoot.append(card);
}

function renderSidebars(snapshot) {
  if (!sidebarsRoot) return;
  applySidebarCollapsePrecedence({ invalidate: false });
  captureSidebarScrollSnapshot();
  sidebarsRoot.innerHTML = "";
  sidebarsRoot.className = `charts-sidebars${sidebarState.collapsed ? " collapsed" : ""}`;
  sidebarsRoot.dataset.context = sidebarState.activeContext;

  const shell = document.createElement("div");
  shell.className = "charts-sidebars-shell";

  const toolbar = document.createElement("div");
  toolbar.className = "sidebars-toolbar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "sidebar-toggle-button";
  toggle.title = sidebarState.collapsed ? "Open navigation pane" : "Collapse navigation pane";
  toggle.setAttribute("aria-label", sidebarState.collapsed ? "Open navigation pane" : "Collapse navigation pane");
  toggle.innerHTML = `<span class="sidebar-toggle-chevron${
    sidebarState.collapsed ? " is-collapsed" : ""
  }" aria-hidden="true"></span>`;
  toggle.addEventListener("click", () => {
    toggleSidebarCollapse();
  });
  toolbar.append(toggle);

  if (!sidebarState.collapsed && sidebarState.notice) {
    const notice = document.createElement("span");
    notice.className = "sidebars-notice";
    notice.textContent = sidebarState.notice;
    toolbar.append(notice);
  }

  shell.append(toolbar);

  const contextOptions = [
    {
      id: SIDEBAR_CONTEXT_EQUIPMENT,
      label: "Equipment",
      shortLabel: "E",
    },
    {
      id: SIDEBAR_CONTEXT_SENSORS,
      label: "Sensors",
      shortLabel: "S",
    },
    {
      id: SIDEBAR_CONTEXT_EVENTS,
      label: "Events",
      shortLabel: "Ev",
    },
  ];

  if (sidebarState.collapsed) {
    sidebarsRoot.append(shell);
  } else {
    const tabs = document.createElement("div");
    tabs.className = "sidebar-context-tabs";
    tabs.setAttribute("role", "tablist");
    tabs.setAttribute("aria-label", "Sidebar context");
    contextOptions.forEach((option) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.role = "tab";
      tab.className = `sidebar-context-tab${sidebarState.activeContext === option.id ? " is-active" : ""}${
        isSidebarContextLoading(option.id) ? " is-loading" : ""
      }`;
      tab.setAttribute("aria-selected", sidebarState.activeContext === option.id ? "true" : "false");
      if (isSidebarContextLoading(option.id)) {
        tab.setAttribute("aria-busy", "true");
      }
      tab.innerHTML = `<span>${option.label}</span>`;
      tab.addEventListener("click", () => {
        setSidebarContext(option.id);
      });
      tabs.append(tab);
    });
    shell.append(tabs);

    const panelHost = document.createElement("div");
    panelHost.className = "charts-sidebars-panel-host";

    if (sidebarState.activeContext === SIDEBAR_CONTEXT_EQUIPMENT) {
      const equipmentPane = document.createElement("section");
      equipmentPane.className = "sidebar-pane equipment-pane";
      equipmentPane.innerHTML = `
      <header class="sidebar-pane-header">
        <h3>Equipment</h3>
      </header>
      <form class="sidebar-search-label sidebar-search-form" data-role="equipment-filter-form">
        <span>Filter</span>
        <div class="sidebar-search-controls">
          <input type="search" placeholder="Search equipment" value="${sidebarState.equipmentFilterDraft}" />
          <button type="submit" class="secondary-button">Apply</button>
        </div>
      </form>
      <div class="sidebar-scroll equipment-tree"></div>
    `;
      const equipmentFilterForm = equipmentPane.querySelector('[data-role="equipment-filter-form"]');
      const equipmentFilterInput = equipmentPane.querySelector('input[type="search"]');
      equipmentFilterInput.addEventListener("input", (event) => {
        sidebarState.equipmentFilterDraft = String(event.target.value || "");
      });
      equipmentFilterForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const nextFilter = sidebarState.equipmentFilterDraft.trim();
        sidebarState.equipmentFilter = nextFilter;
        expandEquipmentTreeForFilter(nextFilter);
        invalidateSidebarRender();
      });
      const equipmentTreeHost = equipmentPane.querySelector(".equipment-tree");
      bindSidebarScrollPersistence(equipmentTreeHost, "equipmentScrollTop");

      if (sidebarState.loadingEquipment) {
        equipmentTreeHost.innerHTML = '<div class="sidebar-status">Loading equipment tree...</div>';
      } else if (sidebarState.equipmentError) {
        equipmentTreeHost.innerHTML = `<div class="sidebar-status is-error">${sidebarState.equipmentError}</div>`;
      } else {
        renderEquipmentTreeList(equipmentTreeHost, snapshot);
      }
      restoreSidebarScroll(equipmentTreeHost, "equipmentScrollTop");
      panelHost.append(equipmentPane);
    } else if (sidebarState.activeContext === SIDEBAR_CONTEXT_SENSORS) {
      const sensorsPane = document.createElement("section");
      sensorsPane.className = "sidebar-pane sensor-pane";
      const selectedNode = sidebarState.selectedEquipmentId
        ? sidebarState.nodeById.get(sidebarState.selectedEquipmentId)
        : null;
      sensorsPane.innerHTML = `
      <header class="sidebar-pane-header">
        <h3>Sensors</h3>
        <p title="${selectedNode?.name || ""}">${
        selectedNode?.name || "Select equipment in the Equipment context."
      }</p>
      </header>
      <div class="sidebar-scroll sensor-groups"></div>
      `;
      const sensorGroupsHost = sensorsPane.querySelector(".sensor-groups");
      bindSidebarScrollPersistence(sensorGroupsHost, "sensorsScrollTop");
      renderSensorSidebar(sensorGroupsHost, snapshot);
      restoreSidebarScroll(sensorGroupsHost, "sensorsScrollTop");
      panelHost.append(sensorsPane);
    } else {
      const eventsPane = document.createElement("section");
      eventsPane.className = "sidebar-pane sensor-pane";
      const selectedNode = sidebarState.selectedEquipmentId
        ? sidebarState.nodeById.get(sidebarState.selectedEquipmentId)
        : null;
      eventsPane.innerHTML = `
      <header class="sidebar-pane-header">
        <h3>Events</h3>
        <p title="${selectedNode?.name || ""}">${
        selectedNode?.name || "Select equipment in the Equipment context."
      }</p>
      </header>
      <div class="sidebar-scroll sensor-groups"></div>
      `;
      const eventsHost = eventsPane.querySelector(".sensor-groups");
      bindSidebarScrollPersistence(eventsHost, "eventsScrollTop");
      renderEventsSidebar(eventsHost);
      restoreSidebarScroll(eventsHost, "eventsScrollTop");
      panelHost.append(eventsPane);
    }

    shell.append(panelHost);
    sidebarsRoot.append(shell);
  }
  if (!sidebarState.collapsed) {
    const resizeHandle = document.createElement("button");
    resizeHandle.type = "button";
    resizeHandle.className = "sidebar-resize-handle";
    resizeHandle.title = `Resize pane (${SIDEBAR_MIN_WIDTH_PX}px to ${SIDEBAR_MAX_WIDTH_PX}px)`;
    resizeHandle.setAttribute("aria-label", "Resize navigation pane");
    resizeHandle.addEventListener("pointerdown", startSidebarResize);
    sidebarsRoot.append(resizeHandle);
  }
}

function buildSidebarSignature(snapshot) {
  const plottedKeySignature = Array.from(collectPlottedTagKeys(snapshot)).sort().join("|");
  const categorySignature = sidebarState.sensorCategories
    .map((category) => `${category.category}:${category.sensors.length}`)
    .join("|");
  const eventsSignature = sidebarState.eventsList
    .map((entry) => `${entry.eventId}:${entry.status}:${entry.startDate}`)
    .join("|");
  const expandedEquipmentSignature = Array.from(sidebarState.expandedEquipmentIds).sort().join("|");
  const expandedCategorySignature = Array.from(sidebarState.expandedSensorCategories)
    .sort()
    .join("|");
  return [
    sidebarState.userCollapsed ? "1" : "0",
    sidebarState.collapsed ? "1" : "0",
    sidebarState.effectiveCollapseReason,
    sidebarState.widthPx,
    sidebarState.activeContext,
    sidebarState.loadingEquipment ? "1" : "0",
    sidebarState.equipmentError,
    sidebarState.equipmentNodes.length,
    sidebarState.equipmentFilter,
    expandedEquipmentSignature,
    sidebarState.selectedEquipmentId || "",
    sidebarState.loadingSensors ? "1" : "0",
    sidebarState.sensorsError,
    categorySignature,
    expandedCategorySignature,
    sidebarState.loadingEvents ? "1" : "0",
    sidebarState.eventsError,
    sidebarState.eventsList.length,
    eventsSignature,
    sidebarState.eventStatusFilter,
    sidebarState.eventStatusOptions.join("|"),
    plottedKeySignature,
    sidebarState.notice,
    snapshot.activePageId,
  ].join("::");
}

const actions = {
  setActivePage: (pageId) => {
    store.setActivePage(pageId);
    invalidateSidebarRender();
  },
  addPage: () => store.addPage(),
  renamePage: (pageId, name) => store.renamePage(pageId, name),
  duplicatePage: (pageId) => store.duplicatePage(pageId),
  deletePage: (pageId) => store.deletePage(pageId),
  savePage: (pageId) => store.savePage(pageId),
  setGridColumns: (pageId, columns) => store.setGridColumns(pageId, columns),
  setDatePreset: (pageId, preset) => store.setDatePreset(pageId, preset),
  setDateRange: (pageId, startDate, endDate) => store.setDateRange(pageId, startDate, endDate),
  setFrequency: (pageId, mode, window) => store.setFrequency(pageId, mode, window),
  setGlobalTableColumns: (columnIds) => store.setGlobalTableColumns(columnIds),
  setGlobalTableColumnWidth: (columnId, width) => store.setGlobalTableColumnWidth(columnId, width),
  resetGlobalTableColumnWidths: () => store.resetGlobalTableColumnWidths(),
  resetGlobalTableColumns: () => store.resetGlobalTableColumns(),
  refreshCharts: () => {
    const refreshButtons = Array.from(
      chartGridRoot.querySelectorAll('[data-role="chart-refresh"]'),
    );
    if (refreshButtons.length > 0) {
      refreshButtons.forEach((button) => {
        button.dispatchEvent(new Event("click", { bubbles: true }));
      });
      return;
    }
    renderState.gridSignature = "";
    void render(store.getState());
  },
  addChart: (pageId, chart) => store.addChart(pageId, chart),
  duplicateChart: (pageId, chartId) => store.duplicateChart(pageId, chartId),
  removeChart: (pageId, chartId) => store.removeChart(pageId, chartId),
  updateChart: (pageId, chartId, patch) => store.updateChart(pageId, chartId, patch),
  updateChartSilent: (pageId, chartId, patch) => {
    store.updateChartSilent(pageId, chartId, patch);
    const snapshot = store.getState();
    renderTabNavigation(tabNavigationRoot, snapshot, actions);
    renderPageControls(pageControlsRoot, snapshot, actions);
    renderState.navSignature = buildNavigationSignature(snapshot);
    renderState.controlsSignature = buildPageControlsSignature(snapshot);
    renderState.sidebarSignature = "";
    renderSidebars(snapshot);
    renderState.sidebarSignature = buildSidebarSignature(snapshot);
  },
  onSensorDropToChart: ({ pageId, chartId, sensorTag }) => {
    appendTagToChart({ pageId, chartId, sensorTag });
  },
  beginChartRefresh: (chartId) => beginChartRefresh(chartId),
  endChartRefresh: (requestKey) => endChartRefresh(requestKey),
  consumePendingChartScroll: (pageId, chartId) => store.consumePendingChartScroll(pageId, chartId),
  addChartFromSelector: async (pageId) => {
    const selectedTags = await openChartSelectorModal({ requireSelection: true });
    if (!selectedTags || selectedTags.length === 0) return;
    store.addChart(pageId, toChartPatch(selectedTags));
  },
  editChartTags: async (pageId, chart) => {
    const selectedTags = await openChartSelectorModal({
      initialTags: getInitialTagsForChart(chart),
      requireSelection: false,
    });
    if (!selectedTags) return;

    const nextPatch = toChartPatch(selectedTags, chart);
    if (nextPatch.selectedTags.length === 0) {
      Object.assign(nextPatch, {
        itemId: null,
        attributeId: null,
        attributeName: null,
        fromAttributes: [],
        fromCategories: [],
      });
    }
    store.updateChart(pageId, chart.id, nextPatch);
  },
};

function buildNavigationSignature(snapshot) {
  return `${snapshot.activePageId}::${snapshot.pages
    .map((page) => `${page.id}:${page.name}:${page.dirty ? 1 : 0}`)
    .join("|")}`;
}

function buildPageControlsSignature(snapshot) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return "none";
  const selectedColumnsSignature = Array.isArray(snapshot.tableColumns?.selectedIds)
    ? snapshot.tableColumns.selectedIds.join(",")
    : "";
  const columnWidthsSignature = snapshot.tableColumns?.columnWidths
    ? Object.entries(snapshot.tableColumns.columnWidths)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, value]) => `${id}:${value}`)
        .join(",")
    : "";
  return `${page.id}:${page.gridColumns}:${page.datePreset}:${page.startDate || ""}:${
    page.endDate || ""
  }:${page.frequencyMode || "auto"}:${page.frequencyWindow || "6h"}:${page.charts.length}:${
    page.dirty ? 1 : 0
  }:${selectedColumnsSignature}:${columnWidthsSignature}`;
}

function buildChartGridSignature(snapshot) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return "none";
  const selectedColumnsSignature = Array.isArray(snapshot.tableColumns?.selectedIds)
    ? snapshot.tableColumns.selectedIds.join(",")
    : "";
  const columnWidthsSignature = snapshot.tableColumns?.columnWidths
    ? Object.entries(snapshot.tableColumns.columnWidths)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([id, value]) => `${id}:${value}`)
        .join(",")
    : "";
  const charts = page.charts
    .map((chart) => {
      const tagSignature = Array.isArray(chart.selectedTags)
        ? chart.selectedTags
            .map((tag) => {
              const normalized = normalizeTag(tag);
              return normalized ? toTagKey(normalized) : "";
            })
            .join(",")
        : "";
      return `${chart.id}:${chart.title}:${chart.window || ""}:${tagSignature}`;
    })
    .join("|");
  return `${page.id}:${page.pageType || "standard"}:${page.gridColumns}:${page.datePreset}:${page.startDate || ""}:${
    page.endDate || ""
  }:${page.frequencyMode || "auto"}:${page.frequencyWindow || "6h"}:${page.alarmMeta?.spanStart || ""}:${page.alarmMeta?.spanEnd || ""}:${
    page.pendingScrollChartId || ""
  }:${selectedColumnsSignature}:${columnWidthsSignature}:${charts}`;
}

function buildAlarmDetailsSignature(snapshot) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return "none";
  const alarmMeta = page.alarmMeta || null;
  return [
    page.id,
    page.pageType || "standard",
    alarmMeta?.eventId || "",
    alarmMeta?.name || "",
    alarmMeta?.status || "",
    alarmMeta?.severity || "",
    alarmMeta?.eventType || "",
    alarmMeta?.assetName || "",
    alarmMeta?.startDate || "",
    alarmMeta?.endDate || "",
    alarmMeta?.trendDisplayStartDate || "",
    alarmMeta?.description || "",
    alarmMeta?.prognosis || "",
    (alarmMeta?.eventTimeseriesAttributes || []).join("|"),
    (alarmMeta?.matchedAttributes || []).join("|"),
    (alarmMeta?.unmatchedAttributes || []).join("|"),
    (alarmMeta?.warnings || []).join("|"),
  ].join("::");
}

const renderState = {
  navSignature: "",
  controlsSignature: "",
  gridSignature: "",
  sidebarSignature: "",
  alarmDetailsSignature: "",
};

let renderToken = 0;

async function render(snapshot) {
  const token = ++renderToken;
  try {
    const navSignature = buildNavigationSignature(snapshot);
    const controlsSignature = buildPageControlsSignature(snapshot);
    const gridSignature = buildChartGridSignature(snapshot);
    const sidebarSignature = buildSidebarSignature(snapshot);
    const alarmDetailsSignature = buildAlarmDetailsSignature(snapshot);

    if (navSignature !== renderState.navSignature) {
      renderTabNavigation(tabNavigationRoot, snapshot, actions);
      renderState.navSignature = navSignature;
    }

    if (controlsSignature !== renderState.controlsSignature) {
      renderPageControls(pageControlsRoot, snapshot, actions);
      renderState.controlsSignature = controlsSignature;
    }

    if (alarmDetailsSignature !== renderState.alarmDetailsSignature) {
      renderAlarmDetailsRow(snapshot);
      renderState.alarmDetailsSignature = alarmDetailsSignature;
    }

    if (gridSignature !== renderState.gridSignature) {
      if (!chartGridRoot.firstChild) {
        chartGridRoot.innerHTML = '<div class="chart-loading">Updating charts...</div>';
      }
      await renderChartGrid(chartGridRoot, snapshot, actions);
      renderState.gridSignature = gridSignature;
    }

    if (sidebarSignature !== renderState.sidebarSignature) {
      renderSidebars(snapshot);
      renderState.sidebarSignature = sidebarSignature;
    }

    if (token !== renderToken) {
      return;
    }
  } catch (error) {
    console.error("Charts render failed", error);
    if (chartGridRoot) {
      chartGridRoot.innerHTML =
        '<div class="chart-error">Failed to render charts UI. Open browser console for details, then refresh.</div>';
    }
  }
}

function handleBeforeUnload(event) {
  if (!store.hasDirtyPages()) return;
  event.preventDefault();
  event.returnValue = "";
}

function handleViewportStateChange() {
  const collapseChanged = applySidebarCollapsePrecedence({ invalidate: false });
  if (collapseChanged) {
    renderState.sidebarSignature = "";
  }
  renderState.gridSignature = "";
  void render(store.getState());
}

async function bootstrap() {
  store.subscribe((snapshot) => {
    void render(snapshot);
  });

  applySidebarCollapsePrecedence({ invalidate: false });
  syncSidebarLayoutContract();

  window.addEventListener("resize", handleViewportStateChange);
  document.addEventListener("fullscreenchange", handleViewportStateChange);

  window.addEventListener("beforeunload", handleBeforeUnload);
  renderRefreshProgress();

  const tableColumnsPromise = (async () => {
    try {
      const manifest = await getTableColumnsManifest();
      store.setTableColumnsManifest(manifest);
    } catch (error) {
      console.warn("Failed to load table column defaults. Using local fallback.", error);
    }
  })();

  const pagesPromise = (async () => {
    try {
      const payload = await getPages();
      if (Array.isArray(payload?.pages) && payload.pages.length > 0) {
        store.syncPresetPages(payload.pages);
        store.setActivePage(payload.pages[0].id);
      }
    } catch (error) {
      console.warn("Failed to load backend preset pages. Using local defaults.", error);
    }
  })();

  const equipmentPromise = loadEquipmentTree();
  const eventsPromise = preloadIntelEvents();
  await Promise.allSettled([tableColumnsPromise, pagesPromise, equipmentPromise, eventsPromise]);
}

void bootstrap();

