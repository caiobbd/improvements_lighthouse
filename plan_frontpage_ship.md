# Lighthouse — Ship Front Page Redesign Plan

> **Goal:** Redesign the front page for a single ship (e.g., MV27) while preserving the existing theme, color scheme, and overall design language.

---

## 1. Current Page Anatomy

Below is a detailed description of every element currently visible on the **ship overview page** (using MV27 as the reference).

---

### 1.1 — Global Header Bar

| Element | Description |
|---|---|
| **Logo** | `LIGHTHOUSE` branding with "powered by advance" tagline, top-left corner. Red/coral accent icon. |
| **Breadcrumb** | `MODEC do Brasil > MV27` — shows the hierarchy: company → ship. |
| **Navigation Tabs** | Horizontal tab bar: **Overview** (active), Alarm, Cases, Asset Health, Performance, Flare, Charts. |
| **User Area** | Top-right corner with Help link, user name ("Caio Bor…"), and a grid/app-launcher icon. |

**Theme notes:** Dark background (`~#1a1d23`), white/light-gray text, subtle separators. The active tab appears to have a highlight/underline.

---

### 1.2 — Left Sidebar (Ship Tree Navigation)

| Element | Description |
|---|---|
| **Search Bar** | Text input at the top with a search icon and a close (×) button. |
| **Ship Tree** | Collapsible tree listing all ships: `MODEC do Brasil` as root, then MV18, MV20, MV22, MV23, MV24, MV26, **MV27** (expanded), MV29, MV30, MV31. |
| **Sub-systems** | Under MV27 (expanded): Electrical and Instrumentation, HSE (Health/Safety/Environment), Production Gas, Production Liquid, Utilities (Facilities), Utilities (Marine). Each has a collapse chevron (`∨`). |

**Theme notes:** Slightly darker panel (`~#14161a`), items have hover/expand states, the selected ship (MV27) is highlighted. Text is in light-gray with blue/teal accents for selected items.

---

### 1.3 — Hero / Ship Summary Section

This is the top banner area of the main content region.

| Element | Description |
|---|---|
| **Ship Image** | A photograph/render of the FPSO vessel, roughly 200×120px, left-aligned. |
| **Health Score Ring** | Circular donut chart showing **99%** health in green, with the label "Health" below. Positioned to the right of the image. |
| **KPI Cards** (inline) | Five key metrics displayed horizontally to the right of the health ring: |
| | • **Gas Flaring** — `2.56k` |
| | • **Oil Production** — `9.78M` |
| | • **Water Injection** — `287.75` |
| | • **Power Generated** — `32.92 MW` |
| | • **Uptime** — `95.33` |

**Theme notes:** The background appears to be the same dark as the rest of the page (no distinct card/panel). The health ring is a vivid green circle with a transparent center. KPI values are large white text with smaller gray labels above.

---

### 1.4 — Equipment Table Section

| Element | Description |
|---|---|
| **Tab Bar** | Three tabs: **Pumps** (active), Compressors, GTG — allows switching between equipment categories. |
| **Table Header** | Columns: `Equipment ↕` (sortable), `Status ↕`, `Open Cases ↕`. Additional columns partially visible on the right: "OpMode Motor Abor…", "Status", "Days in current sta…". |
| **Table Rows** | Listed equipment items, e.g.: |
| | • MV27 PSA-1135A (ET WATER PUMP) — green status, 0 open cases |
| | • MV27-PSA-1135B (ET WATER PUMP) — green status, 0 open cases |
| | • MV27-PSA-1185A (ET FEED PUMP) — red status (0 shown), 0 open cases |
| | • MV27 PSA-1185B (ET FEED PUMP) — green status, red open cases indicator |
| | • MV27-PBL-1210A (FLOWLINE) — checkbox visible |
| **Status Indicators** | Small colored squares: green = healthy, red = alarm/issue. |
| **View Toggle** | Top-right of the table area: two icons suggesting card view vs. list view toggle. |
| **Popup/Tooltip** | A "New List View" informational tooltip is visible, explaining the new card-to-list switching feature. |

**Theme notes:** The table has subtle horizontal row separators, alternating or hover highlights. The tab underline is in a teal/blue accent color.

---

### 1.5 — Models Section

