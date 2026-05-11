# Requirements: Lighthouse Improvements - MVBAC Operations Frontend

**Defined:** 2026-04-11  
**Core Value:** Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## v1 Requirements

### Charts Composition Workflow

- [ ] **CHT-01**: User can open a Lighthouse-style selector modal from Add Chart and per-chart Actions.
- [ ] **CHT-02**: User can search assets by case-insensitive substring with result count capped at 50.
- [ ] **CHT-03**: User can filter item attributes and multi-select attributes with checkbox controls.
- [ ] **CHT-04**: User can only select attributes that have timeseries references from the API.
- [ ] **CHT-05**: User can build one chart with attributes from multiple assets and edit plotted attribute tags (add/remove).
- [ ] **CHT-06**: User can remove an already plotted attribute tag directly from the chart via a red `x` control next to each tag name.
- [ ] **CHT-07**: User can trigger asset search only when explicitly clicking Search (no continuous query-on-type requests).
- [ ] **CHT-08**: User can scroll through long asset and attribute lists in selector panes without clipped/locked content.
- [ ] **CHT-09**: User sees attribute/tag candidates only after selecting an asset, and attribute queries execute asset-first.
- [ ] **CHT-10**: User gets faster default chart load using 6-hour sampling resolution until adaptive resolution is implemented.
- [ ] **CHT-11**: User benefits from temporary local caching of recent chart data requests to reduce repeated load latency.
- [ ] **CHT-12**: User can remove a plotted tag without reloading all charts/page-level content.
- [ ] **CHT-13**: User can open chart Actions via hover and access at least one option (`Add new tags`) that opens selector modal.

### Workspace, Sidebar, and Chart Management

- [ ] **CHT-14**: User can manage page lifecycle actions (close/duplicate/delete) from compact controls, with rename/delete icon affordances shown on hover.
- [ ] **CHT-15**: User gets automatic page naming (`New Page N`) and deterministic duplicate naming for pages/charts.
- [ ] **CHT-16**: User can add charts up to a per-page limit and sees clear disabled feedback when the limit is reached.
- [ ] **CHT-17**: User sees newly added charts auto-scroll into view and chart card positions remain stable across updates.
- [ ] **CHT-18**: User can keep period/date-range state per page/tab (localStorage scope), including after reload.
- [ ] **CHT-19**: User can edit chart titles inline from hover affordance on the hovered card only while keeping chart headers visually minimal.
- [ ] **CHT-20**: User can navigate an equipment tree sidebar with case-insensitive equipment-name filtering while preserving full path visibility.
- [ ] **CHT-21**: User can see sensors for the selected equipment in a second sidebar grouped by category, using only attributes where `data_source == Timeseries`.
- [ ] **CHT-22**: User can right-click any sensor and execute `Plot to new chart`.
- [ ] **CHT-23**: User can right-click equipment and execute `Plot by category` and `Plot all sensors`.
- [ ] **CHT-24**: User can drag a sensor onto a chart header, body, or tag area to add that sensor to the chart.
- [ ] **CHT-25**: User can collapse both sidebars together, and sensor sidebar is shown only after an equipment is selected.
- [ ] **CHT-26**: User can create charts up to a per-page limit of 30; bulk plotting stops when this cap is reached.
- [ ] **CHT-27**: User sees checkbox state for sensors already plotted on the active page.
- [ ] **CHT-28**: User can keep existing plotted sensors visible without duplicate inserts when re-plotting from sidebar actions.
- [ ] **CHT-29**: User sees plotted tags in a fixed-height, scrollable chart table (single name column), with per-row remove action, preventing chart-card empty-space inflation on long tag lists.

### Performance and Frequency Controls

