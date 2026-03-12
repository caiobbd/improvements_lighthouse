// ============================================================
// LIGHTHOUSE — Mock Data for MVP
// ============================================================

const MOCK = {};

// --- Date helpers ---
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
}

function hoursAgo(n) {
  return new Date(Date.now() - n * 3600000);
}

function formatTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// --- 7-Day Labels ---
MOCK.barLabels = Array.from({length: 7}, (_, i) => formatDate(daysAgo(6 - i)));

// --- Bar Chart Data (7-day daily accumulated) ---
MOCK.oil = {
  production: [11200, 12800, 13500, 11900, 14200, 12600, 13100],
  loss:       [  420,   380,   510,   650,   290,   470,   350],
};

MOCK.gas = {
  production: [0.21, 0.24, 0.23, 0.19, 0.26, 0.22, 0.25],
  loss:       [0.008, 0.005, 0.012, 0.015, 0.004, 0.009, 0.006],
};

MOCK.water = {
  overboard: [4200, 3800, 5100, 4600, 3900, 4800, 4300],
  injection: [5800, 6200, 5500, 6100, 5900, 6400, 5700],
};

MOCK.flare = {
  total: [2800, 2200, 3100, 2500, 1900, 2600, 3400],
  fpso:  [1500, 1200, 1800, 1400, 1100, 1500, 1900],
};

// --- Trend Data (48 hourly points) ---
function generateTrend(base, variance, points) {
  const data = [];
  let val = base;
  for (let i = 0; i < points; i++) {
    val = base + (Math.random() - 0.5) * variance * 2;
    val = Math.max(base - variance, Math.min(base + variance, val));
    data.push(Math.round(val * 100) / 100);
  }
  return data;
}

MOCK.trendLabels = Array.from({length: 48}, (_, i) => {
  const d = hoursAgo(47 - i);
  return formatTime(d);
});

MOCK.oilTrend = {
  production: generateTrend(12500, 1500, 48),
  plan: Array(48).fill(13000),
};

MOCK.gasTrend = {
  production: generateTrend(0.22, 0.03, 48),
  plan: Array(48).fill(0.25),
};

MOCK.waterTrend = {
  overboard: generateTrend(4500, 600, 48),
  injection: generateTrend(5800, 500, 48),
  planWI: Array(48).fill(6000),
};

MOCK.flareTrend = {
  flare: generateTrend(2500, 700, 48),
};

// --- Active Alarms (from real MVBAC data) ---
MOCK.alarms = [
  {
    severity: 'critical',
    severityBars: 4,
    asset: 'MVBAC-23KA401',
    assetDesc: '1ST STAGE MP',
    model: 'FM - Bearing Overheating',
    start: '03/05/2026 12:47',
    duration: '4d 21h 06m',
    occurrences: 7,
    group: 'production-gas',
  },
  {
    severity: 'critical',
    severityBars: 4,
    asset: 'MVBAC-26KA301',
    assetDesc: '1ST STAGE HP',
    model: 'FC - Lube Oil High Temperature',
    start: '03/06/2026 13:01',
    duration: '4d 8h 21m',
    occurrences: 7,
    group: 'production-gas',
  },
  {
    severity: 'critical',
    severityBars: 4,
    asset: 'MVBAC-23KA401',
    assetDesc: '1ST STAGE MP',
    model: 'FM - Lube Oil Internal Leakage Prealarm',
    start: '03/07/2026 02:17',
    duration: '1d 0h 47m',
    occurrences: 3,
    group: 'production-gas',
  },
  {
    severity: 'high',
    severityBars: 3,
    asset: 'MVBAC-43KC107B',
    assetDesc: 'VRU',
    model: 'FC - Long Period Without Preservation',
    start: '03/04/2026 21:25',
    duration: '6d 20h 00m',
    occurrences: 115,
    group: 'production-gas',
  },
  {
    severity: 'high',
    severityBars: 3,
    asset: 'MVBAC-23KA401',
    assetDesc: '1ST STAGE MP',
    model: 'FC - Low Primary Seal Gas Injection Pressure',
    start: '03/06/2026 17:22',
    duration: '4d 11h 52m',
    occurrences: 6,
    group: 'production-gas',
  },
  {
    severity: 'high',
    severityBars: 3,
    asset: 'MVBAC-50PS101A',
    assetDesc: 'SWLP WATER TREATMENT',
    model: 'FC - Deviation of Expected x Real Efficiency',
    start: '03/11/2026 23:16',
    duration: '0d 7h 2m',
    occurrences: null,
    group: 'production-liquid',
  },
];

// --- Mock Cases (for Production Gas detail) ---
MOCK.cases = [
  {
    severity: 4,
    created: '03/06/2026',
    name: 'Bearing temperature high on 23KA401',
    stage: 'Investigation',
    actionsSt: 'Pending',
    lastEdition: '03/10/2026',
  },
  {
    severity: 4,
    created: '03/06/2026',
    name: 'Lube oil temp high 26KA301',
    stage: 'Feedback',
    actionsSt: 'None',
    lastEdition: '03/08/2026',
  },
  {
    severity: 3,
    created: '03/07/2026',
    name: 'Seal gas pressure low 23KA401',
    stage: 'Open',
    actionsSt: 'Pending',
    lastEdition: '03/09/2026',
  },
];
