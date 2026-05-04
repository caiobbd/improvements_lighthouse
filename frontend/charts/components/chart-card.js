import {
  getTimeSeries,
  getTimeSeriesByTags,
  getSensorContextBatch,
  ApiClientError,
} from "../services/api-client.js";
import { renderLineChart } from "./d3-line-chart.js";

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
const TABLE_REQUIRED_COLUMN_ID = "name";
const FALLBACK_NA = "N/A";
const MIN_LABEL_COLUMN_WIDTH = 32;
const ACTION_COLUMN_MIN_WIDTH = 56;
const MAX_TABLE_COLUMN_WIDTH = 640;
const FALLBACK_TABLE_COLUMNS = [
  { id: "name", label: "Name", required: true },
  { id: "color", label: "Color" },
  { id: "remove", label: "X" },
  { id: "last_value", label: "Last value" },
  { id: "unit_of_measurement", label: "Unit" },
  { id: "avg_1d", label: "-1d AVG" },
  { id: "min", label: "Minimum" },
  { id: "max", label: "Maximum" },
];
const THRESHOLD_COLUMN_IDS = Object.freeze(["hihi", "hi", "lo", "lolo", "custom_hi", "custom_lo"]);
const THRESHOLD_LABEL_BY_KEY = Object.freeze({
  hihi: "HiHi",
  hi: "Hi",
  lo: "Lo",
  lolo: "LoLo",
  custom_hi: "Custom-Hi",
  custom_lo: "Custom-Lo",
});
const THRESHOLD_OVERLAY_ORDER = THRESHOLD_COLUMN_IDS;
const THRESHOLD_OVERLAY_DASH = "6 4";
const THRESHOLD_OVERLAY_STYLE_BY_KEY = Object.freeze({
  hihi: Object.freeze({ label: "HiHi", color: "#d94a4a", dash: THRESHOLD_OVERLAY_DASH }),
  hi: Object.freeze({ label: "Hi", color: "#d9b84a", dash: THRESHOLD_OVERLAY_DASH }),
  lo: Object.freeze({ label: "Lo", color: "#d9b84a", dash: THRESHOLD_OVERLAY_DASH }),
  lolo: Object.freeze({ label: "LoLo", color: "#d94a4a", dash: THRESHOLD_OVERLAY_DASH }),
  custom_hi: Object.freeze({ label: "Custom-Hi", color: "#4e7bc2", dash: THRESHOLD_OVERLAY_DASH }),
  custom_lo: Object.freeze({ label: "Custom-Lo", color: "#4e7bc2", dash: THRESHOLD_OVERLAY_DASH }),
});
const UNIT_CONVERSION_FACTORS = Object.freeze({
  displacement: Object.freeze({
    um: 1.0,
    mm: 1000.0,
    mil: 25.4,
  }),
  velocity: Object.freeze({
    "mm/s": 1.0,
    "in/s": 25.4,
  }),
  acceleration: Object.freeze({
    "m/s2": 1.0,
    g: 9.80665,
  }),
  pressure: Object.freeze({
    kpa: 1.0,
    kpag: 1.0,
    bar: 100.0,
    psi: 6.894757293168361,
    "kgf/cm2": 98.0665,
    inwc: 0.24908891,
    mmh2o: 0.00980665,
  }),
});
const UNIT_ALIASES_RAW = Object.freeze({
  um: Object.freeze([
    "um",
    "µm",
    "μm",
    "micron",
    "microns",
    "micrometer",
    "micrometers",
    "um pp",
    "um-pp",
    "µm pp",
    "µm-pp",
    "μm pp",
    "μm-pp",
  ]),
  mil: Object.freeze(["mil", "mils", "mil pp", "mils pp"]),
  mm: Object.freeze(["mm"]),
  "mm/s": Object.freeze(["mm/s", "mm/s rms", "mmps", "mm sec", "mm/sec", "mms"]),
  "in/s": Object.freeze(["in/s", "ips", "in/s rms", "inch/s", "inch/sec", "in/sec", "inches/s", "inches/sec"]),
  g: Object.freeze(["g", "ge", "g rms", "grms"]),
  "m/s2": Object.freeze(["m/s2", "m/s^2", "m/s²", "m/s2 rms", "m/s² rms", "mps2", "m/sec2"]),
  c: Object.freeze(["c", "°c", "degc", "deg c", "deg. c", "deg.c", "celsius"]),
  f: Object.freeze(["f", "°f", "degf", "deg f", "deg. f", "deg.f", "fahrenheit"]),
  kpa: Object.freeze(["kpa", "kpaa"]),
  kpag: Object.freeze(["kpag", "kpa(g)", "kpa g"]),
  bar: Object.freeze(["bar", "barg", "bar(g)", "bar g"]),
  psi: Object.freeze(["psi", "psig", "psia", "psid", "psi(g)", "psi g"]),
  "kgf/cm2": Object.freeze(["kgf/cm2", "kg/cm2", "kg/cm²", "kgf/cm^2", "kg/cm^2", "kgfcm2"]),
  inwc: Object.freeze(["inwc", "inwg", "inh2o", "in h2o", "inchh2o", "inchesh2o", "inches water column"]),
  mmh2o: Object.freeze(["mmh2o", "mm h2o", "mmwc", "mm water column"]),
});
const TEMPERATURE_DIMENSION = "temperature";

function normalizeThresholdToggleState(value) {
  if (!value || typeof value !== "object") return {};
  const normalized = {};
  Object.entries(value).forEach(([key, enabled]) => {
    const cleaned = String(key || "").trim();
    if (!cleaned || enabled !== true) return;
    normalized[cleaned] = true;
  });
  return normalized;
}

function normalizeThresholdRowState(value) {
  if (!value || typeof value !== "object") return {};
  const normalized = {};
  Object.entries(value).forEach(([key, visible]) => {
    const cleaned = String(key || "").trim();
    if (!cleaned || visible !== true) return;
    normalized[cleaned] = true;
  });
  return normalized;
}

function buildThresholdToggleKey(tagKey, thresholdKey) {
  return `${String(tagKey || "").trim()}::${String(thresholdKey || "").trim().toLowerCase()}`;
}

function buildThresholdToggleSignature(value) {
  return Object.keys(normalizeThresholdToggleState(value))
    .sort()
    .join("|");
}

function buildThresholdRowSignature(value) {
  return Object.keys(normalizeThresholdRowState(value))
    .sort()
    .join("|");
}

function resolveThresholdOverlayStyle(thresholdKey) {
  const id = String(thresholdKey || "").trim().toLowerCase();
  return THRESHOLD_OVERLAY_STYLE_BY_KEY[id] || null;
}