| Element | Description |
|---|---|
| **Section Header Tabs** | Two tabs: **Models** (active), **Process Models**. |
| **Filter Toggles** | Two toggle/tag buttons to the right: `FMEA`, `Pi Vision`. |
| **Risk Legend** | Three risk categories shown with colored dots: |
| | • 🔴 **High: 116** (risk 0.75 to 1.00) |
| | • 🟡 **Medium: 6** (risk 0.50 to 0.75) |
| | • 🟢 **Good: 294** (risk under 0.50) |
| **Model Cards** | A grid of model cards, each showing: |
| | • A colored risk dot (red 🔴, yellow 🟡, green 🟢) |
| | • Model name (e.g., "Generator Test - Gas Heater Flow Inlet") |
| | • An external-link icon (↗) |
| | Examples visible: |
| | — Generator Test - Gas Heater Flow Inlet |
| | — FM - Multivariate Anomaly Detection for Compressors |
| | — FM - Abnormal Instrument Reading - Axial Displacement... |
| | — FM - Abnormal Instrument Reading - Axial Displacement... |
| | — FM - Abnormal Instrument Reading - Gearbox Axial... |
| | — ML - Compressor Lube Oil Leakage |
| | — FM - Compressor Lube Oil Leak |
| | — FM - Compressor Lube Oil Leakage |
| | — FC - Lube Oil PCV Failure |
| | — ML - Abnormal Instrument Reading - Generic |
| | — FM - Abnormal Instrument Reading - Comp Discharge... |
| | — FM - Abnormal Instrument Reading - Comp Suction... |

**Theme notes:** Cards have a dark background with subtle borders/separators. The model names are in light-gray/white text. The colored dots are the primary visual indicator of risk level.

---

### 1.6 — Right Sidebar (Document Links / Accordion)

| Element | Description |
|---|---|
| **Documents** | Collapsible accordion section header. |
| **Environmental** | Collapsible section. |
| **Equipment External References** | Collapsible section. |
| **Features** | Collapsible section. |
| **General** | Collapsible section. |
| **Header KPI** | Collapsible section. |
| **Health Score** | Collapsible section (partially visible). |

**Theme notes:** A narrow right-side panel with expandable/collapsible sections. Chevrons (∨) indicate expandability. Same dark palette as the rest.

---

## 2. Color Scheme & Design Tokens (Preserve)

Based on the screenshot, the current palette is:

| Token | Approximate Value | Usage |
|---|---|---|
| `--bg-primary` | `#1a1d23` | Main content background |
| `--bg-sidebar` | `#14161a` | Left sidebar |
| `--bg-header` | `#1e2128` | Top header bar |
| `--text-primary` | `#ffffff` | Headings, KPI values |
| `--text-secondary` | `#8a8f98` | Labels, secondary info |
| `--accent-teal` | `#3db9cf` or similar | Active tabs, links, selected items |
| `--accent-red` | `#e54d4d` | Logo accent, alert/alarm indicators |
| `--status-green` | `#2ecc71` | Healthy status, health ring |
| `--status-yellow` | `#f1c40f` | Medium risk |
| `--status-red` | `#e74c3c` | High risk, alarms |
| `--border-subtle` | `#2a2d35` | Table row separators, card borders |

---

## 3. Early Adopter Feedback (Verbatim)

> *Source: Early adopter / champion trying to drive broader adoption at MODEC.*

> "...deliveries made. However, there are still important points for evolution in Lighthouse. In my view, the tool needs to adopt a more **business-oriented posture**. Currently, the home page has too many visual elements and 'little photos' occupying prime screen real estate, in addition to a large space dedicated to Asset Health, which in practice does not provide truly relevant information for decision-making.
>
> It would be much more useful if the home page presented **indicators directly related to ship operations**, such as water injection, production, gas injection, among others. This type of information would significantly increase the interest and access of Modec people to Lighthouse. Today, the tool is still not seen as something truly relevant in the day-to-day; often, when someone uses LH, it is more because its use is being insistently encouraged than because they perceive direct value.
>
> Another point is that the initial screens still present a lot of **repetitive information** and some content that ends up being of little use. I recognize that this has improved recently, but we are still far from ideal.
>
> I also believe that the home screen should be **customizable**. It would be very interesting to be able to choose which information appears right on the first screen, allowing each user to quickly have an overview of the scenario they consider most important. This is a request I have been making since the beginning of the year.
>
> Finally, I personally found it a mistaken decision to prioritize the development of an 'AI button' before resolving these **structural issues** of the platform. If people still do not use Lighthouse on a recurring basis, this type of functionality ends up being of little use. In my opinion, the priority should be to make Lighthouse an essential tool for daily work; only then would it make sense to invest in additional features like this."