- [ ] **CHT-30**: User sees faster startup because preset-page loading no longer blocks on live timeseries validation.
- [ ] **CHT-31**: User can select page frequency mode with explicit options (`Auto`, `15m`, `1h`, `6h`, `1d`).
- [ ] **CHT-32**: User can rely on deterministic Auto frequency mapping based on selected date range.
- [ ] **CHT-33**: User can refresh charts manually while keeping current plotted data visible until new data arrives.
- [ ] **CHT-34**: User sees a top-level progress indicator whenever one or more charts are refreshing.
- [ ] **CHT-35**: User benefits from per-chart batched timeseries fetches so all chart tags can load through a single batch request.
- [ ] **CHT-36**: User gets responsive multi-chart updates through parallel refresh execution and stale-request guardrails.
- [ ] **CHT-37**: User gets improved repeated-load performance through frontend/backend caching of equivalent attribute/sensor/timeseries requests.

### Intel Events and Alarm Pages

- [ ] **CHT-38**: User can load Shape Intel events automatically on Charts open and filter events by selected equipment including subtree descendants.
- [ ] **CHT-39**: User can switch sidebar-2 between `Sensors` and `Events`, with `Sensors` as default tab.
- [ ] **CHT-40**: User can view event cards sorted newest-first with fields `data.status`, `event_type`, `data.severity`, `name`, `start_date`.
- [ ] **CHT-41**: User can filter event cards by `data.status` using all statuses present in loaded events.
- [ ] **CHT-42**: User can right-click an event card and create a new alarm page titled `[Alarm] {name}`.
- [ ] **CHT-43**: User can view an alarm header row above charts showing alarm fields plus `data.description`, `data.prognosis`, `data.status`, including warnings for missing fields.
- [ ] **CHT-44**: User can open alarm pages with date-range defaults based on event data (`trend_display_start_date`; fallback `end_date - 300 days`; fallback `now - 300 days`; end uses `end_date` or `now`).
- [ ] **CHT-45**: User can view one chart per matched `data.event_timeseries_attributes` item (exact-name-first matching) and see alarm span overlays in every chart from `start_date` to `end_date|now`.
- [ ] **CHT-46**: User can view alarm information row with Lighthouse-like hierarchy (title, asset/id chips, status/severity chips, start and elapsed emphasis).
- [ ] **CHT-47**: User can view `data.prognosis` and `data.description` rendered as markdown exactly from payload (no fixed section parser assumptions).
- [ ] **CHT-48**: User can view markdown-rendered alarm text through a sanitized rendering path to prevent unsafe HTML/script injection.
- [ ] **CHT-49**: User can collapse/expand long alarm narrative blocks and access raw-text fallback when markdown render is unavailable.
- [ ] **CHT-50**: User can view explicit missing-field warnings and deterministic fallback labels (`N/A`) for absent alarm metadata.
- [ ] **CHT-51**: User can read alarm-row content on current desktop widths without clipping critical metadata or breaking chart layout.

### Advanced Chart Interaction QoL

- [ ] **CHT-52**: User can zoom by marquee drag on a chart, with modifier locks: `Ctrl+drag` zooms X only and `Alt+drag` zooms Y only.
- [ ] **CHT-53**: User can pan horizontally with `Shift+drag` while keeping Y-axis locked, and panning is clamped to loaded data range.
- [ ] **CHT-54**: User can zoom with `Ctrl+wheel` (X) and `Alt+wheel` (Y) inside chart area, and browser/page zoom is prevented while pointer is over the chart (including chart-loading state).
- [ ] **CHT-55**: User can trigger synced X zoom across all charts in active page with `Ctrl+Shift+drag`, with gray preview span rendered in every chart during selection.
- [ ] **CHT-56**: User can reset chart zoom/pan via explicit `Reset View` action in chart `Actions`.
- [ ] **CHT-57**: User can access a per-chart `?` help icon near refresh with concise shortcuts for drag zoom, scroll zoom, pan, and synced zoom.
- [ ] **CHT-58**: User can auto-scale Y using a control at top of Y-axis so visible data fills vertical chart area.
- [ ] **CHT-59**: User can toggle normalization from chart `Actions` to scale visible traces to `0..1`, while tooltip shows both original and normalized values.
- [ ] **CHT-60**: User can enable split Y-axis overlay with left-side, color-matched axis labels for each trace.
- [ ] **CHT-61**: User sees split Y-axis option disabled with explanatory tooltip whenever chart has more than 4 sensors.
- [ ] **CHT-62**: If split Y-axis is active and plotted sensors exceed 4, split mode auto-disables and user sees a clear notice.
- [ ] **CHT-63**: Charts with no currently visible series still receive synced X-domain updates so future/late-loaded data aligns with page zoom context.

