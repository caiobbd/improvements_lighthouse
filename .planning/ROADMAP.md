# Roadmap: Lighthouse Improvements - MVBAC Operations Frontend

## Overview

This roadmap ships a focused MVBAC frontend MVP in iterative charts-first phases: establish a consistent shell and design baseline, harden the operational Overview dashboard, deliver selector and multi-asset chart composition, improve chart UX/performance from first-user testing, and then simplify/polish Charts interactions using Lighthouse reference patterns.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Baseline and Shell Alignment** - Align shared layout, navigation, and theme foundations across pages. (completed 2003-04-12)
- [x] **Phase 2: Overview Dashboard Hardening** - Finalize KPI chart behavior and alarm triage UX on Overview. (completed 2026-04-19)
- [x] **Phase 2.1: Charts Selector and Multi-Asset Tagging (INSERTED)** - Add Lighthouse-style selector workflow and per-chart tags for API-backed multi-asset plotting. (completed 2026-04-19)
- [x] **Phase 2.2: Charts UX and Performance Hardening (INSERTED)** - Apply first-test feedback for selector query control, scroll behavior, chart-load performance, and action-menu ergonomics. (completed 2026-04-19)
- [x] **Phase 3: Charts UX simplification and interaction polish from Lighthouse reference** - Reduce chart-page clutter and align tab/chart interactions with reference behavior patterns. (completed 2026-04-13)
- [x] **Phase 4: Charts dual-sidebar equipment tree and sensor plotting interactions** - Add equipment tree navigation, category-grouped sensors, and direct sensor-to-chart plotting actions. (completed 2026-04-16)
- [x] **Phase 5: Optimizing for performance and speed** - Improve startup latency, chart refresh responsiveness, and perceived loading speed. (completed 2026-04-19)
- [ ] **Phase 6: Intel Events Integration** - Integrate Shape Intel events into sidebar workflows and alarm-specific chart pages.
- [ ] **Phase 6.1: Alarm Row Parity with Lighthouse Full Alarm Window (INSERTED)** - Align alarm information row layout and markdown payload rendering with Lighthouse alarm window behavior.
- [ ] **Phase 6.2: Advanced Chart Interaction QoL (INSERTED)** - Add precision zoom/pan, axis controls, and multi-trace readability improvements for chart analysis.
- [ ] **Phase 6.2.1: Sidebar scroll stability and non-disruptive chart loading UX (INSERTED)** - Preserve sidebar continuity and keep chart canvas/data visible through loading transitions.
- [ ] **Phase 7: Timeseries incremental loading and persistence** - Preserve plotted data during incremental updates and reduce redundant timeseries fetches across frontend and backend.

## Phase Details

### Phase 1: Baseline and Shell Alignment
**Goal**: Deliver a stable Charts shell with consistent theme tokens, reliable interactions, and at least one backend-seeded preset chart that renders live data.
**Depends on**: Nothing (first phase)
**Requirements**: OVW-01, UXQ-01, UXQ-05, UXQ-06
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can open Overview and Production Gas with the same baseline shell and sidebar behavior.
  2. User sees consistent Lighthouse dark-theme styling, spacing, and typography across both pages.
  3. User can navigate between Overview and Production Gas from sidebar links without navigation regressions.
  4. User can open Charts and immediately see at least one pre-saved chart rendering non-empty live API timeseries data.
**Plans**: 4 plans

Plans:
- [x] 01-01: Standardize shared page shell (header, sidebar, base grid containers).
- [x] 01-02: Consolidate dark-theme tokens and spacing rules in shared stylesheet.
- [x] 01-03: Validate and polish sidebar navigation state handling between pages.
- [x] 01-04: Guarantee live API-backed preset chart rendering in Charts tab.

### Phase 2: Overview Dashboard Hardening
**Goal**: Make the Overview page operationally reliable for KPI monitoring and alarm triage.
**Depends on**: Phase 1
**Requirements**: OVW-02, OVW-03, OVW-04, OVW-05, UXQ-03, UXQ-04
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can read 7-day accumulated KPI bars for Oil, Gas, Water, and Flare with expected labels and units.
  2. User can read 48-hour trend charts with expected series and plan lines where specified.
  3. User can inspect alarm cards ordered by severity/urgency and open alarm detail interactions.
  4. User can use tooltips/expanded chart views to inspect values for decision making.
**Plans**: 4 plans

