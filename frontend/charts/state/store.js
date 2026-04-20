const STORAGE_KEY = "lighthouse.charts.workspace.v1";
const MAX_CHARTS_PER_PAGE = 30;
const NEW_PAGE_PREFIX = "New Page";
const DEFAULT_DATE_PRESET = "30d";
const DEFAULT_FREQUENCY_MODE = "auto";
const DEFAULT_FREQUENCY_WINDOW = "6h";
const DEFAULT_PAGE_TYPE = "standard";
const MIN_GRID_COLUMNS = 1;
const MAX_GRID_COLUMNS = 2;

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function normalizeTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString();
}

function clampGridColumns(value) {
  const parsed = Number(value || MAX_GRID_COLUMNS);
  return Math.max(MIN_GRID_COLUMNS, Math.min(MAX_GRID_COLUMNS, parsed));
}

function normalizeFrequencyMode(value) {
  return String(value || "").toLowerCase() === "manual" ? "manual" : "auto";
}

function normalizeFrequencyWindow(value) {
  const normalized = String(value || "").toLowerCase();
  if (["15m", "1h", "6h", "1d"].includes(normalized)) return normalized;
  return DEFAULT_FREQUENCY_WINDOW;
}

function normalizePageType(value) {
  return String(value || "").toLowerCase() === "alarm" ? "alarm" : DEFAULT_PAGE_TYPE;
}

function normalizeAlarmMeta(value) {
  if (!value || typeof value !== "object") return null;
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const eventTimeseriesAttributes = Array.isArray(value.eventTimeseriesAttributes || value.event_timeseries_attributes)
    ? (value.eventTimeseriesAttributes || value.event_timeseries_attributes)
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const matchedAttributes = Array.isArray(value.matchedAttributes || value.matched_attributes)
    ? (value.matchedAttributes || value.matched_attributes)
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];
  const unmatchedAttributes = Array.isArray(value.unmatchedAttributes || value.unmatched_attributes)
    ? (value.unmatchedAttributes || value.unmatched_attributes)
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
    : [];

  return {
    eventId: String(value.eventId || value.event_id || "").trim(),
    itemId: String(value.itemId || value.item_id || "").trim(),
    assetName: String(value.assetName || value.asset_name || "").trim(),
    name: String(value.name || "").trim(),
    eventType: String(value.eventType || value.event_type || "").trim(),
    status: String(value.status || "").trim(),
    severity: String(value.severity || "").trim(),
    startDate: normalizeTimestamp(value.startDate || value.start_date),
    endDate: normalizeTimestamp(value.endDate || value.end_date),
    trendDisplayStartDate: normalizeTimestamp(
      value.trendDisplayStartDate || value.trend_display_start_date,
    ),
    description: String(value.description || "").trim(),
    prognosis: String(value.prognosis || "").trim(),
    eventTimeseriesAttributes,
    matchedAttributes,
    unmatchedAttributes,
    spanStart: normalizeTimestamp(value.spanStart || value.span_start),
    spanEnd: normalizeTimestamp(value.spanEnd || value.span_end),
    windowStart: normalizeTimestamp(value.windowStart || value.window_start),
    windowEnd: normalizeTimestamp(value.windowEnd || value.window_end),
    warnings,
  };
}

function createDefaultChart(index = 1) {
  return {
    id: createId("chart"),
    title: `Chart ${index}`,
    assetName: "MV26 Main A",
    itemId: null,
    attributeId: null,
    attributeName: null,
    window: "6h",
    fromCategories: [],
    fromAttributes: [],
    selectedTags: [],
    normalizationEnabled: false,
    splitYAxisEnabled: false,
  };
}