### Continuity and Incremental Loading

- [ ] **CHT-64**: User can interact with the equipment tree (including row click on expandable items, expander toggle, filter apply, context-menu plot actions, and selection changes) without losing current equipment-sidebar scroll position.
- [ ] **CHT-65**: User can interact with the sensor/event sidebar (including right-click plot actions, drag-and-drop plotting to charts, select/plot/drag/tab switch) without sidebar scroll resetting to top.
- [ ] **CHT-66**: User always sees chart canvas and X-axis context (page range or current zoom range) even when chart has no loaded timeseries yet.
- [ ] **CHT-67**: User sees a non-destructive loading state where existing plotted data remains visible while fetching additional tags/refreshes, with loading indicator shown above the chart.
- [ ] **CHT-68**: User can add a new sensor to a populated chart without existing traces being cleared before new tag data arrives.
- [ ] **CHT-69**: User can change chart frequency (for example `6h` to `1h`) while keeping previous frequency data visible until new frequency data is ready.
- [ ] **CHT-70**: User can trigger incremental tag loading where only missing tags are fetched and merged into current chart state.
- [ ] **CHT-71**: User can benefit from per-tag frontend timeseries caching and in-flight deduplication so repeated tag operations avoid redundant requests.
- [ ] **CHT-72**: User can get improved repeated-load performance from backend timeseries caching for equivalent item/attribute/date/frequency requests.
- [ ] **CHT-73**: User can rely on latest-request-wins guardrails and accurate loading/no-data messaging under rapid chart interactions.

### Cross-Chart Hover and Pinned Cursors

- [ ] **CHT-74**: User sees a synchronized hover line across all visible charts while moving pointer on one chart.
- [ ] **CHT-75**: User sees an active-chart hover tooltip using UTC timestamp and nearest-point values for visible traces only.
- [ ] **CHT-76**: User can create pinned cursors with single click up to a page-global cap of 5, and click-drag does not create pins.
- [ ] **CHT-77**: User sees pinned-cursor tooltips with an opaque timestamp header and color-matched value rows.
- [ ] **CHT-78**: User can drag pinned cursors horizontally to reposition comparison points.
- [ ] **CHT-79**: User can remove a pinned cursor by dragging it completely off left or right chart boundary.
- [ ] **CHT-80**: User sees explicit horizontal-move affordance (`ew-resize`) when hovering draggable cursor areas.
- [ ] **CHT-81**: User can pan from a bottom plot band near the X-axis, with hand-cursor feedback and drag-to-pan behavior.
- [ ] **CHT-82**: User can use `Reset Zoom` and `Reset Zoom All Plots` without losing pinned cursors.
- [ ] **CHT-83**: User keeps cursor/hover synchronization coherent with chart zoom-domain updates on the active page.

### Sensor Context Enrichment and Custom Alarm Thresholds