---

## 3.1 — Feedback Breakdown and Mapping to Page Elements

The feedback can be distilled into **5 core themes**. Below, each theme is mapped to the specific page sections it refers to (from Section 1), along with what is wrong and a proposed direction.

---

### Theme A — "Too many visual elements and little photos in prime real estate"

| Aspect | Detail |
|---|---|
| **Sections affected** | 1.3 Hero (Ship Image), 1.5 Models (card grid), 1.6 Right Sidebar |
| **The problem** | The ship photo, the dense model card grid, and the right sidebar accordion collectively take up most of the viewport without delivering decision-relevant information. The ship image is decorative — users already know which ship they are on. The model cards are many small tiles that visually clutter the page. |
| **User need** | When I open the page, I want to immediately see *actionable numbers*, not decorations or exhaustive lists. |
| **Proposed direction** | **Shrink or remove the ship image.** It could be reduced to a small icon/thumbnail in the header or breadcrumb — it does not need hero-banner space. Reclaim that real estate for operational KPIs. The model cards section should be condensed (e.g., show only anomalies/alerts by default, with expand-to-see-all). |

---

### Theme B — "Asset Health takes large space but does not support decision-making"

| Aspect | Detail |
|---|---|
| **Sections affected** | 1.3 Health Score Ring, 1.5 Models Section (risk summary) |
| **The problem** | The health ring shows "99%" — a single aggregated number that tells the user almost nothing. What does 99% mean operationally? Which sub-system is the 1% that is not healthy? The Models section shows 116 high-risk items but does not help the user prioritize what to act on *right now*. |
| **User need** | Health information should be *decomposed* and *actionable*: show me what is degraded, what changed recently, and what I need to do about it — or get it out of my way. |
| **Proposed direction** | Replace the big health ring with a **compact health bar or badge** (not a hero element). Below or beside it, show a **"Top Alerts" or "Needs Attention" list** — the 3-5 items that actually require action, with links to drill down. The full model grid moves to a dedicated sub-page or behind a "View All Models" link. |

---

### Theme C — "Need operational indicators: water injection, production, gas injection"

| Aspect | Detail |
|---|---|
| **Sections affected** | 1.3 KPI Cards |
| **The problem** | The current KPI row (Gas Flaring, Oil Production, Water Injection, Power Generated, Uptime) is actually *close* to what the user wants — but it is squeezed into a small strip, shows only raw numbers without trends or targets, and competes visually with the ship photo and health ring for attention. |
| **User need** | Operational KPIs should be the **dominant, first-thing-you-see element** on the page. They should have context: am I above or below target? What is the trend over the last 24h/7d? |
| **Proposed direction** | **Promote KPIs to the hero section.** Make them large, prominent cards with: the current value, the unit, a target/plan line, a mini sparkline (24h or 7d trend), and a delta indicator (up/down vs. yesterday or vs. target). These should occupy the prime real estate currently used by the ship photo and health ring. Consider adding more ops-relevant KPIs: gas injection, BOED, water cut, etc. |

---

### Theme D — "Repetitive information and content of little use"

| Aspect | Detail |
|---|---|
| **Sections affected** | 1.4 Equipment Table, 1.5 Models Section, 1.6 Right Sidebar |
| **The problem** | The Equipment table shows *all* equipment by default, most is green/healthy — not immediately useful. The Models section lists *all* models (400+) in a flat grid. The Right Sidebar repeats category names without showing whether there is anything relevant inside. All three sections dump everything on the user instead of surfacing what matters. |
| **User need** | Show me *exceptions* and *outliers*. I do not need to see 294 green models — I need to see the 116 red ones, sorted by severity. |
| **Proposed direction** | Adopt an **"exceptions-first" philosophy**: Equipment section defaults to showing only items with active alarms or open cases (with a toggle to "Show All"). Models section defaults to showing only High and Medium risk, sorted by risk score. Right sidebar either becomes a contextual panel or is removed from the front page entirely. |