function extractNewPageIndex(name) {
  const match = String(name || "")
    .trim()
    .match(/^new page\s+(\d+)$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function getNextNewPageIndex(pages) {
  const max = pages.reduce((highest, page) => {
    const value = extractNewPageIndex(page?.name);
    if (value == null) return highest;
    return Math.max(highest, value);
  }, 0);
  return max + 1;
}

function buildAutoPageName(pages) {
  return `${NEW_PAGE_PREFIX} ${getNextNewPageIndex(pages)}`;
}

function buildDuplicatePageName(baseName, pages) {
  const existingNames = new Set(pages.map((page) => page.name));
  let candidate = `${baseName} Copy`;
  let index = 2;

  while (existingNames.has(candidate)) {
    candidate = `${baseName} Copy ${index}`;
    index += 1;
  }

  return candidate;
}

function normalizeSelectedTag(tag) {
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

function normalizeChart(chart, index = 1) {
  return {
    ...createDefaultChart(index),
    ...chart,
    id: chart?.id || createId("chart"),
    title: chart?.title || `Chart ${index}`,
    assetName: chart?.assetName || chart?.asset_name || "",
    itemId: chart?.itemId || chart?.item_id || null,
    attributeId: chart?.attributeId || chart?.attribute_id || null,
    attributeName: chart?.attributeName || chart?.attribute_name || null,
    fromCategories: chart?.fromCategories || chart?.from_categories || [],
    fromAttributes: chart?.fromAttributes || chart?.from_attributes || [],
    normalizationEnabled:
      chart?.normalizationEnabled === true || chart?.normalization_enabled === true,
    splitYAxisEnabled: chart?.splitYAxisEnabled === true || chart?.split_y_axis_enabled === true,
    selectedTags: Array.isArray(chart?.selectedTags || chart?.selected_tags)
      ? (chart.selectedTags || chart.selected_tags).map(normalizeSelectedTag).filter(Boolean)
      : [],
  };
}

function createPage(name, options = {}) {
  const now = new Date().toISOString();
  return {
    id: createId("page"),
    name,
    isPreset: Boolean(options.isPreset),
    gridColumns: clampGridColumns(options.gridColumns || MAX_GRID_COLUMNS),
    datePreset: options.datePreset || DEFAULT_DATE_PRESET,
    frequencyMode: normalizeFrequencyMode(options.frequencyMode || DEFAULT_FREQUENCY_MODE),
    frequencyWindow: normalizeFrequencyWindow(options.frequencyWindow || DEFAULT_FREQUENCY_WINDOW),
    pageType: normalizePageType(options.pageType || options.page_type || DEFAULT_PAGE_TYPE),
    alarmMeta: normalizeAlarmMeta(options.alarmMeta || options.alarm_meta),
    startDate: normalizeDate(options.startDate),
    endDate: normalizeDate(options.endDate),
    charts: options.charts || [],
    pendingScrollChartId: options.pendingScrollChartId || null,
    dirty: Boolean(options.dirty),
    lastSavedAt: options.lastSavedAt || now,
    createdAt: options.createdAt || now,
  };
}

function normalizePage(page, index = 0, forcePreset = false) {
  const normalized = createPage(page?.name || `Page ${index + 1}`, {
    ...page,
    isPreset: forcePreset || Boolean(page?.isPreset || page?.is_preset),
    gridColumns: clampGridColumns(page?.gridColumns || page?.grid_columns || MAX_GRID_COLUMNS),
    datePreset: page?.datePreset || page?.date_preset || DEFAULT_DATE_PRESET,
    frequencyMode: normalizeFrequencyMode(page?.frequencyMode || page?.frequency_mode),
    frequencyWindow: normalizeFrequencyWindow(page?.frequencyWindow || page?.frequency_window),
    pageType: normalizePageType(page?.pageType || page?.page_type),
    alarmMeta: normalizeAlarmMeta(page?.alarmMeta || page?.alarm_meta),
    startDate: page?.startDate || page?.start_date || null,
    endDate: page?.endDate || page?.end_date || null,
    pendingScrollChartId: page?.pendingScrollChartId || page?.pending_scroll_chart_id || null,
    charts: Array.isArray(page?.charts) ? page.charts.map((chart, chartIndex) => normalizeChart(chart, chartIndex + 1)) : [],
  });
  normalized.id = page?.id || createId("page");
  return normalized;
}

function createDefaultState() {
  const preset = createPage("Production Overview", {
    isPreset: true,
    gridColumns: 2,
    datePreset: DEFAULT_DATE_PRESET,
    frequencyMode: DEFAULT_FREQUENCY_MODE,
    frequencyWindow: DEFAULT_FREQUENCY_WINDOW,
    charts: [
      {
        ...createDefaultChart(1),
        title: "Oil Rate",
        fromCategories: ["Process"],
        fromAttributes: ["Oil Rate"],
      },
      {
        ...createDefaultChart(2),
        title: "Temperature",
        fromCategories: ["Temperature"],
      },
    ],
    dirty: false,
  });

  const custom = createPage(`${NEW_PAGE_PREFIX} 1`, {
    gridColumns: 2,
    datePreset: DEFAULT_DATE_PRESET,
    frequencyMode: DEFAULT_FREQUENCY_MODE,
    frequencyWindow: DEFAULT_FREQUENCY_WINDOW,
    charts: [],
    dirty: false,
  });

  return {
    pages: [preset, custom],
    activePageId: preset.id,
    version: 1,
  };
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.pages) || parsed.pages.length === 0) {
      return createDefaultState();
    }

    return {
      pages: parsed.pages.map((page, index) => normalizePage(page, index)),
      activePageId: parsed.activePageId,
      version: 1,
    };
  } catch {
    return createDefaultState();
  }
}