- [ ] **CHT-84**: User can choose default chart-table columns from one global picker, with runtime selection restored from localStorage and repo defaults loaded from a source-controlled JSON manifest.
- [ ] **CHT-85**: User can use a chart sensor table that scrolls vertically and horizontally inside the table area only, while keeping sticky header and sticky first column visible.
- [ ] **CHT-86**: User can view enriched sensor context under each chart from attributes and sub_attributes (including thresholds and metadata), with `N/A` shown for unavailable values.
- [ ] **CHT-87**: User sees `last value` as the last point in the current chart window and `-1d AVG` computed only from timeseries data.
- [ ] **CHT-88**: User gets deterministic duplicate sub_attribute normalization with tie-break order: non-null value, then `is_external=false`, then newest `updated_at`.
- [ ] **CHT-89**: User can persist custom alarms in SQLite (`custom-alarms` store) keyed only by `attribute_id`, including `created_date`, `updated_date`, `version_n`, `user=unknown`, and version history capped at 20.
- [ ] **CHT-90**: User can right-click any sensor and open `Create custom alarms`, prefilled with available threshold context and editable `Custom-Hi` / `Custom-Lo`.
- [ ] **CHT-91**: User can treat `Custom-Hi` and `Custom-Lo` as separate selectable threshold columns and line candidates that coexist with system thresholds.
- [ ] **CHT-92**: User gets one threshold toggle per threshold column in each sensor row; toggling creates a derived table row (`{Sensor Name} | {ThresholdName}`) with `N/A` for unsupported context fields.
- [ ] **CHT-93**: User sees threshold overlays off by default and, on single-tag charts only, rendered with locked style mapping (`HiHi/LoLo` red dashed, `Hi/Lo` yellow dashed).
- [ ] **CHT-94**: User sees all threshold overlays removed immediately when a second tag is added to a chart, and overlays remain off until manual re-enable after returning to one tag.
- [ ] **CHT-95**: User can display base sensor unit and threshold unit independently; unit mismatch never blocks table rendering or threshold-line visualization.

## v2 Requirements

### Data and Platform

- **DAT-01**: User can inspect alarm-recognition filtering behavior against production-grade payload variability (schema drift, missing keys, nested fields).
- **DAT-02**: User can configure reusable filter presets for event/alarm triage scenarios.

### Coverage Expansion

- **EXP-01**: User can apply the same Charts + alarm workflow to additional ship groups after MVBAC stabilization.
- **EXP-02**: User can compare alarm/event behavior across group contexts using the same interaction contracts.

### Personalization