---

### Theme E — "Home screen should be customizable"

| Aspect | Detail |
|---|---|
| **Sections affected** | All of 1.3 through 1.6 (the main content area) |
| **The problem** | Every user — whether an operations engineer, a maintenance manager, or a reliability analyst — sees the exact same front page. Their priorities differ significantly. |
| **User need** | Let me configure *my* dashboard. An operations person wants production/injection numbers front-and-center. A maintenance person wants equipment alerts and open cases. A reliability engineer wants model risk trends. |
| **Proposed direction** | This is a **longer-term goal** and likely out of scope for the first iteration. However, we can lay the groundwork: design the page as a set of **modular, self-contained widget panels** (KPI strip, alerts list, equipment summary, model summary). In a future iteration, users can reorder, show/hide, or resize these widgets. For now, we pick a sensible default layout that leans towards the operations-first perspective (since that is the primary audience we are trying to win). |

---

## 4. Revised Element Assessment

Using the feedback themes (A-E) to re-evaluate each page element:

### Keep As-Is
- **Global Header Bar (1.1)** — No complaints; clean, functional, well-branded.
- **Left Sidebar (1.2)** — No complaints; ship tree is essential navigation.
- **Color scheme and dark theme** — Core identity; explicitly preserved.

### Promote / Expand

| Element | Action | Themes |
|---|---|---|
| **KPI Cards (1.3)** | Promote to the **dominant hero element**. Enlarge, add trend sparklines, targets, deltas. Add more ops KPIs (gas injection, BOED, water cut). | B, C |

### Demote / Shrink

| Element | Action | Themes |
|---|---|---|
| **Ship Image (1.3)** | Reduce to a small thumbnail/icon in the breadcrumb or a thin banner strip. Do not give it hero-level space. | A |
| **Health Score Ring (1.3)** | Replace with a compact badge/indicator (e.g., a small colored bar or pill in the header area). Not a hero element. | A, B |
| **Models Grid (1.5)** | Default to showing only High + Medium risk. Full grid behind "View All" or on a dedicated page. | A, D |
| **Right Sidebar (1.6)** | Remove from front page or collapse into a small contextual panel. Content is not front-page material. | A, D |

### Redesign

| Element | Action | Themes |
|---|---|---|
| **Equipment Table (1.4)** | Default to showing only equipment with alarms/issues. Add a toggle for "Show All". Consider a summary count strip (e.g., "3 of 47 pumps need attention") above the table. | D |
| **Models Section (1.5)** | Reframe as "Alerts and Anomalies" — focus on what needs attention. Show a concise list of top-N flagged models with risk score, trend direction, and a link. | A, B, D |

### Future (Not in v1, but design for it)

| Element | Action | Themes |
|---|---|---|
| **Widget customization** | Design sections as modular panels so they can later be reordered/toggled by each user. | E |

---

## 5. Reference Analysis: PEPO Daily EPOG Page

The PEPO "Daily EPOG" page (for the Peregrino asset) is a strong reference for the kind of operations-first front page the early-adopter feedback is asking for. Below is a detailed breakdown of what it does, what works well, and what we should adopt.

---

### 5.1 — Page Structure Overview

The PEPO page uses a **three-column layout** below a thin header/toolbar:

```
+------------------------------------------------------------------+
|  HEADER: Logo  Peregrino > Daily EPOG   [Wells] [Process] [...]  |
|  TOOLBAR: Period/Range toggle | 7 days | Date picker | Unit      |
+------------------+-------------------+---------------------------+
|                  |                   |                            |
|  LEFT COLUMN     |  MIDDLE COLUMN    |  RIGHT COLUMN             |
|  "Daily Totals"  |  "Trend"          |  "Deviations"             |
|  (bar charts)    |  (line charts)    |  (alarm list)             |
|  7-day window    |  48-hour window   |                            |
|                  |                   |                            |
|  [Oil row]       |  [Oil row]        |  [Production Wells]       |
|  [Gas row]       |  [Gas row]        |  - A-26  Open  ESP Curr.  |
|  [Water row]     |  [Water row]      |  - B-30A Open  ESP Curr.  |
|  [Flare row]     |  [Flare row]      |  - A-08  Open  ESP Curr.  |
|                  |                   |  - B-27  Open  ESP Curr.  |
|                  |                   |                            |
|                  |                   |  [Process and Energy]     |
|                  |                   |  - 80-YY-7342 Active Pwr  |
|                  |                   |                            |
+------------------+-------------------+---------------------------+
```

