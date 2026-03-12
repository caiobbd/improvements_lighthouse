# MVBAC - Production Gas — Drilldown Page Spec

> **Scope:** This spec defines the drilldown page when a user clicks "MVBAC - PRODUCTION - GAS" in the left sidebar. It replaces all current content for this sub-group view.
>
> **Parent page:** [`spec_mvbac_overview_mvp.md`](file:///c:/Users/CaioBorges/_pgms/_repos/improvements_lighthouse/spec_mvbac_overview_mvp.md)

---

## 1. Page Identity

| Property | Value |
|---|---|
| **Ship** | MVBAC |
| **Page** | Production Gas (sub-group drilldown) |
| **Breadcrumb** | `MODEC do Brasil > MVBAC > Production Gas` |
| **Sidebar** | Same as overview: MVBAC tree with sub-groups. "MVBAC - PRODUCTION - GAS" is now highlighted as active. |

---

## 2. Page Structure — Two Vertical Zones

The page is divided into two vertical zones that the user scrolls through. The left sidebar remains present throughout.

```
+------------------------------------------------------------------------------+
|  HEADER BAR  (Logo, breadcrumb, nav tabs)                                    |
+--------+---------------------------------------------------------------------+
|        |                                                                      |
| SIDE   |  ZONE A — EQUIPMENT OVERVIEW + GAS TRENDS  (top, above the fold)    |
| BAR    |                                                                      |
|        |  +-----------------------------------+----------------------------+  |
| MVBAC  |  |                                   |                            |  |
|  Prod  |  |  EQUIPMENT DIAGRAMS               |  GAS TRENDS               |  |
|  Gas*  |  |  (left ~60%)                       |  (right ~40%)             |  |
|  Prod  |  |                                   |                            |  |
|  Liq   |  |  [LP Compression Trains]          |  Gas Production (48h)     |  |
|  Util  |  |  [MP Compression Trains]          |                            |  |
|  Fac   |  |                                   |  Flare Gas (48h)          |  |
|  Util  |  |  [HP Compression Trains]          |                            |  |
|  Mar   |  |                                   |                            |  |
|        |  +-----------------------------------+----------------------------+  |
|        |                                                                      |
|        |  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ scroll down ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  |
|        |                                                                      |
|        |  ZONE B — EQUIPMENT DETAILS + ALARMS  (below the fold)              |
|        |                                                                      |
|        |  +-----------------------------------------------+----------------+  |
|        |  |                                               |                |  |
|        |  |  EQUIPMENT DETAIL TABS  (left ~66%)           |  ALARM CARDS   |  |
|        |  |  [Cases | Alarms | Vibration | Oil Analysis   |  (right ~33%)  |  |
|        |  |   | Maint. Notes | Maint. Plans]              |                |  |
|        |  |                                               |  Filtered for  |  |
|        |  |  Table content based on selected tab          |  Production    |  |
|        |  |                                               |  Gas equipment |  |
|        |  +-----------------------------------------------+----------------+  |
|        |                                                                      |
+--------+---------------------------------------------------------------------+
```

---

## 3. Zone A — Equipment Overview + Gas Trends

This is the top section of the page, visible immediately when the page loads.

### 3.1 — Left Side: Equipment Diagrams (~60% width)

This section displays all compression equipment using **simple representative icons** organized to match the engineering process flow diagrams. Each piece of equipment has a **status circle** (health indicator).

#### Icon Definitions

Two icon types are used throughout:

| Icon | Represents | Visual Description |
|---|---|---|
| **Motor icon** | Electric motor / driver | A circle with an "M" inside, or a simplified motor symbol (rectangle with a small circle shaft). Dark fill (`#1e2128`) with light stroke (`#8a8f98`). Size: ~40x40px. |
| **Compressor icon** | Compressor stage | A trapezoid/triangle shape (narrowing in flow direction), representing a compressor. Dark fill (`#1e2128`) with light stroke (`#8a8f98`). Size: ~40x40px. |

#### Status Circle

Each equipment icon has a small **status circle** (12px diameter) in the top-right corner:

| Status | Color | Meaning |
|---|---|---|
| **Running / Healthy** | Green `#2ecc71` | Equipment running, no alarms |
| **Warning** | Yellow `#f1c40f` | Equipment running but has active warnings |
| **Alarm** | Red `#e74c3c` | Equipment has critical/high alarms |
| **Spare / Offline** | Gray `#555555` | Equipment is spare or not in production |

#### Equipment icons are connected by **flow lines** — thin horizontal/vertical lines (`#8a8f98`, 1px) showing the process flow direction with small arrows.

---

#### 3.1.1 — Low Pressure Section

Section title: **"LP Compression (2 x 100%)"** — white text, semibold, with a subtle separator below.

Based on the engineering diagram, LP compression has 2 trains (100% capacity each):

```
LP Train A (Active)
═══════════════════════════════════════════════════════════════

  [Scrubber]  ──→  [Motor 1.5MW]  ──→  [LP Compressor]  ──→  output
     ○                 ○(M)                ○(C)
   (green)           (green)             (green)


LP Train B (Spare)
═══════════════════════════════════════════════════════════════

  [Scrubber]  ──→  [Motor 1.5MW]  ──→  [LP Compressor]  ──→
     ○                 ○(M)                ○(C)
   (gray)            (gray)              (gray)
```

Then MP compression (also 2 x 100%):

Section title: **"MP Compression (2 x 100%)"**

```
MP Train A (Active)
═══════════════════════════════════════════════════════════════

  [Scrubber]  ──→  [Motor 12MW]  ──→  [MP 1st Stage]  ──→  [MP 2nd Stage]  ──→  output
     ○               ○(M)               ○(C)                  ○(C)
   (green)          (green)            (green)               (green)


MP Train B (Spare)
═══════════════════════════════════════════════════════════════

  [Scrubber]  ──→  [Motor 12MW]  ──→  [MP 1st Stage]  ──→  [MP 2nd Stage]  ──→
     ○               ○(M)               ○(C)                  ○(C)
   (gray)           (gray)             (gray)                (gray)
```

**Mock status for LP/MP:**

| Equipment | Tag (mock) | Status | Reasoning |
|---|---|---|---|
| LP Train A — Scrubber | MVBAC-20VG101 | Green | Running normally |
| LP Train A — Motor | MVBAC-20KM101 | Green | Running normally |
| LP Train A — Compressor | MVBAC-20KA101 | Green | Running normally |
| LP Train B — Scrubber | MVBAC-20VG102 | Gray | Spare |
| LP Train B — Motor | MVBAC-20KM102 | Gray | Spare |
| LP Train B — Compressor | MVBAC-20KA102 | Gray | Spare |
| MP Train A — Scrubber | MVBAC-23VG101 | Green | Running normally |
| MP Train A — Motor | MVBAC-23KM101 | Green | Running normally |
| MP Train A — MP 1st Stage | MVBAC-23KA201 | Green | Running normally |
| MP Train A — MP 2nd Stage | MVBAC-23KA202 | Green | Running normally |
| MP Train B — All | MVBAC-23xx102 | Gray | Spare |

---

#### 3.1.2 — High Pressure Section

Positioned **below** the LP/MP section within the same left column.

Section title: **"HP Compression (3 x 50% Trains)"** — white text, semibold.

Based on the engineering diagram, there are 3 identical HP trains, each at 50% capacity (need at least 2 of 3 running):

Each train contains: **HP 1st Stage → HP 2nd Stage → Injection Compressor**

```
HP Train 1
═══════════════════════════════════════════════════════════════════════════════

  [Motor 14MW]  ──→  [HP 1st Stage]  ──→  [Motor 12MW]  ──→  [HP 2nd Stage]  ──→  [Motor 6.2MW]  ──→  [Inj Compr/GIC]  ──→  to gas injection
     ○(M)                ○(C)                ○(M)                ○(C)                 ○(M)                 ○(C)
   (green)             (RED)               (green)             (green)              (green)              (green)


HP Train 2
═══════════════════════════════════════════════════════════════════════════════

  [Motor 14MW]  ──→  [HP 1st Stage]  ──→  [Motor 12MW]  ──→  [HP 2nd Stage]  ──→  [Motor 6.2MW]  ──→  [Inj Compr/GIC]  ──→  to gas injection
     ○(M)                ○(C)                ○(M)                ○(C)                 ○(M)                 ○(C)
   (green)             (green)             (green)             (green)              (green)              (green)


HP Train 3
═══════════════════════════════════════════════════════════════════════════════

  [Motor 14MW]  ──→  [HP 1st Stage]  ──→  [Motor 12MW]  ──→  [HP 2nd Stage]  ──→  [Motor 6.2MW]  ──→  [Inj Compr/GIC]  ──→  to gas injection
     ○(M)                ○(C)                ○(M)                ○(C)                 ○(M)                 ○(C)
   (green)             (green)             (green)             (green)              (green)              (green)
```

**Mock status for HP trains:**

| Equipment | Tag (mock) | Status | Reasoning |
|---|---|---|---|
| HP Train 1 — Motor 14MW | MVBAC-23KM401 | Green | Running normally |
| HP Train 1 — HP 1st Stage | MVBAC-23KA401 | **Red** | Has 3 active critical alarms (Bearing Overheating, Lube Oil Leakage, Seal Gas Pressure) |
| HP Train 1 — Motor 12MW | MVBAC-23KM402 | Green | Running normally |
| HP Train 1 — HP 2nd Stage | MVBAC-23KA402 | Green | Running normally |
| HP Train 1 — Motor 6.2MW | MVBAC-23KM403 | Green | Running normally |
| HP Train 1 — Inj Compr (GIC) | MVBAC-23KA403 | Green | Running normally |
| HP Train 2 — All | MVBAC-23KA501-506 | Green | Running normally |
| HP Train 3 — Motor 14MW | MVBAC-26KM301 | Green | Running normally |
| HP Train 3 — HP 1st Stage | MVBAC-26KA301 | **Red** | Has critical alarm (Lube Oil High Temperature) |
| HP Train 3 — Motor 12MW | MVBAC-26KM302 | Green | Running normally |
| HP Train 3 — HP 2nd Stage | MVBAC-26KA302 | Green | Running normally |
| HP Train 3 — Motor 6.2MW | MVBAC-26KM303 | Green | Running normally |
| HP Train 3 — Inj Compr (GIC) | MVBAC-26KA303 | Green | Running normally |

> **Note:** The red statuses on MVBAC-23KA401 and MVBAC-26KA301 correspond to the real alarms from the MVBAC alarm table. When a user sees a red dot here, they should be able to glance at the alarm cards on the right (Zone B) to see the details.

---

#### 3.1.3 — Equipment Icon Interaction

| Interaction | Behavior |
|---|---|
| **Hover on equipment icon** | Tooltip showing: tag name, equipment description, current status, motor power (if motor). Icon border highlights with the status color. |
| **Click on equipment icon** | Scrolls down to Zone B and filters the equipment detail tabs to show data for this specific equipment. Also highlights the relevant alarm cards. |

---

### 3.2 — Right Side: Gas Trends (~40% width)

Two trend line charts stacked vertically, using the **same vertical height** as the equipment diagrams on the left. These are the same chart style as the Overview page, but only trends (no bar charts), and only the gas-related KPIs.

#### Chart 1: Gas Production Rate (48h)

| Property | Value |
|---|---|
| **Title** | Gas Production |
| **Unit** | MSm3/d |
| **Time window** | Last 48 hours |
| **Series** | Production rate (teal `#3db9cf`, solid), Plan (gray `#8a8f98`, dashed) |
| **Chart type** | Multi-line, same styling as Overview page |

#### Chart 2: Flare Gas Rate (48h)

| Property | Value |
|---|---|
| **Title** | Flare Gas |
| **Unit** | Sm3/d |
| **Time window** | Last 48 hours |
| **Series** | Flare gas rate (orange `#e67e22`, solid) |
| **Chart type** | Line chart, same styling as Overview page |

These two charts use mock data (same mock ranges as the Overview spec).

---

## 4. Zone B — Equipment Details + Alarm Cards

This section appears **below the fold** — the user scrolls down to reach it. It provides detailed information about the gas production equipment.

### Layout: 2/3 + 1/3 Split

```
+-----------------------------------------------+------------------+
|                                                |                  |
|  EQUIPMENT DETAIL TABS  (66% width)            |  ALARM CARDS     |
|                                                |  (33% width)     |
|  +------------------------------------------+  |                  |
|  | Cases | Alarms | Vibration | Oil Analysis |  |  +------------+ |
|  |       | Maint. Notes | Maint. Plans       |  |  | CARD 1     | |
|  +------------------------------------------+  |  +------------+ |
|  |                                          |  |  +------------+ |
|  |  [Tab content — table rows]              |  |  | CARD 2     | |
|  |                                          |  |  +------------+ |
|  |  Open: X   Closed: Y                    |  |  +------------+ |
|  |                                          |  |  | CARD 3     | |
|  |  Sever. | Created | Name | Stage | ...  |  |  +------------+ |
|  |  ────── | ─────── | ──── | ───── | ──── |  |  +------------+ |
|  |  IIII   | 10/07.. | ...  | feedb | None |  |  | CARD 4     | |
|  |  ...    | ...     | ...  | ...   | ...  |  |  +------------+ |
|  |                                          |  |  +------------+ |
|  +------------------------------------------+  |  | CARD 5     | |
|                                                |  +------------+ |
|                                                |                  |
+-----------------------------------------------+------------------+
```

---

### 4.1 — Equipment Detail Tabs (Left, 66%)

A tabbed panel matching the existing Lighthouse detail view style. The tabs are:

| Tab | Content |
|---|---|
| **Cases** | Open/closed cases for Production Gas equipment. Table columns: Severity, Created, Name, Stage, Actions St., Last Edition. Includes "Open: X / Closed: Y" counter and "Cases page" external link + "New" button. |
| **Alarms** | Historical alarms for Production Gas equipment. |
| **Vibration Analysis** | Vibration data/reports for relevant compressors and motors. |
| **Oil Analysis** | Lube oil analysis results for compressors. |
| **Maint. Notes** | Maintenance notes related to Production Gas equipment. |
| **Maint. Plans** | Upcoming maintenance plans. |

#### Tab Bar Styling

| Element | Style |
|---|---|
| **Tab text** | White (`#ffffff`) when active, gray (`#8a8f98`) when inactive |
| **Active indicator** | Teal underline (`#3db9cf`, 3px) below active tab text |
| **Background** | Dark panel (`#1e2128`) |
| **Counters** | "Open: X" in a teal pill badge, "Closed: Y" in gray text |

#### Mock Data — Cases Tab (Default View)

| Severity | Created | Name | Stage | Actions St. | Last Edition |
|---|---|---|---|---|---|
| IIII (red) | 03/06/2026 | Bearing temperature high on 23KA401 | Investigation | Pending | 03/10/2026 |
| IIII (red) | 03/06/2026 | Lube oil temp high 26KA301 | Feedback | None | 03/08/2026 |
| III (orange) | 03/07/2026 | Seal gas pressure low 23KA401 | Open | Pending | 03/09/2026 |

**Counters:** Open: 3, Closed: 0

---

### 4.2 — Alarm Cards (Right, 33%)

Same card design as the Overview page (Section 5 of the Overview spec), but **filtered to show only alarms from Production Gas equipment**.

#### Column Header

```
Production Gas Alarms (5)
```

#### Filtered Alarm Cards

From the 6 MVBAC alarms, these 5 are relevant to Production Gas equipment (excluding the SWLP Water Treatment pump alarm which belongs to Production Liquid):

##### Card 1 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FM - Bearing Overheating |
| **Start** | 03/05/2026 12:47 |
| **Duration** | 4d 21h 06m |
| **Occurrences** | 7 |

##### Card 2 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-26KA301 (1ST STAGE HP) |
| **Model** | FC - Lube Oil High Temperature |
| **Start** | 03/06/2026 13:01 |
| **Duration** | 4d 8h 21m |
| **Occurrences** | 7 |

##### Card 3 — Critical

| Field | Value |
|---|---|
| **Severity** | Critical (4 bars) — red left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FM - Lube Oil Internal Leakage Prealarm |
| **Start** | 03/07/2026 02:17 |
| **Duration** | 1d 0h 47m |
| **Occurrences** | 3 |

##### Card 4 — High

| Field | Value |
|---|---|
| **Severity** | High (3 bars) — orange left border |
| **Asset** | MVBAC-43KC107B (VRU) |
| **Model** | FC - Long Period Without Preservation |
| **Start** | 03/04/2026 21:25 |
| **Duration** | 6d 20h 00m |
| **Occurrences** | 115 |

##### Card 5 — High

| Field | Value |
|---|---|
| **Severity** | High (3 bars) — orange left border |
| **Asset** | MVBAC-23KA401 (1ST STAGE MP) |
| **Model** | FC - Low Primary Seal Gas Injection Pressure |
| **Start** | 03/06/2026 17:22 |
| **Duration** | 4d 11h 52m |
| **Occurrences** | 6 |

> **Note:** The alarm for MVBAC-50PS101A (SWLP Water Treatment) is excluded here — it belongs to Production Liquid, not Production Gas.

---

## 5. Equipment Icon Specifications

### Motor Icon (SVG-based)

A simplified electric motor representation:

```
     ┌────────┐
     │        │╶╶╶╶  (shaft)
     │   M    │
     │        │
     └────────┘
         ●        ← status circle (12px)
```

- Rectangle body: 36x28px, rounded corners 4px
- Fill: `#1e2128`, Stroke: `#8a8f98` (1.5px)
- "M" letter centered in white (`#ffffff`, 12px font, bold)
- Small shaft line extending right (8px line)
- Status circle: 12px, positioned bottom-center, filled with status color

### Compressor Icon (SVG-based)

A simplified compressor/turbine representation:

```
     ╲          ╱
      ╲        ╱
       ╲      ╱
        ╲    ╱
         ╲  ╱
          ╲╱
         ●        ← status circle (12px)
```

- Trapezoid shape: wider at inlet (~36px), narrower at outlet (~18px), height 28px
- Fill: `#1e2128`, Stroke: `#8a8f98` (1.5px)
- Can optionally show "C" or stage number inside
- Status circle: 12px, positioned bottom-center, filled with status color

### Scrubber/Separator Icon (SVG-based)

A simplified vessel representation:

```
      ┌──────┐
      │      │
      │      │
      │      │
      └──────┘
         ●        ← status circle (12px)
```

- Vertical rectangle: 24x36px, rounded caps (like a pressure vessel)
- Fill: `#1e2128`, Stroke: `#8a8f98` (1.5px)
- Status circle: 12px, positioned bottom-center

### Flow Lines

- Horizontal/vertical connecting lines: 1px, `#8a8f98`
- Small arrow heads at the end indicating flow direction
- For spare equipment: dashed lines (`dash-array: 4,4`) instead of solid

---

## 6. Cross-Reference: Equipment to Alarms

This table maps equipment icons to alarm cards, explaining why certain icons show red status:

| Equipment Icon (Zone A) | Status | Alarm Cards Visible (Zone B) |
|---|---|---|
| MVBAC-23KA401 — HP Train 1, 1st Stage | RED | Card 1 (Bearing Overheating), Card 3 (Lube Oil Leakage), Card 5 (Seal Gas Pressure) |
| MVBAC-26KA301 — HP Train 3, 1st Stage | RED | Card 2 (Lube Oil High Temp) |
| MVBAC-43KC107B — VRU | Not on diagram (separate) | Card 4 (Long Period Without Preservation) |
| All other equipment | GREEN or GRAY (spare) | No associated alarm cards |

> When a user clicks a red equipment icon in Zone A, the page scrolls to Zone B and the relevant alarm cards in the right column should visually highlight (e.g., brief pulse animation or brighter border).

---

## 7. Global Styling

Same dark theme as the Overview page. See Overview spec Section 6 for full token reference.

Additional tokens for this page:

| Token | Value | Usage |
|---|---|---|
| **Section title** | White `#ffffff`, 16px, semibold | "LP Compression (2 x 100%)", etc. |
| **Section separator** | 1px solid `#2a2d35` | Between LP/MP and HP sections |
| **Equipment icon hover** | Border changes to status color, glow effect (`box-shadow: 0 0 8px`) | Visual feedback on hoverable icons |
| **Spare train label** | Gray text `#555555`, italic | "Spare" label next to spare trains |
| **Flow line color** | `#8a8f98` solid (active) / `#555555` dashed (spare) | Connecting lines between equipment |
| **Zone separator** | 2px solid `#2a2d35` with 32px vertical margin | Between Zone A and Zone B |

---

## 8. What Is NOT in This Page

| Excluded | Rationale |
|---|---|
| Bar charts (7-day accumulated) | Only on the Overview page; drilldown focuses on equipment + recent trends |
| Oil Production / Water Production trends | Not relevant to Production Gas — only gas and flare shown |
| Full P&ID (piping and instrumentation diagram) | Too complex for v1; simplified icons are sufficient |
| Interactive process values (pressures, flow rates on diagram) | Future enhancement; v1 focuses on equipment status visibility |
| Date picker | Fixed 48h preset for trends |

---

## 9. Build Checklist

- [ ] Create equipment icon SVG components (Motor, Compressor, Scrubber)
- [ ] Build status circle component with 4 color states
- [ ] Build LP/MP section diagram with flow lines and equipment icons
- [ ] Build HP section diagram (3 trains) with flow lines and equipment icons
- [ ] Apply mock status data to all equipment icons
- [ ] Build Gas Production trend chart (48h, reuse from Overview)
- [ ] Build Flare Gas trend chart (48h, reuse from Overview)
- [ ] Ensure Zone A left/right columns align vertically
- [ ] Build Zone B tabbed detail panel (Cases tab as default)
- [ ] Populate Cases tab with mock data (3 rows)
- [ ] Build alarm cards column (right 1/3 of Zone B)
- [ ] Populate with 5 filtered alarm cards
- [ ] Implement click-to-scroll from equipment icon to Zone B
- [ ] Apply Lighthouse dark theme throughout
- [ ] Verify scroll behavior and zone transitions

---

*Spec created: 2026-03-12*
*Status: DRAFT — Ready for review before implementation*