Plans:
- [x] 02-01: Finalize chart datasets, legends, axes, and unit labels for all Overview KPIs.
- [x] 02-02: Implement/validate trend plan overlays and chart interaction affordances.
- [x] 02-03: Harden alarm card ordering, styling, and detail modal behavior.
- [x] 02-04: Verify mock data coherence across all Overview charts and alarm components.

### Phase 2.1: Charts Selector and Multi-Asset Tagging (INSERTED)
**Goal**: Deliver Lighthouse-style chart composition where users can search assets, multi-select timeseries attributes, and manage chart tags directly from Charts interactions.
**Depends on**: Phase 2
**Requirements**: CHT-01, CHT-02, CHT-03, CHT-04, CHT-05, CHT-06
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can open a selector modal from Add Chart and chart Actions with Lighthouse-like two-pane interaction.
  2. User can search assets by case-insensitive substring and receive capped result sets (max 50).
  3. User can filter attributes for the selected asset and multi-select only timeseries-capable attributes.
  4. User can see per-chart tag chips (attribute labels) with a red `x` on each chip to remove tags directly from the plot.
  5. User can plot selected attributes (including from multiple assets) using the active page time filter via live API calls.
**Plans**: 4 plans

Plans:
- [x] 02.1-01: Add backend endpoints/contracts for asset search (substring, cap 50), item resolution, and timeseries-only attributes.
- [x] 02.1-02: Build selector modal UX (left assets list, right attribute list, independent filters, checkbox multi-select).
- [x] 02.1-03: Add per-chart tag chip management with red `x` remove control and wire Add Chart/Actions to selector flow.
- [x] 02.1-04: Implement multi-asset timeseries retrieval + rendering integration and verify with real API data.

### Phase 2.2: Charts UX and Performance Hardening (INSERTED)
**Goal**: Improve Charts responsiveness and interaction ergonomics based on first local-user testing without changing the core Phase 2.1 feature contract.
**Depends on**: Phase 2.1
**Requirements**: CHT-07, CHT-08, CHT-09, CHT-10, CHT-11, CHT-12, CHT-13
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can trigger asset search only on explicit Search action (no continuous query-on-type).
  2. User can scroll and browse long asset and attribute lists reliably inside selector panes.
  3. User only loads and sees attribute/tag candidates after selecting an asset.
  4. User gets faster initial chart loads with default 6-hour sampling and temporary client caching for repeated requests.
  5. User can remove a tag without full page-level rerender and can use chart Actions hover menu with at least "Add new tags".
**Plans**: 4 plans

Plans:
- [x] 02.2-01: Refactor selector search UX to explicit submit flow and ensure robust scroll/list behavior for assets and attributes.
- [x] 02.2-02: Enforce asset-first attribute querying and selector state behavior (no eager attribute prefetch before asset click).
- [x] 02.2-03: Improve chart load performance via default 6h sampling and temporary response caching strategy.
- [x] 02.2-04: Optimize chart-level updates for tag removal and restore Actions hover menu with "Add new tags" entry.

### Phase 3: Charts UX simplification and interaction polish from Lighthouse reference

**Goal**: Simplify the Charts workspace so primary actions are faster, less cluttered, and visually consistent with Lighthouse reference interaction patterns.
**Depends on**: Phase 2.2
**Requirements**: CHT-14, CHT-15, CHT-16, CHT-17, CHT-18, CHT-19
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User sees fewer always-visible controls and can access page-level actions (`duplicate/close/delete`) from a compact actions surface instead of persistent buttons.
  2. User gets automatic page naming (`New Page N`) and deterministic duplicate naming without manual cleanup.
  3. User can add charts until a defined page limit and receives clear disabled-state feedback when the limit is reached.
  4. User sees newly added charts auto-scroll into view and chart card positioning remains stable and consistent.
  5. User can edit chart titles inline from hover affordance and maintain cleaner chart headers.
  6. User keeps page-specific period/date-range state when switching tabs and after reload.
**Plans**: 4 plans

Plans:
- [x] 03-01: Simplify tab/workspace controls and move page actions into compact actions menu.
- [x] 03-02: Implement deterministic naming and chart-cap feedback (`New Page N`, max charts per page, disabled add states).
- [x] 03-03: Stabilize chart layout behavior (consistent card positioning and auto-scroll to new chart).
- [x] 03-04: Add inline chart-title edit on hover and per-page period/date persistence.

### Phase 4: Charts dual-sidebar equipment tree and sensor plotting interactions