---

### 5.2 — Left Column: Daily Accumulated Totals (7-day bar charts)

Each row corresponds to one critical KPI. The bar charts show **daily accumulated values** over the last 7 days.

| KPI Row | Chart Type | Series Shown | Unit |
|---|---|---|---|
| **Oil / Cond Production** | Stacked bar | Production (green), Loss (red) | Sm3 |
| **Gas Production** | Stacked bar | Production (red), Loss, WHPC Gas Import | MSm3 |
| **Water Production** | Grouped bar | Water Overboard, WI (water injection) | Sm3 |
| **Flare Gas** | Grouped bar | Total Flare Gas, FPSO Flare, FPSO | Sm3 |

**What works well:**
- **Daily bars are instantly scannable** — management can see at a glance whether production is stable, trending up, or dipping. No need to mentally aggregate a continuous line.
- **Loss is explicitly shown** alongside production — this is a key operations concern (how much are we losing?).
- **Consistent structure** — every row follows the same pattern (title, unit, chart, legend), making it easy to scan vertically.
- **7-day window is the right default** for management-level oversight — enough context without overwhelming.

---

### 5.3 — Middle Column: Recent Trends (48-hour line charts)

Each row mirrors the left column but shows a **continuous rate trend** for the last ~48 hours.

| KPI Row | Chart Type | Series Shown | Unit |
|---|---|---|---|
| **Oil / Cond Production** | Multi-line | Production, Train A, Train B, Plan | Sm3/d |
| **Gas Production** | Multi-line | Production, WHPC Gas Import, PI | MSm3/d |
| **Water Production** | Multi-line | Water Overboard, WI, Plan Wat, Plan WI | Sm3/d |
| **Flare Gas** | Multi-line | FPSO Flare gas, FPSO Flare VRU | Sm3/d |

**What works well:**
- **Plan/target lines are overlaid** (dashed lines) — the user immediately sees "am I above or below plan?" without needing a separate reference.
- **Finer time resolution** (hourly points over 48h) lets operations people see process dynamics: when did the dip happen? Is it recovering?
- **The dual-view concept** (daily aggregated + recent trend) serves *two different audiences* side-by-side: management (left) and operations (right). This is clever because it avoids the need for two separate pages.

---

### 5.4 — Right Column: Deviations Panel

This is a **persistent sidebar** showing unresolved alarms / deviations grouped by process area.

| Group | Items Shown |
|---|---|
| **Production Wells** | A-26 (Open, ESP Current), B-30A (Open, ESP Current), A-08 (Open, ESP Current), B-27 (Open, ESP Current) |
| **Process and Energy** | 80-YY-7342 — Active Power |

Each item shows:
- **Equipment/tag ID** (e.g., A-26, 80-YY-7342)
- **Status** — "Open" with a color-coded badge (yellow for warnings, default for open)
- **Deviation type** — e.g., "ESP Current" in a red pill/badge
- **Action link** — a small arrow/link icon to drill into the deviation

**What works well:**
- **Always visible** — deviations don't require clicking a tab or navigating away. They sit right next to the KPIs so you can correlate: "Oh, B-27 ESP is flagged AND I see a dip in water injection — related?"
- **Grouped by process area** — matches the mental model of how operations people think about the plant.
- **Compact** — each item is one line. Even with several deviations, the list is scannable.
- **Action-oriented** — every item is clickable, leading to the detail/investigation page.

---

### 5.5 — Key Patterns to Adopt for Lighthouse

