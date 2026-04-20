# Requirements: Lighthouse Improvements - MVBAC Operations Frontend

**Defined:** 2026-04-11
**Core Value:** Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## v1 Requirements

### Overview Dashboard

- [ ] **OVW-01**: User can view the MVBAC overview in a 3-column layout while keeping the simplified left ship tree sidebar.
- [ ] **OVW-02**: User can view 7-day daily accumulated charts for Oil, Gas, Water, and Flare with the specified series and units.
- [ ] **OVW-03**: User can view 48-hour trend charts for Oil, Gas, Water, and Flare with plan/target overlays where defined.
- [ ] **OVW-04**: User can view active alarm cards sorted by severity and urgency with visual severity cues.
- [ ] **OVW-05**: User can interact with alarms (hover state and detail drill-in) from the overview page.

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
- [ ] **CHT-13**: User can open chart Actions via hover and access at least one option ("Add new tags") that opens selector modal.
- [ ] **CHT-14**: User can manage page lifecycle actions (close/duplicate/delete) from compact controls, with rename/delete icon affordances shown on hover.
- [ ] **CHT-15**: User gets automatic page naming (`New Page N`) and deterministic duplicate naming for pages/charts.
- [ ] **CHT-16**: User can add charts up to a per-page limit of 12 and sees clear disabled feedback when the limit is reached.
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
- [ ] **CHT-51**: User can read alarm-row content on current desktop widths without clipping-critical metadata or breaking chart layout.
- [ ] **CHT-52**: User can zoom by marquee drag on a chart, with modifier locks: `Ctrl+drag` zooms X only and `Alt+drag` zooms Y only.
- [ ] **CHT-53**: User can pan horizontally with `Shift+drag` while keeping Y-axis locked, and panning is clamped to loaded data range.
- [ ] **CHT-54**: User can zoom with `Ctrl+wheel` (X) and `Alt+wheel` (Y) inside chart area, and browser/page zoom is prevented while pointer is over the chart (including chart-loading state).
- [ ] **CHT-55**: User can trigger synced X zoom across all charts in active page with `Ctrl+Shift+drag`, with gray preview span rendered in every chart during selection.
- [ ] **CHT-56**: User can reset chart zoom/pan via double-click and via explicit `Reset View` option in chart `Actions`.
- [ ] **CHT-57**: User can access a per-chart `?` help icon near refresh with concise shortcuts for drag zoom, scroll zoom, pan, and synced zoom.
- [ ] **CHT-58**: User can auto-scale Y using a control at top of Y-axis so visible data fills vertical chart area.
- [ ] **CHT-59**: User can toggle normalization from chart `Actions` to scale visible traces to `0..1`, while tooltip shows both original and normalized values.
- [ ] **CHT-60**: User can enable split Y-axis overlay with left-side, color-matched axis labels for each trace.
- [ ] **CHT-61**: User sees split Y-axis option disabled with explanatory tooltip whenever chart has more than 4 sensors.
- [ ] **CHT-62**: If split Y-axis is active and plotted sensors exceed 4, split mode auto-disables and user sees a clear notice.
- [ ] **CHT-63**: Charts with no currently visible series still receive synced X-domain updates so future/late-loaded data aligns with page zoom context.
- [ ] **CHT-64**: User can interact with the equipment tree (expand/select/filter/plot/drag) without losing current equipment-sidebar scroll position.
- [ ] **CHT-65**: User can interact with the sensor/event sidebar (select/plot/drag/tab switch) without sidebar scroll resetting to top.
- [ ] **CHT-66**: User always sees chart canvas and X-axis context (page range or current zoom range) even when chart has no loaded timeseries yet.
- [ ] **CHT-67**: User sees a non-destructive loading state where existing plotted data remains visible while fetching additional tags/refreshes, with loading indicator shown above the chart.

### Production Gas Drilldown

