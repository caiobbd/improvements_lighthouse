# MVBAC Overview Page — MVP Build Spec

> **Scope:** This spec defines what to build for the MVBAC ship-level Overview page. It replaces all current main-content elements (ship image, health ring, KPI strip, equipment table, models grid, right sidebar). The **left sidebar is kept** but simplified. This is the first page we will implement.
>
> **Second page:** [`spec_mvbac_production_gas.md`](file:///c:/Users/CaioBorges/_pgms/_repos/improvements_lighthouse/spec_mvbac_production_gas.md)

---

## 1. Page Identity

| Property | Value |
|---|---|
| **Ship** | MVBAC |
| **Page** | Overview (the default page when selecting MVBAC) |
| **Breadcrumb** | `MODEC do Brasil > MVBAC` |
| **Replaces** | Main content area: ship image, health ring, KPI strip, equipment table, models grid, right sidebar |

### Left Sidebar (Kept — Simplified)

The left sidebar is **kept** but shows only MVBAC and its sub-groups (no other ships visible):

```
MVBAC                          ← this page (Overview, highlighted)
├── MVBAC - PRODUCTION - GAS   ← drilldown page (click to navigate)
├── MVBAC - PRODUCTION - LIQUID
├── MVBAC - UTILITIES (FACILITIES)
└── MVBAC - UTILITIES (MARINE)
```

The sidebar occupies its existing width (~220px). The 3 content columns fill the remaining viewport width.

---

## 2. Layout

The main content area (to the right of the left sidebar) is divided into **3 equal-width columns** (33% / 33% / 33%).

No ship image. No health ring. No right sidebar accordion. No equipment table. Just sidebar + three clean columns.

```
+--------------------------------------------------------------------------+
|  HEADER BAR  (Logo, breadcrumb, nav tabs — unchanged)                    |
+--------+-------------------+-------------------+------------------------+
|        |                   |                   |                         |
| SIDE   |  COLUMN 1         |  COLUMN 2         |  COLUMN 3              |
| BAR    |  Daily Bars       |  48h Trends       |  Active Alarms         |
|        |  (7-day accum.)   |  (line charts)    |  (alarm cards)         |
| MVBAC  |                   |                   |                         |
|  Prod  |  +-----------+    |  +-----------+    |  +------------------+  |
|  Gas   |  | OIL       |    |  | OIL RATE  |    |  | ALARM CARD 1     |  |
|  Prod  |  | PROD.     |    |  | + Plan    |    |  | severity + info  |  |
|  Liq   |  +-----------+    |  +-----------+    |  +------------------+  |
|  Util  |  +-----------+    |  +-----------+    |  +------------------+  |
|  Fac   |  | GAS       |    |  | GAS RATE  |    |  | ALARM CARD 2     |  |
|  Util  |  | PROD.     |    |  | + Plan    |    |  +------------------+  |
|  Mar   |  +-----------+    |  +-----------+    |  +------------------+  |
|        |  +-----------+    |  +-----------+    |  | ALARM CARD 3     |  |
|        |  | WATER     |    |  | WATER     |    |  +------------------+  |
|        |  | PROD.     |    |  | RATE      |    |  +------------------+  |
|        |  +-----------+    |  +-----------+    |  | ALARM CARD 4     |  |
|        |  +-----------+    |  +-----------+    |  +------------------+  |
|        |  | FLARE     |    |  | FLARE     |    |  +------------------+  |
|        |  | GAS       |    |  | RATE      |    |  | ALARM CARD 5     |  |
|        |  +-----------+    |  +-----------+    |  +------------------+  |
|        |                   |                   |  +------------------+  |
|        |                   |                   |  | ALARM CARD 6     |  |
|        |                   |                   |  +------------------+  |
+--------+-------------------+-------------------+------------------------+
```

### Column Sizing

| Column | Width | Scroll |
|---|---|---|
| Column 1 (Bars) | 33.3% | Content fits vertically (4 charts stacked) |
| Column 2 (Trends) | 33.3% | Content fits vertically (4 charts stacked) |
| Column 3 (Alarms) | 33.3% | Vertical scroll if alarms exceed viewport height |

---

## 3. Column 1 — Daily Accumulated Bar Charts (7 days)

Four charts stacked vertically. Each shows **daily accumulated values** for the last 7 days.

### Chart Specifications

Each chart follows the same structure:

| Element | Description |
|---|---|
| **Title** | KPI name (top-left of chart), e.g., "Oil Production" |
| **Unit label** | Shown next to the title, e.g., "Sm3" |
| **Chart type** | Vertical bar chart |
| **X-axis** | Days (last 7 days), formatted as `dd.MM` (e.g., 06.03, 07.03, ..., 12.03) |
| **Y-axis** | Accumulated value, auto-scaled |
| **Legend** | Below or inside chart, showing series names and colors |
| **Background** | Transparent (matches page dark background `#1a1d23`) |
| **Grid lines** | Subtle horizontal lines (`#2a2d35`) |
| **Bar style** | Rounded corners (2px radius), slight gap between bars |

### Row-by-Row Definition

#### Row 1: Oil Production

| Property | Value |
|---|---|
| **Title** | Oil / Cond Production |
| **Unit** | Sm3 |
| **Series** | Production (green `#2ecc71`), Loss (red `#e74c3c`) |
| **Chart type** | Stacked bar (loss on top of production) |

#### Row 2: Gas Production

| Property | Value |
|---|---|
| **Title** | Gas Production |
| **Unit** | MSm3 |
| **Series** | Production (teal `#3db9cf`), Loss (red `#e74c3c`) |
| **Chart type** | Stacked bar |

#### Row 3: Water Production

| Property | Value |
|---|---|
| **Title** | Water Production |
| **Unit** | Sm3 |
| **Series** | Water Overboard (blue `#3498db`), Water Injection (green `#2ecc71`) |
| **Chart type** | Grouped bar (side by side) |

#### Row 4: Flare Gas

| Property | Value |
|---|---|
| **Title** | Flare Gas |
| **Unit** | Sm3 |
| **Series** | Total Flare Gas (orange `#e67e22`), FPSO Flare (yellow `#f1c40f`) |
| **Chart type** | Grouped bar |

---

## 4. Column 2 — 48-Hour Trend Line Charts

Four charts stacked vertically, each mirroring the corresponding row in Column 1. Shows **continuous rate** over the last 48 hours.

### Chart Specifications

| Element | Description |
|---|---|
| **Title** | KPI name + "Rate", e.g., "Oil / Cond Production Rate" |
| **Unit label** | Rate unit, e.g., "Sm3/d" |
| **Chart type** | Multi-line chart |
| **X-axis** | Last 48 hours, formatted as `HH:mm` with day boundaries marked |
| **Y-axis** | Rate value, auto-scaled |
| **Plan/Target line** | Dashed line (`#8a8f98`, dash pattern: `5,5`) where available |
| **Background** | Transparent (matches page dark background) |
| **Grid lines** | Subtle (`#2a2d35`) |
| **Line style** | 2px solid lines, no dots by default (dots on hover) |

### Row-by-Row Definition

#### Row 1: Oil Production Rate

| Property | Value |
|---|---|
| **Title** | Oil / Cond Production |
| **Unit** | Sm3/d |
| **Series** | Production (green `#2ecc71`, solid), Plan (gray `#8a8f98`, dashed) |

#### Row 2: Gas Production Rate

| Property | Value |
|---|---|
| **Title** | Gas Production |
| **Unit** | MSm3/d |
| **Series** | Production (teal `#3db9cf`, solid), Plan (gray, dashed) |

#### Row 3: Water Production Rate

| Property | Value |
|---|---|
| **Title** | Water Production |
| **Unit** | Sm3/d |
| **Series** | Water Overboard (blue `#3498db`, solid), WI (green `#2ecc71`, solid), Plan WI (gray, dashed) |

#### Row 4: Flare Gas Rate

| Property | Value |
|---|---|
| **Title** | Flare Gas |
| **Unit** | Sm3/d |
| **Series** | Flare Gas (orange `#e67e22`, solid) |

---

## 5. Column 3 — Active Alarm Cards

A single scrollable column containing **one card per active alarm**. Cards are stacked vertically with a gap between them. The column has a header at the top.

### Column Header

```
Active Alarms (6)
```

- Title: "Active Alarms" in white text (`#ffffff`), semibold
- Count: alarm count in parentheses, same style
- Positioned at the top of the column, sticky (stays visible when scrolling)

### Individual Alarm Card Design

Each alarm is a **card** — a dark panel with a colored left border indicating severity.

```
+---+----------------------------------------------------+
| S |  MVBAC-23KA401 (1ST STAGE MP)                      |
| E |  FM - Bearing Overheating                          |
| V |                                                    |
|   |  Started: 03/05/2026 12:47    Duration: 4d 21h     |
|   |  Occurrences: 7                            [→]     |
+---+----------------------------------------------------+
```

#### Card Structure

| Element | Description |
|---|---|
| **Left border** | 4px colored strip indicating severity |
| **Asset tag** (line 1) | Equipment identifier, bold. E.g., `MVBAC-23KA401 (1ST STAGE MP)` |
| **Model name** (line 2) | The alarm/model name. E.g., `FM - Bearing Overheating` |
| **Start time** (line 3, left) | `Started: 03/05/2026 12:47` |
| **Duration** (line 3, right) | `Duration: 4d 21h` |
| **Occurrences** (line 4, left) | `Occurrences: 7` — number badge, colored to match severity |
| **Action icon** (line 4, right) | Arrow icon (`→`) to drill into alarm detail |
| **Card background** | Slightly elevated dark (`#1e2128`) with subtle border (`#2a2d35`) |
| **Card padding** | 16px all around |
| **Card gap** | 12px between cards |
| **Corner radius** | 8px |

#### Severity Levels and Colors

| Severity | Left Border Color | Occurrences Badge Color | Meaning |
|---|---|---|---|
| **Critical** (IIII — 4 bars) | Red `#e74c3c` | Red `#e74c3c` | Requires immediate attention |
| **High** (III — 3 bars) | Orange `#e67e22` | Orange `#e67e22` | Important, needs action |
| **Medium** (II — 2 bars) | Yellow `#f1c40f` | Yellow `#f1c40f` | Monitor closely |
| **Low** (I — 1 bar) | Gray `#8a8f98` | Gray `#8a8f98` | Informational |

### Alarm Cards — Concrete Data (from current MVBAC alarms)

These are the 6 alarms currently active on MVBAC, which will populate Column 3 in the MVP. Cards are sorted by **severity (highest first)**, then by **duration (longest first)**.

#### Card 1 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FM - Bearing Overheating |
| **Start** | 03/05/2026 12:47 |
| **Duration** | 4d 21h 06m |
| **Occurrences** | 7 |

#### Card 2 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-26KA301 (1ST STAGE HP) |
| **Model** | FC - Lube Oil High Temperature |
| **Start** | 03/06/2026 13:01 |
| **Duration** | 4d 8h 21m |
| **Occurrences** | 7 |

#### Card 3 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FM - Lube Oil Internal Leakage Prealarm |
| **Start** | 03/07/2026 02:17 |
| **Duration** | 1d 0h 47m |
| **Occurrences** | 3 |

#### Card 4 — High

| Field | Value |
|---|---|
| **Severity** | High (3 bars) — orange left border |
| **Asset** | MVBAC-43KC107B (VRU) |
| **Model** | FC - Long Period Without Preservation |
| **Start** | 03/04/2026 21:25 |
| **Duration** | 6d 20h 00m |
| **Occurrences** | 115 |

#### Card 5 — High

| Field | Value |
|---|---|
| **Severity** | High (3 bars) — orange left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FC - Low Primary Seal Gas Injection Pressure |
| **Start** | 03/06/2026 17:22 |
| **Duration** | 4d 11h 52m |
| **Occurrences** | 6 |

#### Card 6 — High

| Field | Value |
|---|---|
| **Severity** | High (3 bars) — orange left border |
| **Asset** | MVBAC-50PS101A (SWLP WATER TREATMENT) |
| **Model** | FC - Deviation of Expected x Real Efficiency |
| **Start** | 03/11/2026 23:16 |
| **Duration** | 0d 7h 2m |
| **Occurrences** | — |

---

## 6. Global Styling Rules

All elements follow the existing Lighthouse dark theme:

| Token | Value | Usage |
|---|---|---|
| **Page background** | `#1a1d23` | Behind all three columns |
| **Card/panel background** | `#1e2128` | Alarm cards, chart containers |
| **Border/separator** | `#2a2d35` | Card borders, grid lines, column dividers |
| **Text primary** | `#ffffff` | Titles, KPI values, asset names |
| **Text secondary** | `#8a8f98` | Labels, units, timestamps, "Started:", "Duration:" |
| **Font family** | System font stack or Inter/Roboto | Consistent with Lighthouse |
| **Column dividers** | 1px solid `#2a2d35` | Thin vertical lines between the 3 columns |
| **Chart min-height** | ~150px per chart | Ensures charts are readable without being oversized |
| **Column padding** | 16px internal padding | Breathing room inside each column |

---

## 7. Interaction Behavior

| Interaction | Behavior |
|---|---|
| **Hover on bar chart bar** | Tooltip showing exact value, date, and series name |
| **Hover on trend line** | Tooltip showing exact rate, timestamp, and series name |
| **Hover on alarm card** | Card background lightens slightly (`#252830`), cursor pointer |
| **Click alarm card** | Navigates to the alarm/model detail page (link TBD) |
| **Click action arrow on alarm card** | Same as clicking the card |
| **Scroll Column 3** | Independent vertical scroll within the alarms column |
| **Columns 1-2** | No scroll needed (4 charts fit within viewport) |

---

## 8. Data Notes (for implementation)

> These define what data the front-end needs. API integration details TBD.

| Data | Source | Update Frequency |
|---|---|---|
| **Daily KPI bars (7 days)** | Historical aggregated data per KPI | Once per page load (or refresh button) |
| **48h trend data** | Time-series rate data at hourly intervals | Once per page load |
| **Plan/Target values** | Configuration or separate data source | Static or daily update |
| **Active alarms** | Model alarm table (FM/FC/ML models) | Once per page load |
| **Alarm severity** | Mapped from the severity column in the alarm data (bar count) | Derived from alarm data |

### MVP Approach for Charts Data

For the MVP, charts will use **mock/sample data** following realistic patterns for MVBAC. This allows us to validate the layout and design without waiting for API integration. Mock data specs:

| Chart | Mock Data Shape |
|---|---|
| **Oil bar chart** | 7 daily values between 8,000–15,000 Sm3 + small loss component |
| **Gas bar chart** | 7 daily values between 0.15–0.30 MSm3 + small loss |
| **Water bar chart** | 7 daily values: overboard 3,000–6,000, WI 4,000–7,000 Sm3 |
| **Flare bar chart** | 7 daily values between 1,500–4,000 Sm3 |
| **Oil trend** | 48 hourly points fluctuating around 12,000 Sm3/d + plan line at 13,000 |
| **Gas trend** | 48 hourly points fluctuating around 0.22 MSm3/d + plan line at 0.25 |
| **Water trend** | 48 hourly points: overboard ~4,500, WI ~5,500, plan WI at 6,000 |
| **Flare trend** | 48 hourly points fluctuating around 2,500 Sm3/d |

The alarm cards use **real alarm data** from the screenshot provided (6 alarms, hardcoded for MVP).

---

## 9. What Is NOT in This MVP

| Excluded | Rationale |
|---|---|
| Header bar | Exists already in the app — not being rebuilt |
| Ship image / health ring | Removed per user feedback |
| Equipment table | Removed from overview — will appear in sub-group drilldown |
| Models grid | Replaced by alarm cards |
| Right sidebar accordion | Removed |
| Date picker / time range controls | Fixed presets for v1 (7 days + 48h) |
| Customizable widget layout | Future (Theme E) |
| Sub-group drilldown pages | See [`spec_mvbac_production_gas.md`](file:///c:/Users/CaioBorges/_pgms/_repos/improvements_lighthouse/spec_mvbac_production_gas.md) |

---

## 10. Build Checklist

- [ ] Set up project structure (HTML/CSS/JS or framework TBD)
- [ ] Implement 3-column grid layout
- [ ] Build Column 1: 4 stacked bar charts with mock data
- [ ] Build Column 2: 4 stacked line charts with mock data
- [ ] Build Column 3: Alarm card component
- [ ] Populate Column 3 with 6 hardcoded alarm cards
- [ ] Apply Lighthouse dark theme globally
- [ ] Add hover interactions (chart tooltips, card hover states)
- [ ] Verify responsive behavior at common viewport widths
- [ ] Review with stakeholder and iterate

---

*Spec created: 2026-03-12*
*Status: DRAFT — Ready for review before implementation*
