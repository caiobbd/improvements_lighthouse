import { store, storeConstants } from "./state/store.js";
import {
  ApiClientError,
  getEquipmentSensors,
  getEquipmentTree,
  getIntelEvents,
  getItemAttributes,
  getPages,
} from "./services/api-client.js";
import { renderTabNavigation } from "./components/tab-navigation.js";
import { renderPageControls } from "./components/page-controls.js";
import { renderChartGrid } from "./components/chart-grid.js";
import { openChartSelectorModal } from "./components/chart-selector-modal.js";
import { renderSafeMarkdown } from "./utils/safe-markdown.js";

const ROOT_PARENT_KEY = "__root__";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "lighthouse.charts.sidebars.collapsed.v1";
const SENSOR_DRAG_MIME = "application/x-lighthouse-sensor-tag";
const GLOBAL_SENSOR_DRAG_KEY = "__lighthouseDraggedSensorTag";
const ALARM_NARRATIVE_COLLAPSE_THRESHOLD = 900;

const tabNavigationRoot = document.getElementById("tab-navigation");
const pageControlsRoot = document.getElementById("page-controls");
const refreshProgressRoot = document.getElementById("refresh-progress");
const alarmDetailsRowRoot = document.getElementById("alarm-details-row");
const chartGridRoot = document.getElementById("chart-grid");
const sidebarsRoot = document.getElementById("charts-sidebars");
const refreshRequestsInFlight = new Set();

const sidebarState = {
  collapsed: window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1",
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
  expandedSensorCategories: new Set(),
  activeDetailTab: "sensors",
  loadingEvents: false,
  eventsError: "",
  eventsList: [],
  eventStatusOptions: [],
  eventStatusFilter: "",
  preloadedEvents: false,
  notice: "",
  equipmentScrollTop: 0,
  detailScrollTop: 0,
};

let contextMenuCleanup = null;
let noticeTimeoutHandle = null;
const alarmNarrativeExpandedByPage = new Map();

function captureSidebarScrollSnapshot() {
  if (!sidebarsRoot) return;
  const equipmentHost = sidebarsRoot.querySelector(".equipment-tree.sidebar-scroll");
  const detailHost = sidebarsRoot.querySelector(".sensor-groups.sidebar-scroll");
  if (equipmentHost) {
    sidebarState.equipmentScrollTop = equipmentHost.scrollTop;
  }
  if (detailHost) {
    sidebarState.detailScrollTop = detailHost.scrollTop;
  }
}

function bindSidebarScrollPersistence(host, key) {
  if (!host) return;
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
  requestAnimationFrame(() => {
    host.scrollTop = target;
  });
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
    isTimeseriesDataSource:
      rawSensor.is_timeseries_data_source === true || rawSensor.isTimeseriesDataSource === true,
  };
  return sensor;
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
  return { categories, allSensors };
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
  const selectedNode = sidebarState.selectedEquipmentId
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
    sidebarState.eventsList = normalizedEvents;
    sidebarState.eventStatusOptions = uniqueStrings(payload?.status_options || payload?.statusOptions);
  } catch (error) {
    sidebarState.eventsError = error?.message || "Unable to load Intel events for equipment.";
    sidebarState.eventsList = [];
    sidebarState.eventStatusOptions = [];
  } finally {
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

  sidebarState.selectedEquipmentId = node.id;
  sidebarState.loadingSensors = true;
  sidebarState.sensorsError = "";
  sidebarState.sensorCategories = [];
  sidebarState.sensorList = [];
  sidebarState.eventsError = "";
  sidebarState.eventsList = [];
  sidebarState.eventStatusOptions = [];
  sidebarState.eventStatusFilter = "";
  invalidateSidebarRender();

  try {
    const payload = await getEquipmentSensors({ item_id: node.id, asset_name: node.name });
    const normalized = normalizeSensorCategories(payload);
    sidebarState.sensorCategories = normalized.categories;
    sidebarState.sensorList = normalized.allSensors;
    sidebarState.expandedSensorCategories = new Set(
      normalized.categories.map((entry) => entry.category),
    );
  } catch (error) {
    sidebarState.sensorsError = error?.message || "Unable to load sensors for equipment.";
    sidebarState.sensorCategories = [];
    sidebarState.sensorList = [];
  } finally {
    sidebarState.loadingSensors = false;
    invalidateSidebarRender();
  }

  if (sidebarState.activeDetailTab === "events") {
    await loadIntelEventsForSelectedEquipment({ forceReload: true });
  }
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
  sidebarState.collapsed = !sidebarState.collapsed;
  window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarState.collapsed ? "1" : "0");
  invalidateSidebarRender();
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
      const isExpanded =
        hasFilter ||
        sidebarState.expandedEquipmentIds.has(node.id) ||
        node.id === sidebarState.selectedEquipmentId;

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
      button.addEventListener("click", () => {
        void selectEquipmentNode(node);
      });
      button.addEventListener("contextmenu", (event) => {
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
              label: "Plot all sensors",
              onSelect: async () => {
                await plotAllSensorsForEquipment(node);
              },
            },
          ],
        });
      });

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