function resolveThresholdLabel(thresholdKey) {
  const id = String(thresholdKey || "").trim().toLowerCase();
  return THRESHOLD_LABEL_BY_KEY[id] || id;
}

function isThresholdColumnId(columnId) {
  const id = String(columnId || "").trim().toLowerCase();
  return THRESHOLD_COLUMN_IDS.includes(id);
}

function normalizeUnitToken(unit) {
  if (unit === null || unit === undefined) return null;
  let text = String(unit).trim().toLowerCase();
  if (!text) return null;

  if (typeof text.normalize === "function") {
    text = text.normalize("NFKC");
  }
  const replacements = [
    ["\u00b5", "u"],
    ["\u03bc", "u"],
    ["\u00b0", ""],
    ["\u00b2", "2"],
    ["\u00b3", "3"],
    ["âµ", "u"],
    ["â°", ""],
    ["â²", "2"],
    ["â³", "3"],
    ["Âµ", "u"],
    ["Â°", ""],
    ["Â²", "2"],
    ["Â³", "3"],
  ];
  replacements.forEach(([source, target]) => {
    text = text.split(source).join(target);
  });
  text = text.replace(/_/g, "");
  text = text.replace(/\u2013|\u2014/g, "-");
  text = text.replace(/\s+/g, " ").trim();
  text = text.replace(/[.\-()\s]/g, "");
  return text || null;
}

function buildUnitAliasIndex() {
  const aliasIndex = {};
  Object.entries(UNIT_ALIASES_RAW).forEach(([canonical, aliases]) => {
    const canonicalToken = normalizeUnitToken(canonical);
    if (canonicalToken) {
      aliasIndex[canonicalToken] = canonical;
    }
    aliases.forEach((alias) => {
      const token = normalizeUnitToken(alias);
      if (token) {
        aliasIndex[token] = canonical;
      }
    });
  });
  return aliasIndex;
}

const UNIT_ALIAS_INDEX = Object.freeze(buildUnitAliasIndex());
const UNIT_DIMENSION_BY_CANONICAL = Object.freeze(
  (() => {
    const dimensions = {};
    Object.entries(UNIT_CONVERSION_FACTORS).forEach(([dimension, factors]) => {
      Object.keys(factors).forEach((canonical) => {
        dimensions[canonical] = dimension;
      });
    });
    dimensions.c = TEMPERATURE_DIMENSION;
    dimensions.f = TEMPERATURE_DIMENSION;
    return dimensions;
  })(),
);

function canonicalUnit(unit) {
  const token = normalizeUnitToken(unit);
  if (!token) return null;
  return UNIT_ALIAS_INDEX[token] || null;
}

function convertUnitValue(value, sourceUnit, targetUnit) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const sourceCanonical = canonicalUnit(sourceUnit);
  const targetCanonical = canonicalUnit(targetUnit);
  if (!sourceCanonical || !targetCanonical) return null;
  const sourceDimension = UNIT_DIMENSION_BY_CANONICAL[sourceCanonical];
  const targetDimension = UNIT_DIMENSION_BY_CANONICAL[targetCanonical];
  if (!sourceDimension || sourceDimension !== targetDimension) return null;

  if (sourceDimension === TEMPERATURE_DIMENSION) {
    if (sourceCanonical === targetCanonical) return numeric;
    if (sourceCanonical === "c" && targetCanonical === "f") {
      return (numeric * 9) / 5 + 32;
    }
    if (sourceCanonical === "f" && targetCanonical === "c") {
      return ((numeric - 32) * 5) / 9;
    }
    return null;
  }

  const factors = UNIT_CONVERSION_FACTORS[sourceDimension] || null;
  if (!factors) return null;
  const sourceFactor = Number(factors[sourceCanonical]);
  const targetFactor = Number(factors[targetCanonical]);
  if (!Number.isFinite(sourceFactor) || !Number.isFinite(targetFactor) || targetFactor === 0) {
    return null;
  }
  return (numeric * sourceFactor) / targetFactor;
}

function resolveThresholdValueForSensorUnit(threshold, targetUnit) {
  const sourceUnit = String(threshold?.unit || "").trim() || null;
  const desiredUnit = String(targetUnit || "").trim() || null;
  const backendConvertedValue = Number(threshold?.converted_value);
  if (Number.isFinite(backendConvertedValue)) {
    return {
      value: backendConvertedValue,
      unit: String(threshold?.converted_unit || desiredUnit || sourceUnit || "").trim() || null,
      sourceUnit,
      converted: true,
    };
  }

  const rawValue = Number(threshold?.value);
  if (!Number.isFinite(rawValue)) {
    return {
      value: null,
      unit: desiredUnit || sourceUnit,
      sourceUnit,
      converted: false,
    };
  }

  const convertedValue = convertUnitValue(rawValue, sourceUnit, desiredUnit);
  if (Number.isFinite(convertedValue)) {
    const sourceCanonical = canonicalUnit(sourceUnit);
    const targetCanonical = canonicalUnit(desiredUnit);
    const converted = Boolean(sourceCanonical && targetCanonical && sourceCanonical !== targetCanonical);
    return {
      value: convertedValue,
      unit: desiredUnit || sourceUnit,
      sourceUnit,
      converted,
    };
  }

  return {
    value: rawValue,
    unit: sourceUnit || desiredUnit,
    sourceUnit,
    converted: false,
  };
}

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

function buildLegacyQueryKey(chart) {
  const chartState = chart || {};
  const fromAttributes = Array.isArray(chartState.fromAttributes) ? chartState.fromAttributes : [];
  const fromCategories = Array.isArray(chartState.fromCategories) ? chartState.fromCategories : [];
  return [
    String(chartState.assetName || "").trim(),
    String(chartState.itemId || "").trim(),
    String(chartState.attributeId || "").trim(),
    String(chartState.attributeName || "").trim(),
    fromAttributes.map((entry) => String(entry || "").trim()).join("|"),
    fromCategories.map((entry) => String(entry || "").trim()).join("|"),
  ].join("::");
}

function buildChartDataSignature(chart, page) {
  const tags = getChartTags(chart);
  return `${buildQueryContextKey(page)}::${buildTagSetKey(tags)}::${buildLegacyQueryKey(chart)}`;
}

function buildChartRenderSignature(chart, page) {
  return [
    chart?.normalizationEnabled === true ? "1" : "0",
    chart?.splitYAxisEnabled === true ? "1" : "0",
    buildThresholdToggleSignature(chart?.thresholdToggleState),
    buildThresholdRowSignature(chart?.thresholdRowState),
    String(page?.pageType || "").toLowerCase(),
    String(page?.alarmMeta?.spanStart || page?.alarmMeta?.startDate || ""),
    String(page?.alarmMeta?.spanEnd || page?.alarmMeta?.endDate || ""),
  ].join("::");
}