**Goal:** Deliver Lighthouse-style equipment + sensor sidebars where operators can browse tree assets, inspect timeseries sensors by category, and plot sensors to charts through right-click and drag-and-drop actions.
**Depends on:** Phase 3
**Requirements**: CHT-20, CHT-21, CHT-22, CHT-23, CHT-24, CHT-25, CHT-26, CHT-27, CHT-28, CHT-29
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can filter the equipment tree by equipment-name substring (case-insensitive) while preserving full hierarchy/path context in the visible tree.
  2. User can select one equipment and view sidebar-2 sensors grouped by category, showing only timeseries sensors from API item attributes.
  3. User can right-click a sensor and plot it to a new chart, and can right-click equipment for `Plot by category` or `Plot all sensors`.
  4. User can drag any sensor from sidebar-2 into a target chart header/body/tag zone to append that sensor tag to the chart.
  5. User sees checkbox state in sidebar-2 for sensors already plotted on the active page.
  6. User can collapse/expand navigation sidebars together, and sensor sidebar only appears once an equipment is selected.
  7. Bulk plotting respects the chart cap of 30, creates one chart per sensor for `Plot all sensors`, and stops cleanly when limit is reached.
  8. User sees chart tags in a fixed-height, scrollable table so long tag lists do not grow card height, and can remove tags directly from each table row.
**Plans:** 4/4 plans complete

Plans:
- [x] 04-01: Add backend contracts for equipment tree and category-grouped timeseries sensors from item attributes.
- [x] 04-02: Build dual-sidebar shell (equipment tree + conditional sensor sidebar), filter behavior, and synchronized collapse toggle.
- [x] 04-03: Implement right-click plotting actions and active-page plotted-sensor checkbox state with 30-chart cap enforcement.
- [x] 04-04: Implement drag-and-drop sensor-to-chart interactions (header/body/tag targets) and finalize UX/performance verification.
- [x] 04-05: Convert chart tag chips into fixed-height, scrollable tag table with inline remove action per row.

### Phase 5: Optimizing for performance and speed

**Goal:** Improve startup and chart refresh performance with explicit frequency control, batched timeseries fetching, and cache-aware rendering.
**Depends on:** Phase 4
**Requirements**: CHT-30, CHT-31, CHT-32, CHT-33, CHT-34, CHT-35, CHT-36, CHT-37
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User sees faster startup because preset pages no longer block on live timeseries validation.
  2. User can use page frequency control (`Auto`, `15m`, `1h`, `6h`, `1d`) and Auto follows date-range protocol.
  3. User can refresh charts manually and keep current plotted data visible until new data arrives.
  4. User sees a top global progress bar whenever one or more charts are refreshing.
  5. Chart tags on the same chart fetch through one batch API call and multiple charts refresh in parallel.
  6. Equipment tree payload is lean/compressed and attribute/sensor lookups reuse TTL cache for repeated requests.
**Plans:** 4/4 plans complete

Plans:
- [x] 05-01: Remove blocking preset validation on `/pages`, parallelize frontend bootstrap, and optimize equipment-tree payload/compression.
- [x] 05-02: Add page-level frequency mode (`auto|manual`) with user selector and Auto date-range mapping (`<=1d:15m`, `<=7d:1h`, `<=30d:6h`, `>30d:1d`).
- [x] 05-03: Implement per-chart timeseries batching (`/timeseries-batch`), stale-request guards, and keep-previous-data refresh behavior.
- [x] 05-04: Add in-flight dedupe + cache invalidation on manual refresh, backend TTL caches for attributes/sensors, and verification baseline metrics.

### Phase 6: Intel Events Integration

**Goal:** Add Shape Intel event workflows to Charts so operators can browse equipment-filtered alarms and generate alarm-specific pages with contextual metadata and time-window overlays.
**Depends on:** Phase 5
**Requirements**: CHT-38, CHT-39, CHT-40, CHT-41, CHT-42, CHT-43, CHT-44, CHT-45
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User sees Shape Intel events loaded automatically when Charts opens (no manual refresh button), then filtered by selected equipment including subtree descendants.
  2. User can switch sidebar-2 between `Sensors` and `Events`, with default tab remaining `Sensors`.
  3. User can view events as cards sorted by newest first with fields `data.status`, `event_type`, `data.severity`, `name`, `start_date`, and can filter cards by `data.status` using all available status values.
  4. User can right-click an event card and select `Plot alarm in new page`, which always creates a new page named `[Alarm] {name}`.
  5. Alarm pages render an alarm header row above the chart grid showing event card data plus `data.description`, `data.prognosis`, `data.status`, and warnings for missing fields.
  6. Alarm page date range starts at `data.trend_display_start_date`; if missing/invalid, fallback to `end_date - 300 days`, then `now - 300 days`; alarm end uses `end_date` or `now` when missing.
  7. Alarm page generation creates one chart per resolved attribute from `data.event_timeseries_attributes`, matching by exact name first for the event item.
  8. Every chart on an alarm page displays a span overlay from alarm `start_date` to alarm `end_date` (or `now` when missing).