| PEPO Pattern | How to Apply in Lighthouse |
|---|---|
| **Dual chart per KPI (daily bar + 48h trend)** | Adopt this exact pattern. Each KPI row gets two charts side by side. Left: 7-day daily accumulated bars. Right: 48-hour continuous trend line. Preset windows, no date picker needed for v1. |
| **KPI rows stacked vertically** | Row 1: Oil Production. Row 2: Gas Production. Row 3: Water Production. Row 4: Flare Gas. This is the priority order. More can be added later. |
| **Plan/target overlay on trends** | Show plan/target as a dashed line on the 48h trend charts where available. This directly answers "am I on track?" |
| **Loss shown alongside production** | Where applicable (oil, gas), show loss as a distinct series in the bar charts. |
| **Deviations panel (always visible)** | Replace our "Needs Attention" concept with a dedicated deviations column/panel. Populate it with **model alarms for critical equipment** instead of well deviations (since Lighthouse monitors equipment health via ML/FM models). Group by equipment category (Pumps, Compressors, etc.). |
| **Grouped by process area** | Deviations grouped by the sub-system categories already in the left sidebar tree (Production Gas, Production Liquid, Utilities, etc.). |
| **Compact alarm rows** | Each deviation item: Equipment tag, model name (short), risk level badge, status (Open/Acknowledged), action link. |

---

### 5.6 — Equipment Visualization Concept (Future — Sub-Group Pages)

> *Note: This is a separate concept for sub-group pages (when the user clicks into a specific group like "Production Gas" in the left sidebar), NOT the ship-level front page. To be detailed in a future planning session.*

When navigating to a sub-group (e.g., MV27 > Production Gas):
- The global KPI charts (Oil, Gas, Water, Flare) are **no longer needed** — the user is now focused on a specific process area.
- Instead, show a **visual equipment map/diagram** — all equipment in that part of the process displayed visually (icons, schematic, or card grid), each with a health indicator.
- This gives an at-a-glance view of "which equipment in this sub-system needs attention?"
- Clicking an equipment item drills into its detail page.

*Details to be discussed in a future iteration.*

---

## 6. Revised Proposed Layout (Incorporating PEPO Learnings)

The layout below supersedes the earlier rough structure from Section 5, incorporating the dual-chart KPI pattern and deviations panel.

**Ship-level front page (e.g., MV27 Overview):**

```
+------------------------------------------------------------------+
|  HEADER BAR  (unchanged: logo, breadcrumb, nav tabs, user)       |
+--------+-----------------------------------------+---------------+
|        |                                         |               |
| LEFT   | (1) SHIP ID BAR (compact)               |               |
| SIDE   |     Ship name + thumbnail + Health pill  |               |
| BAR    |                                         |               |
|        +-----------------------------------------+ DEVIATIONS   |
| (un-   |                                         | PANEL         |
| chan-   | (2) KPI DASHBOARD (hero, main content)   |               |
| ged)   |                                         | Model alarms  |
|        |  +-- 7-day bars --+-- 48h trend -----+  | for critical  |
|        |  |                |                  |  | equipment,    |
|        |  | OIL PRODUCTION | OIL PROD. RATE   |  | grouped by    |
|        |  | daily accum.   | + Plan line       |  | process area: |
|        |  +----------------+------------------+  |               |
|        |  |                |                  |  | [Pumps]       |
|        |  | GAS PRODUCTION | GAS PROD. RATE   |  |  - PSA-1135A  |
|        |  | daily accum.   | + Plan line       |  |    FM Alert   |
|        |  +----------------+------------------+  |  - PSA-1185B  |
|        |  |                |                  |  |    ML Alert   |
|        |  | WATER PROD.    | WATER PROD. RATE |  |               |
|        |  | daily accum.   | + Plan line       |  | [Compressors] |
|        |  +----------------+------------------+  |  - ...        |
|        |  |                |                  |  |               |
|        |  | FLARE GAS      | FLARE GAS RATE   |  | [GTG]         |
|        |  | daily accum.   |                  |  |  - ...        |
|        |  +----------------+------------------+  |               |
|        |                                         |               |
|        | (3) EQUIPMENT SUMMARY (collapsed)        |               |
|        |     "View all equipment" link            |               |
|        |                                         |               |
+--------+-----------------------------------------+---------------+
```

### Layout Specifications

