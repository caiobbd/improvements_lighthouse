---
phase: "06"
name: "intel-events-integration"
created: 2026-04-19
---

# Phase 6: intel-events-integration - Context

## Decisions

- Phase number is `6` and scope is dedicated to Shape Intel events integration in Charts.
- Events source is `wsp.get_all_events(type='Shape Intel')`.
- Events should be loaded when the user opens the Charts page (no manual refresh control in this phase).
- Event filtering must include the selected equipment and its subtree descendants (not only exact `item_id`).
- Sidebar 2 must support tab switching between `Sensors` and `Events`, with default tab set to `Sensors`.
- Event cards are sorted newest-first.
- Event cards include: `data.status`, `event_type`, `data.severity`, `name`, `start_date`.
- Events tab must include a `data.status` filter with all available status options from loaded events.
- Event card context menu must expose `Plot alarm in new page`.
- Selecting `Plot alarm in new page` always creates a new page titled `[Alarm] {name}` (no dedupe/reuse in this phase).
- Alarm pages include a dedicated alarm header row above the chart grid.
- Alarm header row must display card fields plus `data.description`, `data.prognosis`, `data.status`.
- Alarm header row must include warning text when expected fields are missing.
- Alarm window defaults:
  - start: `data.trend_display_start_date`
  - start fallback 1: `end_date - 300 days`
  - start fallback 2: `now - 300 days`
  - end: `end_date` or `now` if empty
- For `data.event_timeseries_attributes`, match item attributes by exact name first.
- Alarm pages must create one chart per matched event attribute.
- Every chart in alarm pages must render a span overlay from alarm `start_date` to alarm `end_date` (or `now`).

## Discretion Areas

- Exact in-memory cache lifecycle for full events payload after initial load (session-only vs short TTL) while preserving no-manual-refresh UX.
- Missing-field warning format and visual emphasis in alarm header row.
- Handling of unmatched `event_timeseries_attributes` (warning-only vs informational badge) as long as page creation remains successful.

## Deferred Ideas

- Manual event refresh action.
- Historical event query controls (time slicing before initial load).
- Event-to-event deduping or merge semantics for repeated alarm names.