**Plans:** 0/4 plans executed

Plans:
- [ ] 06-01: Add backend Shape Intel events ingestion, normalization, subtree filtering, and API contracts.
- [ ] 06-02: Add Sidebar-2 `Events` tab UX with status filtering and event card rendering.
- [ ] 06-03: Implement `Plot alarm in new page` flow, alarm-page metadata row, and fallback window logic.
- [ ] 06-04: Implement event-attribute chart generation and alarm-span overlays on all alarm charts.

### Phase 06.2: Advanced Chart Interaction QoL (INSERTED)

**Goal:** Deliver robust chart-interaction ergonomics (zoom, pan, axis controls, overlays) so operators can investigate anomalies quickly without leaving the Charts page context.
**Requirements**: CHT-52, CHT-53, CHT-54, CHT-55, CHT-56, CHT-57, CHT-58, CHT-59, CHT-60, CHT-61, CHT-62, CHT-63
**Depends on:** Phase 6.1
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can marquee-zoom with axis locks (`Ctrl` for X-only, `Alt` for Y-only) and can pan horizontally with `Shift+drag` while Y remains locked.
  2. User can use `Ctrl+wheel` and `Alt+wheel` inside chart area (including while chart is loading) without triggering browser/page zoom.
  3. User can apply synced X zoom across all charts on the active page via `Ctrl+Shift+drag` and sees gray preview spans on every affected chart during selection.
  4. User can reset view by double-clicking chart or via explicit `Reset View` action.
  5. User can auto-scale Y and can normalize traces to `0..1`; tooltip shows normalized + original values when normalization is active.
  6. User can enable split Y-axis only up to 4 sensors (left-side color-matched labels), sees disabled action + tooltip when unavailable, and split mode auto-disables with notice if sensor count later exceeds 4.
  7. User can clamp pan to loaded data range and charts with no current series still receive synced X domain updates for future data.
**Plans:** 4 plans

Plans:
- [ ] 06.2-01: Build interaction engine and input arbitration (modifier map, browser-zoom suppression, and chart-local state).
- [ ] 06.2-02: Implement marquee/wheel zoom, shift-pan, synced X zoom preview+apply, and reset controls.
- [ ] 06.2-03: Implement Y auto-scale, normalization with dual-value tooltip, and split-Y mode with 4-sensor guardrails.
- [ ] 06.2-04: Harden UX/performance and verify cross-chart behavior, empty-chart sync handling, and regression safety.

### Phase 06.2.1: Sidebar scroll stability and non-disruptive chart loading UX (INSERTED)

**Goal:** Eliminate disruptive scroll jumps in both sidebars and make chart loading states non-destructive so users keep visual/context continuity during interactions.
**Requirements**: CHT-64, CHT-65, CHT-66, CHT-67
**Depends on:** Phase 6.2
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can expand/select/filter/plot/drag from Equipment sidebar without automatic jump back to top.
  2. User can interact in Sensors/Events sidebar (plot/drag/select/tabs) while preserving current sidebar scroll position.
  3. User sees chart canvas with X-axis context even when no timeseries is loaded yet (empty-state graph, not blank loading screen).
  4. User sees loading indicator for refresh/add-tag flows while existing chart data remains visible until fresh data replaces it.
  5. User can add a new sensor to a chart and observe continuous UX: existing series stay visible, loading indicator appears, then new series is added on completion.
**Plans:** 3 plans

Plans:
- [ ] 06.2.1-01: Implement sidebar scroll-anchor persistence across rerenders and interaction flows (equipment + sensors/events panes).
- [ ] 06.2.1-02: Refactor chart loading/render pipeline to always keep chart canvas visible, preserve existing series during fetch, and show top loading overlay.
- [ ] 06.2.1-03: Harden interaction edge-cases/regressions (drag-drop, plot actions, zoom-domain continuity) and capture verification notes for UAT.

### Phase 06.1: Alarm row parity with Lighthouse full alarm window (INSERTED)