let state = loadState();
const listeners = new Set();

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActivePageFrom(draft) {
  return draft.pages.find((page) => page.id === draft.activePageId) || draft.pages[0];
}

function notify() {
  const snapshot = clone(state);
  listeners.forEach((listener) => listener(snapshot));
}

function mutate(mutator, options = {}) {
  const { notifyListeners = true } = options;
  const draft = clone(state);
  mutator(draft);

  if (!draft.activePageId && draft.pages.length > 0) {
    draft.activePageId = draft.pages[0].id;
  }

  state = draft;
  persist();
  if (notifyListeners) {
    notify();
  }
}

function markDirty(page) {
  page.dirty = true;
}

function countAvailableChartSlots(page) {
  return Math.max(0, MAX_CHARTS_PER_PAGE - page.charts.length);
}

export const store = {
  getState() {
    return clone(state);
  },

  subscribe(listener) {
    listeners.add(listener);
    listener(this.getState());
    return () => listeners.delete(listener);
  },

  getActivePage(snapshot = state) {
    return getActivePageFrom(snapshot);
  },

  hasDirtyPages(snapshot = state) {
    return snapshot.pages.some((page) => page.dirty);
  },

  addPage(name) {
    mutate((draft) => {
      const pageName = name?.trim() || buildAutoPageName(draft.pages);
      const page = createPage(pageName, { charts: [] });
      draft.pages.push(page);
      draft.activePageId = page.id;
    });
  },

  addPageWithConfig(config = {}) {
    let createdPageId = null;
    mutate((draft) => {
      const pageName = String(config?.name || "").trim() || buildAutoPageName(draft.pages);
      const page = createPage(pageName, {
        gridColumns: config?.gridColumns,
        datePreset: config?.datePreset,
        frequencyMode: config?.frequencyMode,
        frequencyWindow: config?.frequencyWindow,
        startDate: config?.startDate,
        endDate: config?.endDate,
        pageType: config?.pageType,
        alarmMeta: config?.alarmMeta,
        charts: Array.isArray(config?.charts)
          ? config.charts.map((chart, chartIndex) => normalizeChart(chart, chartIndex + 1))
          : [],
        dirty: config?.dirty !== false,
      });
      draft.pages.push(page);
      draft.activePageId = page.id;
      createdPageId = page.id;
    });
    return createdPageId;
  },

  renamePage(pageId, newName) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      page.name = newName.trim() || page.name;
      markDirty(page);
    });
  },

  duplicatePage(pageId) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      const duplicate = createPage(buildDuplicatePageName(page.name, draft.pages), {
        gridColumns: page.gridColumns,
        datePreset: page.datePreset,
        frequencyMode: page.frequencyMode,
        frequencyWindow: page.frequencyWindow,
        startDate: page.startDate,
        endDate: page.endDate,
        pageType: page.pageType,
        alarmMeta: clone(page.alarmMeta),
        charts: clone(page.charts).map((chart) => ({ ...chart, id: createId("chart") })),
      });
      draft.pages.push(duplicate);
      draft.activePageId = duplicate.id;
    });
  },

  deletePage(pageId) {
    mutate((draft) => {
      if (draft.pages.length <= 1) return;
      const index = draft.pages.findIndex((item) => item.id === pageId);
      if (index < 0) return;
      draft.pages.splice(index, 1);
      if (draft.activePageId === pageId) {
        const fallback = draft.pages[Math.max(0, index - 1)] || draft.pages[0];
        draft.activePageId = fallback.id;
      }
    });
  },

  savePage(pageId) {
    mutate((draft) => {
      const active = draft.pages.find((item) => item.id === (pageId || draft.activePageId));
      if (!active) return;
      active.dirty = false;
      active.lastSavedAt = new Date().toISOString();
    });
  },

  setActivePage(pageId) {
    mutate((draft) => {
      const found = draft.pages.some((item) => item.id === pageId);
      if (found) draft.activePageId = pageId;
    });
  },

  setGridColumns(pageId, columns) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      page.gridColumns = clampGridColumns(columns);
      markDirty(page);
    });
  },

  setDatePreset(pageId, preset) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      page.datePreset = preset;
      if (preset !== "custom") {
        page.startDate = null;
        page.endDate = null;
      }
      markDirty(page);
    });
  },

  setDateRange(pageId, startDate, endDate) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      page.datePreset = "custom";
      page.startDate = normalizeDate(startDate);
      page.endDate = normalizeDate(endDate);
      markDirty(page);
    });
  },

  setFrequency(pageId, mode, window = null) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      const normalizedMode = String(mode || "").toLowerCase() === "manual" ? "manual" : "auto";
      const normalizedWindow = normalizeFrequencyWindow(
        window || page.frequencyWindow || DEFAULT_FREQUENCY_WINDOW,
      );
      page.frequencyMode = normalizedMode;
      page.frequencyWindow = normalizedWindow;
      markDirty(page);
    });
  },

  addChart(pageId, initialChart = null) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page || page.charts.length >= MAX_CHARTS_PER_PAGE) return;

      const chart = createDefaultChart(page.charts.length + 1);
      if (initialChart && typeof initialChart === "object") {
        Object.assign(chart, clone(initialChart));
      }

      page.charts.push(chart);
      page.pendingScrollChartId = chart.id;
      markDirty(page);
    });
  },

  addCharts(pageId, initialCharts = []) {
    let result = { requested: 0, added: 0, limitReached: false };
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      const entries = Array.isArray(initialCharts) ? initialCharts : [];
      result.requested = entries.length;
      if (entries.length === 0) return;

      const availableSlots = countAvailableChartSlots(page);
      const toAdd = entries.slice(0, availableSlots);
      toAdd.forEach((initialChart, index) => {
        const chart = createDefaultChart(page.charts.length + index + 1);
        if (initialChart && typeof initialChart === "object") {
          Object.assign(chart, clone(initialChart));
        }
        page.charts.push(chart);
      });

      result.added = toAdd.length;
      result.limitReached = entries.length > toAdd.length;
      if (toAdd.length > 0) {
        page.pendingScrollChartId = page.charts[page.charts.length - 1].id;
        markDirty(page);
      }
    });
    return result;
  },

  duplicateChart(pageId, chartId) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page || page.charts.length >= MAX_CHARTS_PER_PAGE) return;
      const original = page.charts.find((chart) => chart.id === chartId);
      if (!original) return;

      const duplicate = { ...clone(original), id: createId("chart"), title: `${original.title} Copy` };
      page.charts.push(duplicate);
      page.pendingScrollChartId = duplicate.id;
      markDirty(page);
    });
  },

  removeChart(pageId, chartId) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      const before = page.charts.length;
      page.charts = page.charts.filter((chart) => chart.id !== chartId);
      if (page.charts.length !== before) {
        if (page.pendingScrollChartId === chartId) {
          page.pendingScrollChartId = null;
        }
        markDirty(page);
      }
    });
  },

  updateChart(pageId, chartId, patch) {
    mutate((draft) => {
      const page = draft.pages.find((item) => item.id === pageId);
      if (!page) return;
      const chart = page.charts.find((item) => item.id === chartId);
      if (!chart) return;
      Object.assign(chart, patch);
      markDirty(page);
    });
  },

  updateChartSilent(pageId, chartId, patch) {
    mutate(
      (draft) => {
        const page = draft.pages.find((item) => item.id === pageId);
        if (!page) return;
        const chart = page.charts.find((item) => item.id === chartId);
        if (!chart) return;
        Object.assign(chart, patch);
        markDirty(page);
      },
      { notifyListeners: false },
    );
  },

  consumePendingChartScroll(pageId, chartId) {
    mutate(
      (draft) => {
        const page = draft.pages.find((item) => item.id === pageId);
        if (!page) return;
        if (page.pendingScrollChartId === chartId) {
          page.pendingScrollChartId = null;
        }
      },
      { notifyListeners: false },
    );
  },

  syncPresetPages(rawPages) {
    mutate((draft) => {
      const localByPageId = new Map(draft.pages.map((page) => [page.id, page]));
      const backendPresets = (rawPages || []).map((page, index) => normalizePage(page, index, true));
      if (!backendPresets.length) return;

      backendPresets.forEach((presetPage) => {
        const localPage = localByPageId.get(presetPage.id);
        if (!localPage) return;
        presetPage.gridColumns = localPage.gridColumns;
        presetPage.datePreset = localPage.datePreset || DEFAULT_DATE_PRESET;
        presetPage.startDate = localPage.startDate || null;
        presetPage.endDate = localPage.endDate || null;
      });

      const previousActivePageId = draft.activePageId;
      const customPages = draft.pages.filter((page) => !page.isPreset);
      draft.pages = [...backendPresets, ...customPages];

      const activeStillExists = draft.pages.some((page) => page.id === previousActivePageId);
      draft.activePageId = activeStillExists ? previousActivePageId : backendPresets[0].id;
    });
  },
};

export const storeConstants = {
  STORAGE_KEY,
  MAX_CHARTS_PER_PAGE,
  NEW_PAGE_PREFIX,
  DEFAULT_FREQUENCY_MODE,
  DEFAULT_FREQUENCY_WINDOW,
};
