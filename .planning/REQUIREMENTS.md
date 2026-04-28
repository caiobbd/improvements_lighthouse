# Requirements: Lighthouse Improvements - Charts Operations Frontend

**Defined:** 2026-04-28  
**Core Value:** Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## Active v1 Requirements

### Charts Composition and Management

- [ ] **CHT-01**: User can open a chart selector from Add Chart and per-chart Actions.
- [ ] **CHT-02**: User can search assets by case-insensitive substring with capped results.
- [ ] **CHT-03**: User can multi-select attributes and add/remove plotted tags per chart.
- [ ] **CHT-04**: User can select only attributes with timeseries support.
- [ ] **CHT-05**: User can compose one chart with tags from multiple assets.
- [ ] **CHT-06**: User can rename/duplicate/close/delete pages using compact controls.
- [ ] **CHT-07**: User can create charts up to configured page cap with clear disabled feedback.
- [ ] **CHT-08**: User keeps page-level date range and frequency preferences across tab switches and reload.

### Equipment and Sensor Workflows

- [ ] **CHT-20**: User can filter and navigate the equipment tree without losing hierarchy context.
- [ ] **CHT-21**: User can view grouped sensors for selected equipment using timeseries-only attributes.
- [ ] **CHT-22**: User can plot sensors through right-click actions (`Plot to new chart`, bulk actions).
- [ ] **CHT-23**: User can drag sensors to charts to append tags.
- [ ] **CHT-24**: User sees plotted state and avoids duplicate sensor inserts.

### Intel Events and Alarm Recognition

- [ ] **CHT-38**: User can load intel events and filter by selected equipment subtree.
- [ ] **CHT-39**: User can switch sidebar between `Sensors` and `Events`.
- [ ] **CHT-40**: User can filter event cards by status and sort newest-first.
- [ ] **CHT-41**: User can create an alarm page from an event card.
- [ ] **CHT-42**: Alarm page date range uses event-driven defaults with deterministic fallbacks.
- [ ] **CHT-43**: Alarm page renders one chart per resolved event attribute with alarm-span overlays.
- [ ] **CHT-44**: Alarm header row displays key metadata with robust missing-field handling (`N/A`, warnings).
- [ ] **CHT-45**: Alarm narrative (`description`, `prognosis`) renders via sanitized markdown pipeline.
- [ ] **CHT-46**: Long alarm narratives support collapse/expand with raw-text fallback.
- [ ] **CHT-47**: Alarm row remains readable on standard desktop widths without clipping critical metadata.

### Interaction Quality and Performance

- [ ] **CHT-52**: User can marquee zoom and modifier-based axis zoom.
- [ ] **CHT-53**: User can pan horizontally with clamped ranges and reset views predictably.
- [ ] **CHT-54**: User can use synchronized cross-chart zoom and hover aids for comparison.
- [ ] **CHT-55**: User can use normalization, auto-scale Y, and guarded split-axis modes.
- [ ] **CHT-56**: Sidebar scroll position remains stable through selection/plotting interactions.
- [ ] **CHT-57**: Existing chart data stays visible while refresh/add-tag requests are loading.
- [ ] **CHT-58**: Incremental loading fetches only missing tag data and preserves current chart state.
- [ ] **CHT-59**: Repeated requests benefit from frontend/backend caching and in-flight deduplication.
- [ ] **CHT-60**: Rapid interactions obey latest-request-wins guardrails with accurate loading/no-data states.
- [ ] **CHT-61**: Cross-chart hover and pinned cursors support synchronized timestamp inspection.

## Out of Scope

- Legacy two-page scope artifacts and their retired specs/pages.
- Any feature work depending on removed legacy root pages.

---
*Last updated: 2026-04-28*
