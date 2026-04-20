const config = window.__LIGHTHOUSE_CONFIG__ || {};
const API_BASE = config.apiBaseUrl || "http://127.0.0.1:8001/api/v1/charts";
const TIMESERIES_CACHE_TTL_MS = 60 * 1000;
const TIMESERIES_CACHE_MAX_ENTRIES = 100;
const timeseriesCache = new Map();
const inflightTimeseriesRequests = new Map();

export class ApiClientError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

function clonePayload(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    if (response.ok) {
      throw new ApiClientError(
        `Invalid API response from ${API_BASE}${path}. Check API base URL/config.`,
        response.status,
        { raw: raw?.slice(0, 240) || "" },
      );
    }
  }

  if (!response.ok) {
    const message = body?.detail || `Request failed with status ${response.status}`;
    throw new ApiClientError(message, response.status, body);
  }

  return body;
}

function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== "") search.append(key, item);
      });
      return;
    }
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

function normalizeCacheValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCacheValue(item));
  }
  if (value && typeof value === "object") {
    const normalized = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        normalized[key] = normalizeCacheValue(value[key]);
      });
    return normalized;
  }
  return value;
}

function buildTimeSeriesCacheKey(endpoint, params) {
  return `${endpoint}|${JSON.stringify(normalizeCacheValue(params || {}))}`;
}

function getCachedTimeSeries(cacheKey) {
  const cached = timeseriesCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > TIMESERIES_CACHE_TTL_MS) {
    timeseriesCache.delete(cacheKey);
    return null;
  }
  return clonePayload(cached.payload);
}

function setCachedTimeSeries(cacheKey, payload) {
  timeseriesCache.set(cacheKey, {
    createdAt: Date.now(),
    payload: clonePayload(payload),
  });
  if (timeseriesCache.size > TIMESERIES_CACHE_MAX_ENTRIES) {
    const oldestKey = timeseriesCache.keys().next().value;
    if (oldestKey) {
      timeseriesCache.delete(oldestKey);
    }
  }
}

async function withInFlightDedupe(cacheKey, fetcher) {
  if (inflightTimeseriesRequests.has(cacheKey)) {
    const shared = await inflightTimeseriesRequests.get(cacheKey);
    return clonePayload(shared);
  }

  const pending = (async () => {
    const response = await fetcher();
    return clonePayload(response);
  })();

  inflightTimeseriesRequests.set(cacheKey, pending);
  try {
    const result = await pending;
    return clonePayload(result);
  } finally {
    inflightTimeseriesRequests.delete(cacheKey);
  }
}

export async function getPages() {
  return request("/pages");
}

export async function searchAssets(query, limit = 50) {
  const cleaned = String(query || "").trim();
  return request(`/asset-search${toQuery({ query: cleaned, limit })}`);
}

export async function getEquipmentTree({ ancestor_id, lean = true } = {}) {
  return request(`/equipment-tree${toQuery({ ancestor_id, lean: lean ? "true" : "false" })}`);
}

export async function getEquipmentSensors({ item_id, asset_name }) {
  return request(
    `/equipment-sensors${toQuery({
      item_id,
      asset_name,
    })}`,
  );
}

export async function getIntelEvents({
  item_id = null,
  include_descendants = true,
  status = null,
} = {}) {
  return request(
    `/intel-events${toQuery({
      item_id,
      include_descendants: include_descendants ? "true" : "false",
      status,
    })}`,
  );
}

export async function getItemAttributes({ item_id, asset_name, timeseries_only = true }) {
  return request(
    `/item-attributes${toQuery({
      item_id,
      asset_name,
      timeseries_only: timeseries_only ? "true" : "false",
    })}`,
  );
}

function normalizeSeries(rawSeries = []) {
  return rawSeries.map((line, index) => ({
    name: line.name || `Series ${index + 1}`,
    color: line.color || ["#2a6f97", "#188b84", "#ce7c3a", "#b84b43"][index % 4],
    points: (line.points || []).map((point) => ({
      timestamp: point.timestamp,
      value: Number(point.value),
    })),
  }));
}

export async function getTimeSeries(params) {
  const forceRefresh = Boolean(params?.force_refresh || params?.forceRefresh);
  const safeParams = { ...(params || {}) };
  delete safeParams.force_refresh;
  delete safeParams.forceRefresh;

  const hasAttributeTarget =
    (safeParams?.item_id || safeParams?.asset_name) &&
    (safeParams?.attribute_id || safeParams?.attribute_name);
  const endpoint = hasAttributeTarget ? "/timeseries-from-attribute" : "/timeseries";
  const cacheKey = buildTimeSeriesCacheKey(endpoint, safeParams);

  if (forceRefresh) {
    timeseriesCache.delete(cacheKey);
  } else {
    const cached = getCachedTimeSeries(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const normalizedPayload = await withInFlightDedupe(cacheKey, async () => {
    const query = toQuery(safeParams);
    const payload = await request(`${endpoint}${query}`);
    const normalized = {
      ...payload,
      series: normalizeSeries(payload.series || []),
    };
    setCachedTimeSeries(cacheKey, normalized);
    return normalized;
  });
  return normalizedPayload;
}

export async function getTimeSeriesBatch(params) {
  const forceRefresh = Boolean(params?.force_refresh || params?.forceRefresh);
  const tags = Array.isArray(params?.tags) ? params.tags : [];
  const safeParams = {
    start_date: params?.start_date,
    end_date: params?.end_date,
    window: params?.window,
    tags: JSON.stringify(tags),
  };

  const endpoint = "/timeseries-batch";
  const cacheKey = buildTimeSeriesCacheKey(endpoint, safeParams);

  if (forceRefresh) {
    timeseriesCache.delete(cacheKey);
  } else {
    const cached = getCachedTimeSeries(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const normalizedPayload = await withInFlightDedupe(cacheKey, async () => {
    const payload = await request(`${endpoint}${toQuery(safeParams)}`);
    const normalizedTags = Array.isArray(payload?.tags)
      ? payload.tags.map((tag) => ({
          ...tag,
          series: normalizeSeries(tag?.series || []),
        }))
      : [];
    const normalized = {
      ...payload,
      tags: normalizedTags,
    };
    setCachedTimeSeries(cacheKey, normalized);
    return normalized;
  });
  return normalizedPayload;
}

export async function savePage(page) {
  return Promise.resolve({ saved: true, page });
}