- **PERS-01**: User can save personal chart/event layout preferences per workspace.
- **PERS-02**: User can define reusable page templates for recurring alarm investigations.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rebuild of unrelated legacy pages | Current milestone is focused on Charts and alarm-recognition workflow quality |
| Full multi-surface product expansion | Scope is intentionally constrained to reduce risk and improve delivery speed |
| New AI/copilot actions | Chart usability and alarm triage are higher-priority operator needs |
| Multi-ship rollout in this cycle | MVP remains constrained to MVBAC for controlled iteration |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHT-01 | Phase 2.1 | Completed |
| CHT-02 | Phase 2.1 | Completed |
| CHT-03 | Phase 2.1 | Completed |
| CHT-04 | Phase 2.1 | Completed |
| CHT-05 | Phase 2.1 | Completed |
| CHT-06 | Phase 2.1 | Completed |
| CHT-07 | Phase 2.2 | Completed |
| CHT-08 | Phase 2.2 | Completed |
| CHT-09 | Phase 2.2 | Completed |
| CHT-10 | Phase 2.2 | Completed |
| CHT-11 | Phase 2.2 | Completed |
| CHT-12 | Phase 2.2 | Completed |
| CHT-13 | Phase 2.2 | Completed |
| CHT-14 | Phase 3 | Completed |
| CHT-15 | Phase 3 | Completed |
| CHT-16 | Phase 3 | Completed |
| CHT-17 | Phase 3 | Completed |
| CHT-18 | Phase 3 | Completed |
| CHT-19 | Phase 3 | Completed |
| CHT-20 | Phase 4 | Completed |
| CHT-21 | Phase 4 | Completed |
| CHT-22 | Phase 4 | Completed |
| CHT-23 | Phase 4 | Completed |
| CHT-24 | Phase 4 | Completed |
| CHT-25 | Phase 4 | Completed |
| CHT-26 | Phase 4 | Completed |
| CHT-27 | Phase 4 | Completed |
| CHT-28 | Phase 4 | Completed |
| CHT-29 | Phase 4 | Completed |
| CHT-30 | Phase 5 | Completed |
| CHT-31 | Phase 5 | Completed |
| CHT-32 | Phase 5 | Completed |
| CHT-33 | Phase 5 | Completed |
| CHT-34 | Phase 5 | Completed |
| CHT-35 | Phase 5 | Completed |
| CHT-36 | Phase 5 | Completed |
| CHT-37 | Phase 5 | Completed |
| CHT-38 | Phase 6 | Pending |
| CHT-39 | Phase 6 | Pending |
| CHT-40 | Phase 6 | Pending |
| CHT-41 | Phase 6 | Pending |
| CHT-42 | Phase 6 | Pending |
| CHT-43 | Phase 6 | Pending |
| CHT-44 | Phase 6 | Pending |
| CHT-45 | Phase 6 | Pending |
| CHT-46 | Phase 6.1 | Pending |
| CHT-47 | Phase 6.1 | Pending |
| CHT-48 | Phase 6.1 | Pending |
| CHT-49 | Phase 6.1 | Pending |
| CHT-50 | Phase 6.1 | Pending |
| CHT-51 | Phase 6.1 | Pending |
| CHT-52 | Phase 6.2 | Pending |
| CHT-53 | Phase 6.2 | Pending |
| CHT-54 | Phase 6.2 | Pending |
| CHT-55 | Phase 6.2 | Pending |
| CHT-56 | Phase 6.2 | Pending |
| CHT-57 | Phase 6.2 | Pending |
| CHT-58 | Phase 6.2 | Pending |
| CHT-59 | Phase 6.2 | Pending |
| CHT-60 | Phase 6.2 | Pending |
| CHT-61 | Phase 6.2 | Pending |
| CHT-62 | Phase 6.2 | Pending |
| CHT-63 | Phase 6.2 | Pending |
| CHT-64 | Phase 6.2.1 | Pending |
| CHT-65 | Phase 6.2.1 | Pending |
| CHT-66 | Phase 6.2.1 | Pending |
| CHT-67 | Phase 6.2.1 | Pending |
| CHT-68 | Phase 7 | Completed |
| CHT-69 | Phase 7 | Completed |
| CHT-70 | Phase 7 | Completed |
| CHT-71 | Phase 7 | Completed |
| CHT-72 | Phase 7 | Completed |
| CHT-73 | Phase 7 | Completed |
| CHT-74 | Phase 8 | Pending |
| CHT-75 | Phase 8 | Pending |
| CHT-76 | Phase 8 | Pending |
| CHT-77 | Phase 8 | Pending |
| CHT-78 | Phase 8 | Pending |
| CHT-79 | Phase 8 | Pending |
| CHT-80 | Phase 8 | Pending |
| CHT-81 | Phase 8 | Pending |
| CHT-82 | Phase 8 | Pending |
| CHT-83 | Phase 8 | Pending |
| CHT-84 | Phase 8.1 | Pending |
| CHT-85 | Phase 8.1 | Pending |
| CHT-86 | Phase 8.1 | Pending |
| CHT-87 | Phase 8.1 | Pending |
| CHT-88 | Phase 8.1 | Pending |
| CHT-89 | Phase 8.1 | Pending |
| CHT-90 | Phase 8.1 | Pending |
| CHT-91 | Phase 8.1 | Pending |
| CHT-92 | Phase 8.1 | Pending |
| CHT-93 | Phase 8.1 | Pending |
| CHT-94 | Phase 8.1 | Pending |
| CHT-95 | Phase 8.1 | Pending |

**Coverage:**
- v1 requirements: 95 total
- Mapped to phases: 95
- Unmapped: 0

---
*Requirements defined: 2026-04-11*  
*Last updated: 2026-05-07 after scroll-continuity clarification*