| Zone | Content | Size Guidance |
|---|---|---|
| **Ship ID Bar** | Ship name, small vessel thumbnail (48px), health badge (colored pill with % value). Compact, single row. | ~50px height |
| **KPI Dashboard — Left (Daily Bars)** | 4 stacked bar charts (Oil, Gas, Water, Flare). 7-day window. Shows production + loss where applicable. Daily accumulated values. | ~55% of the center width |
| **KPI Dashboard — Right (48h Trends)** | 4 line charts mirroring the left rows. 48-hour window. Shows rate with plan/target overlay (dashed). Hourly data points. | ~45% of the center width |
| **Deviations Panel** | Always-visible right panel. Lists unresolved model alarms for critical equipment. Grouped by equipment category (matching left sidebar groups). Each item: equipment tag, model name, risk badge (red/yellow), status, action link. | ~250px fixed width |
| **Equipment Summary** | Collapsed by default. Link to full equipment table. Shows a one-line summary: "3 of 47 pumps need attention". | Collapsed: ~40px |

### KPI Row Priority Order

| Row | KPI | Left Chart (7-day bars) | Right Chart (48h trend) |
|---|---|---|---|
| 1 | **Oil Production** | Daily accumulated barrels (Production + Loss) | Rate trend with Plan overlay |
| 2 | **Gas Production** | Daily accumulated volume (Production + Loss + Import) | Rate trend with Plan overlay |
| 3 | **Water Production** | Daily accumulated (Water Overboard + WI) | Rate trend with Plan WI overlay |
| 4 | **Flare Gas** | Daily accumulated (Total Flare + FPSO Flare) | Rate trend |

### Preset Time Windows (No date picker in v1)

| Chart Type | Window | Rationale |
|---|---|---|
| Daily bar charts | **Last 7 days** | Management-level overview; enough to spot weekly patterns |
| Trend line charts | **Last 48 hours** | Operations-level detail; enough to see recent process dynamics |

---

## 7. Key Design Decisions Summary

| Decision | Rationale | Reference |
|---|---|---|
| Dual-chart layout (bars + trends) per KPI row | Serves two audiences simultaneously: management (daily totals) and operations (recent trends). Avoids needing separate pages. | PEPO Daily EPOG |
| Deviations panel always visible | Correlating alarms with KPI dips is faster when both are on screen. This is the "exceptions-first" approach the adopter asked for. | PEPO Deviations, Theme D |
| Populate deviations with model alarms | Lighthouse's core value is ML/FM equipment monitoring — the deviations panel should showcase this, showing which models are flagging and for which equipment. | Theme B, C |
| KPI order: Oil > Gas > Water > Flare | Matches the operational priority confirmed by the user. This is the default; customization comes later (Theme E). | User direction |
| Fixed time presets (7d + 48h) | Reduces UI complexity for v1. The vast majority of users need exactly these windows. Date picker can be added later. | User direction |
| Equipment visualization for sub-group pages | When drilling into a sub-system, the global KPIs are no longer needed. Show equipment visually instead. This is a separate page design, not the ship front page. | User direction (future) |

---

## 8. Next Steps

- [x] Review this updated plan — confirm KPI rows and layout
- [x] Detail the Deviations panel: which model types to show, severity thresholds, grouping logic
## 8. Next Steps

- [x] Review this updated plan — confirm KPI rows and layout
- [x] Detail the Deviations panel: which model types to show, severity thresholds, grouping logic
- [x] **MVBAC Overview MVP** — Build spec: [`spec_mvbac_overview_mvp.md`](file:///c:/Users/CaioBorges/_pgms/_repos/improvements_lighthouse/spec_mvbac_overview_mvp.md)
- [x] **MVBAC Production Gas drilldown** — Build spec: [`spec_mvbac_production_gas.md`](file:///c:/Users/CaioBorges/_pgms/_repos/improvements_lighthouse/spec_mvbac_production_gas.md)
- [ ] Build the MVBAC Overview MVP (3-column layout: bars + trends + alarm cards)
- [ ] Build the Production Gas drilldown (equipment diagrams + trends + detail tabs + alarm cards)
- [ ] Review both pages with stakeholder
- [ ] Define the data requirements for each KPI chart (API endpoints, fields, units)
- [ ] Define how Plan/Target lines are sourced (manual entry? separate system?)
- [ ] Plan specs for remaining sub-group pages (Production Liquid, Utilities)
- [ ] Plan the modular panel architecture for future customization (Theme E)

---

*Document created: 2026-03-12*
*Last updated: 2026-03-12 — Both page specs complete (Overview + Production Gas)*