function buildTableColumnsSignature(tableColumns) {
  if (!tableColumns || typeof tableColumns !== "object") {
    return "none";
  }
  const selected = Array.isArray(tableColumns.selectedIds) ? tableColumns.selectedIds.join(",") : "";
  const widths =
    tableColumns.columnWidths && typeof tableColumns.columnWidths === "object"
      ? Object.entries(tableColumns.columnWidths)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([id, width]) => `${id}:${width}`)
          .join(",")
      : "";
  return `${selected}::${widths}`;
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

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return FALLBACK_NA;
  return numeric.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatText(value) {
  const text = String(value ?? "").trim();
  return text || FALLBACK_NA;
}

function formatList(values) {
  if (!Array.isArray(values) || values.length === 0) return FALLBACK_NA;
  const cleaned = values.map((entry) => String(entry || "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : FALLBACK_NA;
}

function getThresholdPlotValue(threshold, targetUnit = null) {
  const resolved = resolveThresholdValueForSensorUnit(threshold, targetUnit);
  return Number.isFinite(Number(resolved.value)) ? Number(resolved.value) : null;
}

function getThresholdValue(row, key) {
  const threshold = row?.thresholds?.[key] || null;
  if (!threshold) return FALLBACK_NA;
  const baseUnit = String(row?.unit_of_measurement || "").trim();
  const resolved = resolveThresholdValueForSensorUnit(threshold, baseUnit);
  const rawValue = Number(threshold.value);
  const isDerivedThresholdRow = row?.isDerivedThresholdRow === true;
  const thresholdValue = isDerivedThresholdRow
    ? Number(resolved.value)
    : Number.isFinite(rawValue)
      ? rawValue
      : Number(resolved.value);
  if (!Number.isFinite(thresholdValue)) return FALLBACK_NA;
  const value = formatNumber(thresholdValue);
  const thresholdUnit = String(threshold.unit || "").trim();
  if (isDerivedThresholdRow) {
    return value;
  }
  if (!thresholdUnit) return value;
  const baseCanonical = canonicalUnit(baseUnit);
  const thresholdCanonical = canonicalUnit(thresholdUnit);
  if (baseCanonical && thresholdCanonical) {
    if (baseCanonical !== thresholdCanonical) {
      return `${value} (${thresholdUnit})`;
    }
    return value;
  }
  if (!baseUnit || thresholdUnit !== baseUnit) {
    return `${value} (${thresholdUnit})`;
  }
  return value;
}

function formatRowValueByColumn(columnId, row) {
  switch (columnId) {
    case "name":
      return formatText(row.name);
    case "tag":
      return formatText(row.tag);
    case "reference":
      return formatText(row.reference);
    case "categories":
      return formatList(row.categories);
    case "last_value":
      return isFiniteNumber(row.last_value) ? formatNumber(row.last_value) : FALLBACK_NA;
    case "avg_1d":
      return isFiniteNumber(row.avg_1d) ? formatNumber(row.avg_1d) : FALLBACK_NA;
    case "min":
      return isFiniteNumber(row.min) ? formatNumber(row.min) : FALLBACK_NA;
    case "max":
      return isFiniteNumber(row.max) ? formatNumber(row.max) : FALLBACK_NA;
    case "unit_of_measurement":
      return formatText(row.unit_of_measurement);
    case "hihi":
    case "hi":
    case "lo":
    case "lolo":
    case "custom_hi":
    case "custom_lo":
      return getThresholdValue(row, columnId);
    default:
      return FALLBACK_NA;
  }
}

function mapTableColumns(tableColumns) {
  const availableColumns = Array.isArray(tableColumns?.availableColumns)
    ? tableColumns.availableColumns
    : FALLBACK_TABLE_COLUMNS;
  const byId = new Map(availableColumns.map((column) => [column.id, column]));
  const selectedIds = Array.isArray(tableColumns?.selectedIds) ? tableColumns.selectedIds : [];

  const ordered = [];
  if (byId.has(TABLE_REQUIRED_COLUMN_ID)) {
    ordered.push(byId.get(TABLE_REQUIRED_COLUMN_ID));
  }

  selectedIds.forEach((columnId) => {
    if (columnId === TABLE_REQUIRED_COLUMN_ID) return;
    const definition = byId.get(columnId);
    if (definition) {
      ordered.push(definition);
    }
  });

  if (ordered.length === 0) {
    FALLBACK_TABLE_COLUMNS.forEach((column) => {
      const definition = byId.get(column.id);
      if (definition) ordered.push(definition);
    });
  }
  if (ordered.length === 0 && availableColumns.length > 0) {
    ordered.push(availableColumns[0]);
  }
  return ordered;
}

function estimateLabelMinWidth(label) {
  const text = String(label || "").trim();
  if (!text) return MIN_LABEL_COLUMN_WIDTH;
  return Math.max(MIN_LABEL_COLUMN_WIDTH, Math.round(text.length * 7 + 16));
}

function getColumnMinWidth(columnId, columnLabel = "") {
  const id = String(columnId || "").trim();
  if (id === "color" || id === "remove") return ACTION_COLUMN_MIN_WIDTH;
  return estimateLabelMinWidth(columnLabel || id);
}

function clampColumnWidth(columnId, width, columnLabel = "") {
  const parsed = Number(width);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(
    getColumnMinWidth(columnId, columnLabel),
    Math.min(MAX_TABLE_COLUMN_WIDTH, Math.round(parsed)),
  );
}

function estimateColumnWidth(columnId, columnLabel, rows) {
  if (columnId === "color" || columnId === "remove") return 64;
  if (columnId === "name") {
    const maxName = (Array.isArray(rows) ? rows : []).reduce((highest, row) => {
      const value = String(row?.name || "").trim();
      return Math.max(highest, value.length);
    }, String(columnLabel || "").length);
    return clampColumnWidth(columnId, Math.min(560, maxName * 7 + 36), columnLabel);
  }
  const maxLen = (Array.isArray(rows) ? rows : []).reduce((highest, row) => {
    const value = formatRowValueByColumn(columnId, row);
    return Math.max(highest, String(value || "").length);
  }, String(columnLabel || "").length);
  return clampColumnWidth(columnId, Math.min(360, maxLen * 7 + 28), columnLabel);
}

export function createChartCard({
  chart,
  page,
  tableColumns = null,
  actions,
  syncBus = null,
  forceRefresh = false,
}) {
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
    <p>Bottom 20% + Drag: Pan X</p>
    <p>Ctrl + Wheel: Zoom X</p>
    <p>Alt + Wheel: Zoom Y</p>
    <p>Ctrl + Shift + Drag: Sync X zoom (all charts)</p>
    <p>Click: Pin cursor (max 5 per page)</p>
    <p>Drag pinned cursor off edge: Remove pin</p>
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
  let sensorContextRows = Array.isArray(cachedRuntime?.sensorContextRows)
    ? cloneForRuntime(cachedRuntime.sensorContextRows)
    : [];
  let thresholdToggleState = normalizeThresholdToggleState(
    cachedRuntime?.thresholdToggleState || chart?.thresholdToggleState,
  );
  let thresholdRowState = normalizeThresholdRowState(
    cachedRuntime?.thresholdRowState || chart?.thresholdRowState,
  );
  const hiddenSeries = new Set(Array.isArray(cachedRuntime?.hiddenSeries) ? cachedRuntime.hiddenSeries : []);
  const pendingGlobalWidthColumns = new Set();
  let chartRenderHandle = null;
  let latestLoadToken = 0;
  let inlineNoticeTimeout = null;
  let resizeObserver = null;
  let pendingResizeFrame = null;
  let lastBodyWidth = 0;
  let lastChartDataSignature = buildChartDataSignature(chart, page);
  let lastChartRenderSignature = buildChartRenderSignature(chart, page);
  let lastTableColumnsSignature = buildTableColumnsSignature(tableColumns);
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
    hoverTimestamp:
      typeof cachedRuntime?.interactionState?.hoverTimestamp === "string"
        ? cachedRuntime.interactionState.hoverTimestamp
        : null,
    pinnedCursors: Array.isArray(cachedRuntime?.interactionState?.pinnedCursors)
      ? cachedRuntime.interactionState.pinnedCursors
          .map((pin) => ({
            id: String(pin?.id || ""),
            timestamp: String(pin?.timestamp || ""),
          }))
          .filter((pin) => pin.id && pin.timestamp)
      : [],
  };

  function persistRuntimeCache() {
    chartRuntimeCache.set(runtimeKey, {
      series: cloneForRuntime(currentSeries),
      sensorContextRows: cloneForRuntime(sensorContextRows),
      thresholdToggleState: { ...thresholdToggleState },
      thresholdRowState: { ...thresholdRowState },
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
        hoverTimestamp: interactionState.hoverTimestamp || null,
        pinnedCursors: interactionState.pinnedCursors.map((pin) => ({ ...pin })),
      },
    });
  }

  function syncRenderSignatures() {
    lastChartDataSignature = buildChartDataSignature(chart, page);
    lastChartRenderSignature = buildChartRenderSignature(chart, page);
    lastTableColumnsSignature = buildTableColumnsSignature(tableColumns);
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

  function measureBodyWidth() {
    const rect = body.getBoundingClientRect();
    return Math.round(rect.width || body.clientWidth || 0);
  }

  function scheduleChartResize(force = false) {
    if (pendingResizeFrame) {
      window.cancelAnimationFrame(pendingResizeFrame);
    }

    pendingResizeFrame = window.requestAnimationFrame(() => {
      pendingResizeFrame = null;
      if (!body.isConnected || !chartRenderHandle?.resize) return;
      const nextWidth = measureBodyWidth();
      if (!nextWidth) return;
      if (!force && Math.abs(nextWidth - lastBodyWidth) < 1) return;
      lastBodyWidth = nextWidth;
      chartRenderHandle.resize();
    });
  }

  function clearXInteractionState() {
    interactionState.currentXDomain = null;
    interactionState.previewXDomain = null;
    interactionState.hoverTimestamp = null;
    interactionState.pinnedCursors = [];
    chartRenderHandle?.setPreviewXDomain?.(null);
    chartRenderHandle?.setHoverTimestamp?.(null);
    chartRenderHandle?.setPinnedCursors?.([]);
  }

  function syncThresholdStatesFromChart(nextChart = chart) {
    if (!nextChart || typeof nextChart !== "object") return;
    if (Object.prototype.hasOwnProperty.call(nextChart, "thresholdToggleState")) {
      thresholdToggleState = normalizeThresholdToggleState(nextChart.thresholdToggleState);
    }
    if (Object.prototype.hasOwnProperty.call(nextChart, "thresholdRowState")) {
      thresholdRowState = normalizeThresholdRowState(nextChart.thresholdRowState);
    }
  }

  function isThresholdToggleEnabled(tagKey, thresholdKey) {
    const toggleKey = buildThresholdToggleKey(tagKey, thresholdKey);
    return thresholdToggleState[toggleKey] === true;
  }

  function isThresholdRowPinned(tagKey, thresholdKey) {
    const toggleKey = buildThresholdToggleKey(tagKey, thresholdKey);
    return thresholdRowState[toggleKey] === true;
  }

  function isThresholdRowVisible(tagKey, thresholdKey) {
    return isThresholdToggleEnabled(tagKey, thresholdKey) || isThresholdRowPinned(tagKey, thresholdKey);
  }

  function removeThresholdRow(tagKey, thresholdKey) {
    const toggleKey = buildThresholdToggleKey(tagKey, thresholdKey);
    if (!toggleKey || !String(tagKey || "").trim()) return;
    const nextToggleState = { ...thresholdToggleState };
    const nextRowState = { ...thresholdRowState };
    delete nextToggleState[toggleKey];
    delete nextRowState[toggleKey];
    thresholdToggleState = normalizeThresholdToggleState(nextToggleState);
    thresholdRowState = normalizeThresholdRowState(nextRowState);
    chart.thresholdToggleState = { ...thresholdToggleState };
    chart.thresholdRowState = { ...thresholdRowState };
    persistChartPatch({
      thresholdToggleState: { ...thresholdToggleState },
      thresholdRowState: { ...thresholdRowState },
    });
    interactionState.currentYDomain = null;
    drawChart();
    renderSensorContextTable();
    persistRuntimeCache();
  }

  function buildAutoEnabledThresholdTogglesForSingleTag(tags, contextRows) {
    if (!Array.isArray(tags) || tags.length !== 1) return null;
    const tagKey = toTagKey(tags[0]);
    if (!tagKey) return null;

    const context = (Array.isArray(contextRows) ? contextRows : []).find(
      (row) => String(row?.tag_key || "").trim() === tagKey,
    );
    if (!context || typeof context !== "object") return null;

    const thresholds = context?.thresholds && typeof context.thresholds === "object" ? context.thresholds : {};
    const nextState = {};
    THRESHOLD_OVERLAY_ORDER.forEach((thresholdKey) => {
      const threshold = thresholds?.[thresholdKey] || null;
      if (String(thresholdKey).startsWith("custom_") && threshold?.is_configured !== true) {
        return;
      }
      const value = Number(threshold?.converted_value ?? threshold?.value);
      if (!Number.isFinite(value)) return;
      const toggleKey = buildThresholdToggleKey(tagKey, thresholdKey);
      if (!toggleKey) return;
      nextState[toggleKey] = true;
    });

    const normalized = normalizeThresholdToggleState(nextState);
    return Object.keys(normalized).length > 0 ? normalized : null;
  }

  function toggleThresholdLine(tagKey, thresholdKey, options = {}) {
    const keepRowVisible = options.keepRowVisible === true;
    const toggleKey = buildThresholdToggleKey(tagKey, thresholdKey);
    if (!toggleKey || !String(tagKey || "").trim()) return;

    const nextState = { ...thresholdToggleState };
    const nextRowState = { ...thresholdRowState };
    if (nextState[toggleKey] === true) {
      delete nextState[toggleKey];
    } else {
      nextState[toggleKey] = true;
    }
    if (keepRowVisible) {
      nextRowState[toggleKey] = true;
    }
    thresholdToggleState = normalizeThresholdToggleState(nextState);
    thresholdRowState = normalizeThresholdRowState(nextRowState);
    chart.thresholdToggleState = { ...thresholdToggleState };
    chart.thresholdRowState = { ...thresholdRowState };
    persistChartPatch({
      thresholdToggleState: { ...thresholdToggleState },
      thresholdRowState: { ...thresholdRowState },
    });
    interactionState.currentYDomain = null;
    drawChart();
    renderSensorContextTable();
    persistRuntimeCache();
  }

  function buildThresholdOverlayDescriptors() {
    const tags = getChartTags(chart);
    const contextByTag = new Map(
      (Array.isArray(sensorContextRows) ? sensorContextRows : []).map((row) => [String(row?.tag_key || ""), row]),
    );

    return tags.flatMap((tag) => {
      const tagKey = toTagKey(tag);
      const context = contextByTag.get(tagKey) || null;
      const thresholds = context?.thresholds && typeof context.thresholds === "object" ? context.thresholds : {};
      return THRESHOLD_OVERLAY_ORDER.flatMap((thresholdKey) => {
        if (!isThresholdToggleEnabled(tagKey, thresholdKey)) {
          return [];
        }
        const style = resolveThresholdOverlayStyle(thresholdKey);
        if (!style) {
          return [];
        }
        const threshold = thresholds?.[thresholdKey] || null;
        const resolved = resolveThresholdValueForSensorUnit(threshold, context?.unit_of_measurement);
        const value = Number(resolved.value);
        if (!Number.isFinite(value)) {
          return [];
        }
        return [
          {
            key: buildThresholdToggleKey(tagKey, thresholdKey),
            tagKey,
            thresholdKey,
            name: style.label,
            value,
            color: style.color,
            dash: style.dash,
            unit: String(resolved.unit || threshold?.unit || "").trim() || null,
          },
        ];
      });
    });
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
    let guardrailChanged = false;
    if (chart.normalizationEnabled && chart.splitYAxisEnabled) {
      chart.splitYAxisEnabled = false;
      patch.splitYAxisEnabled = false;
      setInlineNotice("Split Y disabled while normalization is enabled.");
      guardrailChanged = true;
    }
    if (chart.splitYAxisEnabled && currentSeries.length > 4) {
      chart.splitYAxisEnabled = false;
      patch.splitYAxisEnabled = false;
      setInlineNotice("Split Y disabled because this chart has more than 4 tags.");
      guardrailChanged = true;
    }
    if (Object.keys(patch).length > 0) {
      persistChartPatch(patch);
    }
    return guardrailChanged;
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
          setHoverTimestamp(timestamp) {
            interactionState.hoverTimestamp = typeof timestamp === "string" ? timestamp : null;
            chartRenderHandle?.setHoverTimestamp?.(interactionState.hoverTimestamp);
            persistRuntimeCache();
          },
          setPinnedCursors(pins) {
            interactionState.pinnedCursors = (Array.isArray(pins) ? pins : [])
              .map((pin) => ({
                id: String(pin?.id || ""),
                timestamp: String(pin?.timestamp || ""),
              }))
              .filter((pin) => pin.id && pin.timestamp)
              .slice(0, 5);
            chartRenderHandle?.setPinnedCursors?.(interactionState.pinnedCursors);
            persistRuntimeCache();
          },
        })
      : () => {};

  async function loadSensorContextForTags(tags, nextPage) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }
    const dateParams = resolveDateParams(nextPage);
    const window = resolveEffectiveWindow(nextPage, dateParams);
    const payload = await getSensorContextBatch({
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
    });
    return Array.isArray(payload?.rows) ? payload.rows : [];
  }

  function collectSeriesStatsByTag() {
    const statsByTag = new Map();
    currentSeries.forEach((line) => {
      const tagKey = getLineTagKey(line) || String(line?.id || "");
      if (!tagKey) return;
      const bucket = statsByTag.get(tagKey) || {
        min: null,
        max: null,
        last_value: null,
        last_timestamp: null,
      };
      const points = Array.isArray(line?.points) ? line.points : [];
      points.forEach((point) => {
        const numeric = Number(point?.value);
        if (!Number.isFinite(numeric)) return;
        bucket.min = bucket.min == null ? numeric : Math.min(bucket.min, numeric);
        bucket.max = bucket.max == null ? numeric : Math.max(bucket.max, numeric);

        const timestamp = String(point?.timestamp || "");
        if (!timestamp) return;
        if (!bucket.last_timestamp || timestamp >= bucket.last_timestamp) {
          bucket.last_timestamp = timestamp;
          bucket.last_value = numeric;
        }
      });
      statsByTag.set(tagKey, bucket);
    });
    return statsByTag;
  }

  function getSeriesKeysForTag(tagKey) {
    return currentSeries
      .filter((line) => getLineTagKey(line) === tagKey)
      .map((line) => String(line?.id || ""))
      .filter(Boolean);
  }

  function isTagHidden(tagKey) {
    const keys = getSeriesKeysForTag(tagKey);
    if (keys.length === 0) return false;
    return keys.every((key) => hiddenSeries.has(key));
  }

  function toggleTagHidden(tagKey) {
    const keys = getSeriesKeysForTag(tagKey);
    if (keys.length === 0) return;
    const shouldHide = !keys.every((key) => hiddenSeries.has(key));
    keys.forEach((key) => {
      if (shouldHide) hiddenSeries.add(key);
      else hiddenSeries.delete(key);
    });
    drawChart();
    renderSensorContextTable();
    renderActionMenu();
    persistRuntimeCache();
  }

  function removeTagFromChart(tagKey) {
    if (!tagKey) return;
    const tags = getChartTags(chart);
    const nextTags = tags.filter((tag) => toTagKey(tag) !== tagKey);
    const patch = buildChartPatchFromTags(nextTags, chart);
    const nextToggleState = { ...thresholdToggleState };
    const nextRowState = { ...thresholdRowState };
    Object.keys(nextToggleState).forEach((key) => {
      if (String(key).startsWith(`${tagKey}::`)) {
        delete nextToggleState[key];
      }
    });
    Object.keys(nextRowState).forEach((key) => {
      if (String(key).startsWith(`${tagKey}::`)) {
        delete nextRowState[key];
      }
    });
    thresholdToggleState = normalizeThresholdToggleState(nextToggleState);
    thresholdRowState = normalizeThresholdRowState(nextRowState);
    patch.thresholdToggleState = { ...thresholdToggleState };
    patch.thresholdRowState = { ...thresholdRowState };
    Object.assign(chart, patch);

    Array.from(hiddenSeries).forEach((hiddenKey) => {
      if (String(hiddenKey).startsWith(`${tagKey}::`)) {
        hiddenSeries.delete(hiddenKey);
      }
    });
    persistChartPatch(patch);
    void load();
    persistRuntimeCache();
  }

  function buildDerivedThresholdRow(sensorRow, thresholdKey, threshold) {
    const resolved = resolveThresholdValueForSensorUnit(threshold, sensorRow?.unit_of_measurement);
    const resolvedValue = Number(resolved.value);
    const resolvedUnit =
      String(sensorRow?.unit_of_measurement || resolved.unit || threshold?.unit || "").trim() || null;
    return {
      rowType: "threshold",
      isDerivedThresholdRow: true,
      tagKey: sensorRow.tagKey,
      thresholdKey,
      name: `${sensorRow.name} | ${resolveThresholdLabel(thresholdKey)}`,
      tag: FALLBACK_NA,
      reference: FALLBACK_NA,
      categories: [],
      unit_of_measurement: resolvedUnit,
      last_value: Number.isFinite(resolvedValue) ? resolvedValue : null,
      avg_1d: null,
      min: null,
      max: null,
      thresholds: {
        [thresholdKey]: {
          ...threshold,
          converted_value: Number.isFinite(resolvedValue) ? resolvedValue : threshold?.converted_value ?? null,
          converted_unit: resolvedUnit,
          conversion_applied:
            threshold?.conversion_applied === true || resolved.converted === true,
        },
      },
    };
  }

  function buildSensorTableRows() {
    const statsByTag = collectSeriesStatsByTag();
    const rowsByTag = new Map();
    const contextByTag = new Map(
      (Array.isArray(sensorContextRows) ? sensorContextRows : []).map((row) => [String(row?.tag_key || ""), row]),
    );

    const tags = getChartTags(chart);
    tags.forEach((tag) => {
      const tagKey = toTagKey(tag);
      const context = contextByTag.get(tagKey) || null;
      const stats = statsByTag.get(tagKey) || {};
      rowsByTag.set(tagKey, {
        rowType: "sensor",
        isDerivedThresholdRow: false,
        tagKey,
        name: context?.label || tag.label || tag.attributeName || tag.attributeId || tagKey,
        tag: context?.attribute_id || tag.attributeId || context?.attribute_name || tag.attributeName || FALLBACK_NA,
        reference: context?.reference || FALLBACK_NA,
        categories: Array.isArray(context?.categories) ? context.categories : [],
        unit_of_measurement: context?.unit_of_measurement || null,
        last_value: context?.last_value ?? stats.last_value ?? null,
        avg_1d: context?.avg_1d ?? null,
        min: stats.min ?? null,
        max: stats.max ?? null,
        thresholds: context?.thresholds || {},
      });
    });

    currentSeries.forEach((line, index) => {
      const tagKey = getLineTagKey(line);
      if (!tagKey || rowsByTag.has(tagKey)) return;
      const stats = statsByTag.get(tagKey) || {};
      rowsByTag.set(tagKey, {
        rowType: "sensor",
        isDerivedThresholdRow: false,
        tagKey,
        name: line?.name || `Series ${index + 1}`,
        tag: tagKey,
        reference: FALLBACK_NA,
        categories: [],
        unit_of_measurement: null,
        last_value: stats.last_value ?? null,
        avg_1d: null,
        min: stats.min ?? null,
        max: stats.max ?? null,
        thresholds: {},
      });
    });

    const rows = [];
    Array.from(rowsByTag.values()).forEach((sensorRow) => {
      rows.push(sensorRow);
      THRESHOLD_COLUMN_IDS.forEach((thresholdKey) => {
        const threshold = sensorRow?.thresholds?.[thresholdKey] || null;
        const thresholdValue = getThresholdPlotValue(threshold, sensorRow?.unit_of_measurement);
        if (!isFiniteNumber(thresholdValue)) return;
        if (!isThresholdRowVisible(sensorRow.tagKey, thresholdKey)) return;
        rows.push(buildDerivedThresholdRow(sensorRow, thresholdKey, threshold));
      });
    });
    return rows;
  }

  function renderSensorContextTable() {
    footer.innerHTML = "";

    const rows = buildSensorTableRows();
    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.className = "sensor-context-empty";
      empty.textContent = "No sensors selected for this chart.";
      footer.append(empty);
      return;
    }

    const columns = mapTableColumns(tableColumns);
    const columnWidthsFromState =
      tableColumns && typeof tableColumns.columnWidths === "object" ? tableColumns.columnWidths : {};
    const resolvedColumnWidths = {};
    const missingGlobalWidths = [];
    columns.forEach((column) => {
      const manualWidth = clampColumnWidth(column.id, columnWidthsFromState?.[column.id], column.label);
      if (Number.isFinite(manualWidth)) {
        resolvedColumnWidths[column.id] = manualWidth;
        return;
      }

      const estimated = estimateColumnWidth(column.id, column.label, rows);
      const normalized = clampColumnWidth(column.id, estimated, column.label);
      resolvedColumnWidths[column.id] = normalized;
      if (!pendingGlobalWidthColumns.has(column.id)) {
        pendingGlobalWidthColumns.add(column.id);
        missingGlobalWidths.push({ id: column.id, width: normalized });
      }
    });
    if (missingGlobalWidths.length > 0) {
      queueMicrotask(() => {
        missingGlobalWidths.forEach((entry) => {
          actions.setGlobalTableColumnWidth?.(entry.id, entry.width);
          pendingGlobalWidthColumns.delete(entry.id);
        });
      });
    }

    const wrapper = document.createElement("div");
    wrapper.className = "sensor-context-table-container";

    const table = document.createElement("table");
    table.className = "sensor-context-table";
    const totalColumnWidth = columns.reduce((sum, column) => sum + resolvedColumnWidths[column.id], 0);
    table.style.width = "100%";
    table.style.minWidth = `${totalColumnWidth}px`;
    const colgroup = document.createElement("colgroup");
    const colById = new Map();
    columns.forEach((column) => {
      const col = document.createElement("col");
      col.style.width = `${resolvedColumnWidths[column.id]}px`;
      colById.set(column.id, col);
      colgroup.append(col);
    });
    const fillerCol = document.createElement("col");
    fillerCol.className = "sensor-context-filler-col";
    colgroup.append(fillerCol);
    table.append(colgroup);

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    columns.forEach((column, index) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.dataset.columnId = column.id;
      th.style.width = `${resolvedColumnWidths[column.id]}px`;
      if (index === 0 || column.id === TABLE_REQUIRED_COLUMN_ID) {
        th.classList.add("sticky-column");
      }

      const label = document.createElement("span");
      label.className = "sensor-context-head-label";
      label.textContent = column.label || column.id;
      label.title = column.label || column.id;
      th.append(label);

      const resizer = document.createElement("button");
      resizer.type = "button";
      resizer.className = "sensor-context-col-resizer";
      resizer.title = `Resize ${column.label || column.id} column`;
      resizer.setAttribute("aria-label", `Resize ${column.label || column.id} column`);
      resizer.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const startX = event.clientX;
        const startWidth = resolvedColumnWidths[column.id];
        let lastWidth = startWidth;

        const onMove = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          const nextWidth = clampColumnWidth(column.id, startWidth + delta, column.label);
          if (nextWidth === lastWidth) return;
          lastWidth = nextWidth;
          resolvedColumnWidths[column.id] = nextWidth;
          const colNode = colById.get(column.id);
          if (colNode) {
            colNode.style.width = `${nextWidth}px`;
          }
          th.style.width = `${nextWidth}px`;
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          actions.setGlobalTableColumnWidth?.(column.id, lastWidth);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
      th.append(resizer);
      headRow.append(th);
    });
    const fillerHead = document.createElement("th");
    fillerHead.className = "sensor-context-filler-head";
    fillerHead.setAttribute("aria-hidden", "true");
    headRow.append(fillerHead);
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const isDerivedThresholdRow = row?.isDerivedThresholdRow === true;
      const tr = document.createElement("tr");
      tr.classList.toggle("is-hidden", isTagHidden(row.tagKey));
      if (isDerivedThresholdRow) {
        tr.classList.add("is-threshold-derived-row");
      }
      columns.forEach((column, index) => {
        const td = document.createElement("td");
        if (index === 0 || column.id === TABLE_REQUIRED_COLUMN_ID) {
          td.classList.add("sticky-column");
        }

        if (column.id === "color") {
          td.classList.add("sensor-context-cell-action");
          if (isDerivedThresholdRow) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sensor-context-toggle";
            button.title = `${resolveThresholdLabel(row.thresholdKey)} threshold`;
            button.setAttribute("aria-label", `${resolveThresholdLabel(row.thresholdKey)} threshold`);
            button.addEventListener("click", () => {
              toggleThresholdLine(row.tagKey, row.thresholdKey, { keepRowVisible: true });
            });
            const swatch = document.createElement("span");
            swatch.className = "sensor-context-color";
            swatch.style.background = resolveThresholdOverlayStyle(row.thresholdKey)?.color || "#6f7e8f";
            button.append(swatch);
            td.append(button);
          } else {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "sensor-context-toggle";
            button.title = "Toggle sensor visibility";
            button.setAttribute("aria-label", "Toggle sensor visibility");
            button.addEventListener("click", () => {
              toggleTagHidden(row.tagKey);
            });
            const swatch = document.createElement("span");
            swatch.className = "sensor-context-color";
            const line = currentSeries.find((entry) => getLineTagKey(entry) === row.tagKey);
            swatch.style.background = line?.color || "#6f7e8f";
            button.append(swatch);
            td.append(button);
          }
        } else if (column.id === "remove") {
          td.classList.add("sensor-context-cell-action");
          if (isDerivedThresholdRow) {
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "sensor-context-remove";
            remove.textContent = "X";
            remove.title = `Hide ${resolveThresholdLabel(row.thresholdKey)} threshold`;
            remove.setAttribute("aria-label", `Hide ${resolveThresholdLabel(row.thresholdKey)} threshold`);
            remove.disabled = !row.tagKey || !row.thresholdKey;
            remove.addEventListener("click", () => {
              removeThresholdRow(row.tagKey, row.thresholdKey);
            });
            td.append(remove);
          } else {
            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "sensor-context-remove";
            remove.textContent = "X";
            remove.title = "Remove sensor from chart";
            remove.setAttribute("aria-label", "Remove sensor from chart");
            remove.disabled = !row.tagKey || row.tagKey === FALLBACK_NA;
            remove.addEventListener("click", () => {
              removeTagFromChart(row.tagKey);
            });
            td.append(remove);
          }
        } else if (isThresholdColumnId(column.id)) {
          if (isDerivedThresholdRow && row.thresholdKey !== column.id) {
            const content = document.createElement("span");
            content.className = "sensor-context-cell-text";
            content.textContent = FALLBACK_NA;
            td.append(content);
          } else {
            const thresholdValueText = formatRowValueByColumn(column.id, row);
            const hasThresholdValue = thresholdValueText !== FALLBACK_NA;
            if (!isDerivedThresholdRow && hasThresholdValue) {
              const enabled = isThresholdToggleEnabled(row.tagKey, column.id);
              const control = document.createElement("button");
              control.type = "button";
              control.className = "sensor-context-threshold-control";
              control.classList.toggle("is-enabled", enabled);
              control.textContent = thresholdValueText;
              control.title = `${enabled ? "Hide" : "Show"} ${resolveThresholdLabel(column.id)} threshold`;
              control.setAttribute(
                "aria-label",
                `${enabled ? "Hide" : "Show"} ${resolveThresholdLabel(column.id)} threshold`,
              );
              control.setAttribute("aria-pressed", enabled ? "true" : "false");
              control.addEventListener("click", () => {
                toggleThresholdLine(row.tagKey, column.id, { keepRowVisible: true });
              });
              td.append(control);
            } else {
              const content = document.createElement("span");
              content.className = "sensor-context-cell-text";
              content.textContent = hasThresholdValue ? thresholdValueText : FALLBACK_NA;
              if (content.textContent !== FALLBACK_NA) {
                content.title = content.textContent;
              }
              td.append(content);
            }
          }
        } else {
          const text = formatRowValueByColumn(column.id, row);
          const content = document.createElement("span");
          content.className = "sensor-context-cell-text";
          content.textContent = text;
          if (text !== FALLBACK_NA) {
            content.title = text;
          }
          td.append(content);
        }

        tr.append(td);
      });
      const fillerCell = document.createElement("td");
      fillerCell.className = "sensor-context-filler-cell";
      tr.append(fillerCell);
      tbody.append(tr);
    });

    table.append(thead, tbody);
    wrapper.append(table);
    footer.append(wrapper);
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
    lastBodyWidth = measureBodyWidth();
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
      thresholdLines: buildThresholdOverlayDescriptors(),
      cursorState: {
        hoverTimestamp: interactionState.hoverTimestamp,
        pinnedCursors: interactionState.pinnedCursors,
      },
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
      onHoverTimestampChange: (timestamp) => {
        interactionState.hoverTimestamp =
          typeof timestamp === "string" && timestamp ? timestamp : null;
        if (interactionState.hoverTimestamp) {
          syncBus?.setHoverTimestamp?.(chart.id, interactionState.hoverTimestamp);
        } else {
          syncBus?.clearHoverTimestamp?.(chart.id);
        }
        persistRuntimeCache();
      },
      onPinnedCursorsChange: (pins) => {
        const normalized = (Array.isArray(pins) ? pins : [])
          .map((pin) => ({
            id: String(pin?.id || ""),
            timestamp: String(pin?.timestamp || ""),
          }))
          .filter((pin) => pin.id && pin.timestamp)
          .slice(0, 5);
        const canonical = syncBus?.setPinnedCursors?.(chart.id, normalized) || normalized;
        interactionState.pinnedCursors = canonical;
        persistRuntimeCache();
        return canonical;
      },
    });
    if (interactionState.previewXDomain) {
      chartRenderHandle.setPreviewXDomain?.(interactionState.previewXDomain);
    }
    if (interactionState.hoverTimestamp) {
      chartRenderHandle.setHoverTimestamp?.(interactionState.hoverTimestamp);
    }
    if (interactionState.pinnedCursors.length > 0) {
      chartRenderHandle.setPinnedCursors?.(interactionState.pinnedCursors);
    }
    renderYAutoScaleButton();
    ensureLoadingOverlay();
    scheduleChartResize();
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
    renderSensorContextTable();
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
    renderSensorContextTable();
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
        label: "Reset Column Widths",
        onClick: () => actions.resetGlobalTableColumnWidths?.(),
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
    syncRenderSignatures();
    syncThresholdStatesFromChart(chart);
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
    clearModeForGuardrails();

    if (!hasQuery) {
      loadState = "idle";
      currentSeries = [];
      sensorContextRows = [];
      hiddenSeries.clear();
      clearXInteractionState();
      interactionState.currentYDomain = null;
      lastQueryContextKey = queryContextKey;
      lastTagSetKey = tagSetKey;
      drawChart();
      renderSensorContextTable();
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

        try {
          sensorContextRows = await loadSensorContextForTags(tags, page);
          if (loadToken !== latestLoadToken) return;
        } catch (contextError) {
          sensorContextRows = [];
          setInlineNotice(normalizeMessage(contextError));
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
        sensorContextRows = [];
      }

      lastQueryContextKey = queryContextKey;
      lastTagSetKey = tagSetKey;
      loadState = currentSeries.length > 0 ? "has_data" : "no_data";
      if (queryContextChanged) {
        clearXInteractionState();
      }
      if (currentSeries.length > 0) {
        const hasExplicitThresholdState =
          chart && typeof chart === "object" && Object.prototype.hasOwnProperty.call(chart, "thresholdToggleState");
        const hasExplicitThresholdRowState =
          chart && typeof chart === "object" && Object.prototype.hasOwnProperty.call(chart, "thresholdRowState");
        if (!hasExplicitThresholdState && tags.length === 1) {
          const autoThresholdToggles = buildAutoEnabledThresholdTogglesForSingleTag(tags, sensorContextRows);
          if (autoThresholdToggles) {
            thresholdToggleState = autoThresholdToggles;
            chart.thresholdToggleState = { ...autoThresholdToggles };
            if (!hasExplicitThresholdRowState) {
              thresholdRowState = { ...autoThresholdToggles };
              chart.thresholdRowState = { ...thresholdRowState };
            }
            persistChartPatch({
              thresholdToggleState: { ...autoThresholdToggles },
              thresholdRowState: { ...thresholdRowState },
            });
          }
        }
        interactionState.currentYDomain =
          chart.normalizationEnabled === true ? [0, 1] : null;
      } else {
        interactionState.currentYDomain = null;
      }
      clearModeForGuardrails();
      drawChart();
      renderSensorContextTable();
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
        sensorContextRows = [];
        interactionState.currentYDomain = null;
        drawChart();
        renderSensorContextTable();
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

  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(() => {
      scheduleChartResize();
    });
    resizeObserver.observe(body);
  }

  card.append(header, body, inlineNotice, footer);
  drawChart();
  renderSensorContextTable();
  persistRuntimeCache();
  queueMicrotask(() => {
    void load({ forceRefresh });
  });

  card.__chartCardApi = {
    update(nextChart, nextPage, nextTableColumns = null) {
      const nextDataSignature = buildChartDataSignature(nextChart, nextPage);
      const nextRenderSignature = buildChartRenderSignature(nextChart, nextPage);
      const nextTableColumnsSignature = buildTableColumnsSignature(nextTableColumns);
      const shouldReloadData = nextDataSignature !== lastChartDataSignature;
      const shouldRedrawChart = nextRenderSignature !== lastChartRenderSignature;
      const shouldRenderTable =
        shouldRedrawChart || nextTableColumnsSignature !== lastTableColumnsSignature;

      chart = nextChart;
      page = nextPage;
      tableColumns = nextTableColumns;
      syncThresholdStatesFromChart(chart);
      lastChartDataSignature = nextDataSignature;
      lastChartRenderSignature = nextRenderSignature;
      lastTableColumnsSignature = nextTableColumnsSignature;
      title.textContent = chart.title || "Untitled chart";
      titleInput.value = title.textContent;
      const guardrailChanged = clearModeForGuardrails();
      renderActionMenu();
      if (shouldReloadData) {
        if (guardrailChanged) {
          drawChart();
          renderSensorContextTable();
          persistRuntimeCache();
        }
        void load();
        return;
      }
      if (shouldRedrawChart || guardrailChanged) {
        drawChart();
      }
      if (shouldRenderTable) {
        renderSensorContextTable();
      }
      persistRuntimeCache();
    },
    resize() {
      scheduleChartResize(true);
    },
    destroy() {
      unregisterSync();
      resizeObserver?.disconnect?.();
      resizeObserver = null;
      if (pendingResizeFrame) {
        window.cancelAnimationFrame(pendingResizeFrame);
        pendingResizeFrame = null;
      }
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