function setDetailSidebarTab(nextTab) {
  const normalized = nextTab === "events" ? "events" : "sensors";
  if (sidebarState.activeDetailTab === normalized) return;
  sidebarState.activeDetailTab = normalized;
  invalidateSidebarRender();
  if (normalized === "events" && sidebarState.selectedEquipmentId) {
    void loadIntelEventsForSelectedEquipment({ forceReload: true });
  }
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
  captureSidebarScrollSnapshot();
  sidebarsRoot.innerHTML = "";
  sidebarsRoot.className = `charts-sidebars${sidebarState.collapsed ? " collapsed" : ""}`;

  const shell = document.createElement("div");
  shell.className = "charts-sidebars-shell";

  const toolbar = document.createElement("div");
  toolbar.className = "sidebars-toolbar";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "secondary-button";
  toggle.textContent = sidebarState.collapsed ? "Show" : "Hide";
  toggle.title = sidebarState.collapsed ? "Show Navigation" : "Hide Navigation";
  toggle.addEventListener("click", () => {
    toggleSidebarCollapse();
  });
  toolbar.append(toggle);

  if (sidebarState.notice) {
    const notice = document.createElement("span");
    notice.className = "sidebars-notice";
    notice.textContent = sidebarState.notice;
    toolbar.append(notice);
  }

  shell.append(toolbar);

  if (!sidebarState.collapsed) {
    const panes = document.createElement("div");
    panes.className = "charts-sidebars-panes";

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
      sidebarState.equipmentFilter = sidebarState.equipmentFilterDraft.trim();
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

    panes.append(equipmentPane);

    if (sidebarState.selectedEquipmentId) {
      const sensorPane = document.createElement("section");
      sensorPane.className = "sidebar-pane sensor-pane";
      const selectedNode = sidebarState.nodeById.get(sidebarState.selectedEquipmentId);
      sensorPane.innerHTML = `
        <header class="sidebar-pane-header">
          <h3>Details</h3>
          <p title="${selectedNode?.name || ""}">${selectedNode?.name || ""}</p>
        </header>
        <div class="detail-tab-strip" role="tablist" aria-label="Equipment details">
          <button
            type="button"
            role="tab"
            class="detail-tab${sidebarState.activeDetailTab === "sensors" ? " active" : ""}"
            aria-selected="${sidebarState.activeDetailTab === "sensors" ? "true" : "false"}"
            data-tab="sensors"
          >
            Sensors
          </button>
          <button
            type="button"
            role="tab"
            class="detail-tab${sidebarState.activeDetailTab === "events" ? " active" : ""}"
            aria-selected="${sidebarState.activeDetailTab === "events" ? "true" : "false"}"
            data-tab="events"
          >
            Events
          </button>
        </div>
        <div class="sidebar-scroll sensor-groups"></div>
      `;
      const tabButtons = Array.from(sensorPane.querySelectorAll(".detail-tab"));
      tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const nextTab = button.dataset.tab === "events" ? "events" : "sensors";
          setDetailSidebarTab(nextTab);
        });
      });
      const sensorGroupsHost = sensorPane.querySelector(".sensor-groups");
      bindSidebarScrollPersistence(sensorGroupsHost, "detailScrollTop");
      if (sidebarState.activeDetailTab === "events") {
        renderEventsSidebar(sensorGroupsHost);
      } else {
        renderSensorSidebar(sensorGroupsHost, snapshot);
      }
      restoreSidebarScroll(sensorGroupsHost, "detailScrollTop");
      panes.append(sensorPane);
    }

    shell.append(panes);
  }

  sidebarsRoot.append(shell);
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
    sidebarState.collapsed ? "1" : "0",
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
    sidebarState.activeDetailTab,
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
  return `${page.id}:${page.gridColumns}:${page.datePreset}:${page.startDate || ""}:${
    page.endDate || ""
  }:${page.frequencyMode || "auto"}:${page.frequencyWindow || "6h"}:${page.charts.length}:${
    page.dirty ? 1 : 0
  }`;
}

function buildChartGridSignature(snapshot) {
  const page = snapshot.pages.find((item) => item.id === snapshot.activePageId);
  if (!page) return "none";
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
  }:${charts}`;
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

async function bootstrap() {
  store.subscribe((snapshot) => {
    void render(snapshot);
  });

  window.addEventListener("resize", () => {
    renderState.gridSignature = "";
    void render(store.getState());
  });

  window.addEventListener("beforeunload", handleBeforeUnload);
  renderRefreshProgress();

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
  await Promise.allSettled([pagesPromise, equipmentPromise, eventsPromise]);
}

void bootstrap();
