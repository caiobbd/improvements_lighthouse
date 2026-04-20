// ============================================================
// LIGHTHOUSE - Mock Data for MVP
// ============================================================

const MOCK = {};

MOCK.limits = {
  accumulatedPoints: 7,
  trendPoints: 48,
};

// --- Date helpers ---
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3600000);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatDate(date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(dateIso) {
  const date = new Date(dateIso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeLength(series, expectedLength, fallbackValue = 0) {
  const normalized = Array.isArray(series) ? [...series] : [];
  if (normalized.length >= expectedLength) {
    return normalized.slice(0, expectedLength);
  }
  while (normalized.length < expectedLength) {
    normalized.push(fallbackValue);
  }
  return normalized;
}

function smoothTrend(base, amplitude, points, phase, drift = 0) {
  const out = [];
  for (let i = 0; i < points; i += 1) {
    const waveA = Math.sin((i + phase) / 4.5) * amplitude;
    const waveB = Math.cos((i + phase) / 9.0) * amplitude * 0.35;
    const trend = i * drift;
    const value = base + waveA + waveB + trend;
    out.push(Math.round(value * 100) / 100);
  }
  return out;
}

// --- 7-day labels ---
MOCK.barLabels = Array.from({ length: MOCK.limits.accumulatedPoints }, (_, index) =>
  formatDate(daysAgo(MOCK.limits.accumulatedPoints - 1 - index)),
);

// --- Daily accumulated data ---
MOCK.oil = {
  production: normalizeLength([11200, 12800, 13500, 11900, 14200, 12600, 13100], MOCK.limits.accumulatedPoints, 0),
  loss: normalizeLength([420, 380, 510, 650, 290, 470, 350], MOCK.limits.accumulatedPoints, 0),
};

MOCK.gas = {
  production: normalizeLength([0.21, 0.24, 0.23, 0.19, 0.26, 0.22, 0.25], MOCK.limits.accumulatedPoints, 0),
  loss: normalizeLength([0.008, 0.005, 0.012, 0.015, 0.004, 0.009, 0.006], MOCK.limits.accumulatedPoints, 0),
};

MOCK.water = {
  overboard: normalizeLength([4200, 3800, 5100, 4600, 3900, 4800, 4300], MOCK.limits.accumulatedPoints, 0),
  injection: normalizeLength([5800, 6200, 5500, 6100, 5900, 6400, 5700], MOCK.limits.accumulatedPoints, 0),
};

MOCK.flare = {
  total: normalizeLength([2800, 2200, 3100, 2500, 1900, 2600, 3400], MOCK.limits.accumulatedPoints, 0),
  fpso: normalizeLength([1500, 1200, 1800, 1400, 1100, 1500, 1900], MOCK.limits.accumulatedPoints, 0),
};

// --- 48-hour trend labels and data ---
MOCK.trendLabels = Array.from({ length: MOCK.limits.trendPoints }, (_, index) =>
  formatTime(hoursAgo(MOCK.limits.trendPoints - 1 - index)),
);

MOCK.oilTrend = {
  production: smoothTrend(12500, 1100, MOCK.limits.trendPoints, 2, 1.4),
  plan: Array(MOCK.limits.trendPoints).fill(13000),
};

MOCK.gasTrend = {
  production: smoothTrend(0.22, 0.02, MOCK.limits.trendPoints, 6, 0.0002),
  plan: Array(MOCK.limits.trendPoints).fill(0.25),
};

MOCK.waterTrend = {
  overboard: smoothTrend(4500, 420, MOCK.limits.trendPoints, 3, 0.5),
  injection: smoothTrend(5800, 380, MOCK.limits.trendPoints, 7, 0.35),
  planWI: Array(MOCK.limits.trendPoints).fill(6000),
};

MOCK.flareTrend = {
  flare: smoothTrend(2500, 520, MOCK.limits.trendPoints, 5, -0.3),
};

// --- Active alarms ---
MOCK.alarms = [
  {
    id: "a-23ka401-bearing",
    severity: "critical",
    severityBars: 4,
    asset: "MVBAC-23KA401",
    assetDesc: "1ST STAGE MP",
    model: "FM - Bearing Overheating",
    startIso: "2026-03-05T12:47:00Z",
    start: formatDateTime("2026-03-05T12:47:00Z"),
    duration: "4d 21h 06m",
    occurrences: 7,
    group: "production-gas",
  },
  {
    id: "a-26ka301-lube-temp",
    severity: "critical",
    severityBars: 4,
    asset: "MVBAC-26KA301",
    assetDesc: "1ST STAGE HP",
    model: "FC - Lube Oil High Temperature",
    startIso: "2026-03-06T13:01:00Z",
    start: formatDateTime("2026-03-06T13:01:00Z"),
    duration: "4d 8h 21m",
    occurrences: 7,
    group: "production-gas",
  },
  {
    id: "a-23ka401-leakage",
    severity: "critical",
    severityBars: 4,
    asset: "MVBAC-23KA401",
    assetDesc: "1ST STAGE MP",
    model: "FM - Lube Oil Internal Leakage Prealarm",
    startIso: "2026-03-07T02:17:00Z",
    start: formatDateTime("2026-03-07T02:17:00Z"),
    duration: "1d 0h 47m",
    occurrences: 3,
    group: "production-gas",
  },
  {
    id: "a-43kc107b-preservation",
    severity: "high",
    severityBars: 3,
    asset: "MVBAC-43KC107B",
    assetDesc: "VRU",
    model: "FC - Long Period Without Preservation",
    startIso: "2026-03-04T21:25:00Z",
    start: formatDateTime("2026-03-04T21:25:00Z"),
    duration: "6d 20h 00m",
    occurrences: 115,
    group: "production-gas",
  },
  {
    id: "a-23ka401-seal-gas",
    severity: "high",
    severityBars: 3,
    asset: "MVBAC-23KA401",
    assetDesc: "1ST STAGE MP",
    model: "FC - Low Primary Seal Gas Injection Pressure",
    startIso: "2026-03-06T17:22:00Z",
    start: formatDateTime("2026-03-06T17:22:00Z"),
    duration: "4d 11h 52m",
    occurrences: 6,
    group: "production-gas",
  },
  {
    id: "a-50ps101a-efficiency",
    severity: "high",
    severityBars: 3,
    asset: "MVBAC-50PS101A",
    assetDesc: "SWLP WATER TREATMENT",
    model: "FC - Deviation of Expected x Real Efficiency",
    startIso: "2026-03-11T23:16:00Z",
    start: formatDateTime("2026-03-11T23:16:00Z"),
    duration: "0d 7h 2m",
    occurrences: null,
    group: "production-liquid",
  },
];

// --- Cases for Production Gas detail ---
MOCK.cases = [
  {
    severity: 4,
    created: "03/06/2026",
    name: "Bearing temperature high on 23KA401",
    stage: "Investigation",
    actionsSt: "Pending",
    lastEdition: "03/10/2026",
  },
  {
    severity: 4,
    created: "03/06/2026",
    name: "Lube oil temp high 26KA301",
    stage: "Feedback",
    actionsSt: "None",
    lastEdition: "03/08/2026",
  },
  {
    severity: 3,
    created: "03/07/2026",
    name: "Seal gas pressure low 23KA401",
    stage: "Open",
    actionsSt: "Pending",
    lastEdition: "03/09/2026",
  },
];