**Goal:** Rework alarm-page information row to mirror Lighthouse alarm-window hierarchy while rendering alarm narrative content directly from payload markdown.
**Requirements**: CHT-46, CHT-47, CHT-48, CHT-49, CHT-50, CHT-51
**Depends on:** Phase 6
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User sees alarm info row hierarchy close to Lighthouse reference (title, chips, id/status/severity/start/elapsed emphasis).
  2. User sees `data.prognosis` and `data.description` rendered as markdown (bullets, bold, breaks) without fixed section parsing assumptions.
  3. User does not see unsafe HTML injection from payload markdown because rendering path is sanitized.
  4. User can collapse/expand long alarm narrative content and optionally view raw fallback text when markdown rendering fails.
  5. User sees missing-field warnings and consistent fallback labels (`N/A`) instead of empty blocks.
  6. Alarm row remains responsive and readable across the current desktop usage widths.
**Plans:** 0/4 plans executed

Plans:
- [ ] 06.1-01: Define alarm-row data contract and helper formatting utilities (elapsed, chips, warning normalization).
- [ ] 06.1-02: Implement Lighthouse-like alarm row shell layout and responsive styling parity.
- [ ] 06.1-03: Implement sanitized markdown rendering for prognosis/description with raw-text fallback path.
- [ ] 06.1-04: Add collapse/expand interactions, polish parity details, and verify with reference payload examples.

### Phase 7: Timeseries incremental loading and persistence

**Goal:** Fix incremental tag/frequency update regressions so existing chart data remains visible while only missing data is fetched, merged, and rendered.
**Requirements**: CHT-68, CHT-69, CHT-70, CHT-71, CHT-72, CHT-73
**Depends on:** Phase 6
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User can add a new sensor to an already-loaded chart without clearing previously plotted lines.
  2. User can change frequency (for example `6h` to `1h`) and keep prior frequency data visible until new frequency data is ready.
  3. User sees incremental fetch behavior where existing tags are reused from cache and only missing tags are fetched.
  4. Backend avoids repeated equivalent timeseries computations within TTL and improves repeated batch responsiveness.
  5. User sees consistent loading/no-data messaging with latest-request-wins guardrails under rapid interactions.
**Plans:** 4/4 plans executed

Plans:
- [x] 07-01: Refactor chart lifecycle to prevent full remount and preserve runtime series during tag/frequency updates.
- [x] 07-02: Implement frontend per-tag cache, in-flight dedupe, and incremental merge fetch pipeline.
- [x] 07-03: Add backend timeseries TTL cache and optimize `/timeseries-batch` for repeated loads.
- [x] 07-04: Add verification guardrails for non-destructive loading UX, latest-request handling, and performance deltas.

### Phase 8: Cross-chart hover and pinned cursors

**Goal:** Deliver synchronized hover and pinned time cursors across all visible charts so operators can compare trace values at the same timestamp without losing existing zoom/pan workflows.
**Requirements**: CHT-74, CHT-75, CHT-76, CHT-77, CHT-78, CHT-79, CHT-80, CHT-81, CHT-82, CHT-83
**Depends on:** Phase 7
**UI hint**: yes
**Success Criteria** (what must be TRUE):
  1. User sees a synchronized hover line on every visible chart, while the active chart shows a transient hover tooltip.
  2. Hover tooltip uses UTC timestamp and nearest-point values only (no interpolation), listing visible traces only.
  3. User can create pinned cursors with single click up to a page-global cap of 5, and click-drag does not create pins.
  4. Pinned cursors show opaque tooltips with timestamp header and color-matched value rows.
  5. User can drag pinned cursors to reposition them, and dragging fully off left/right edge removes the cursor and frees a slot.
  6. Hovering draggable cursor area shows horizontal move affordance (`ew-resize`).
  7. Bottom 20% plot band (above x-axis) acts as pan zone with hand cursor and drag-to-pan equivalent to `Shift+drag`.
  8. `Reset Zoom` and `Reset Zoom All Plots` keep pinned cursors in place while only resetting domains.
**Plans:** 4 plans

Plans:
- [ ] 08-01: Add page-global cursor state and interaction arbitration (click vs drag) across chart sync bus.
- [ ] 08-02: Implement synchronized hover line plus transient/pinned tooltip rendering with UTC nearest-point values.
- [ ] 08-03: Implement pinned cursor drag-reposition/removal and bottom-band pan ergonomics with cursor affordances.
- [ ] 08-04: Integrate with reset/sync flows, harden regressions, and document cursor interactions.