- [ ] **PGAS-01**: User can open the Production Gas page with the two-zone layout (Zone A overview, Zone B details).
- [ ] **PGAS-02**: User can view LP/MP/HP equipment diagrams with status indicators that reflect alarm context.
- [ ] **PGAS-03**: User can hover/click equipment icons to access relevant context and navigate to detailed information.
- [ ] **PGAS-04**: User can view Cases tab data with required counters and columns in the details panel.
- [ ] **PGAS-05**: User can view Production Gas alarm cards filtered to gas-related assets only.

### Experience and Quality

- [ ] **UXQ-01**: User experiences consistent Lighthouse dark-theme styling and spacing across both pages.
- [ ] **UXQ-02**: User can use both pages on common desktop and laptop resolutions without broken layout or unusable scrolling.
- [ ] **UXQ-03**: User can inspect chart values through tooltips and expanded chart views on overview charts.
- [ ] **UXQ-04**: User can see coherent mock data across KPI charts and alarm cards for realistic MVP demonstrations.
- [ ] **UXQ-05**: User can navigate between Overview and Production Gas via the sidebar without losing context.
- [ ] **UXQ-06**: User can open the Charts tab and see at least one pre-saved chart loading non-empty live API timeseries data.

## v2 Requirements

### Data and Platform

- **DAT-01**: User sees chart and alarm data sourced from production APIs instead of mock datasets (beyond the scoped Charts workflow).
- **DAT-02**: User can view explicit plan/target data sourced from managed configuration or backend services.

### Coverage Expansion

- **EXP-01**: User can access equivalent drilldown experiences for Production Liquid and Utilities groups.
- **EXP-02**: User can view process-area-specific alarm filtering for all MVBAC sub-groups.

### Personalization

- **PERS-01**: User can choose which widgets appear first on the home screen.
- **PERS-02**: User can reorder dashboard modules to match role-based priorities.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rebuild of global header architecture | Existing shell already supports current scope and is not a blocker for MVP value |
| Full backend/API integration for Overview and Production Gas in this milestone | Frontend-first validation remains preferred outside the scoped Charts selector flow |
| New AI/copilot actions on home page | Adoption and structural UX issues are higher priority |
| Multi-ship rollout in this cycle | MVP is intentionally constrained to MVBAC to reduce risk |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| OVW-01 | Phase 1 | Pending |
| UXQ-01 | Phase 1 | Pending |
| UXQ-05 | Phase 1 | Pending |
| UXQ-06 | Phase 1 | Pending |
| OVW-02 | Phase 2 | Pending |
| OVW-03 | Phase 2 | Pending |
| OVW-04 | Phase 2 | Pending |
| OVW-05 | Phase 2 | Pending |
| UXQ-03 | Phase 2 | Pending |
| UXQ-04 | Phase 2 | Pending |
| CHT-01 | Phase 2.1 | Pending |
| CHT-02 | Phase 2.1 | Pending |
| CHT-03 | Phase 2.1 | Pending |
| CHT-04 | Phase 2.1 | Pending |
| CHT-05 | Phase 2.1 | Pending |
| CHT-06 | Phase 2.1 | Pending |
| CHT-07 | Phase 2.2 | Pending |
| CHT-08 | Phase 2.2 | Pending |
| CHT-09 | Phase 2.2 | Pending |
| CHT-10 | Phase 2.2 | Pending |
| CHT-11 | Phase 2.2 | Pending |
| CHT-12 | Phase 2.2 | Pending |
| CHT-13 | Phase 2.2 | Pending |
| CHT-14 | Phase 3 | Pending |
| CHT-15 | Phase 3 | Pending |
| CHT-16 | Phase 3 | Pending |
| CHT-17 | Phase 3 | Pending |
| CHT-18 | Phase 3 | Pending |
| CHT-19 | Phase 3 | Pending |
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
| PGAS-01 | Phase 5 | Pending |
| PGAS-02 | Phase 5 | Pending |
| PGAS-03 | Phase 5 | Pending |
| PGAS-04 | Phase 5 | Pending |
| PGAS-05 | Phase 5 | Pending |
| UXQ-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 75 total
- Mapped to phases: 75
- Unmapped: 0

---
*Requirements defined: 2026-04-11*
*Last updated: 2026-04-19 after adding Phase 6.2 advanced chart interaction QoL requirements*
