---
phase: 06-intel-events-integration
plan: 01
subsystem: "backend-events-contract"
tags: [shape-intel, events, caching, subtree-filter]
provides: [intel-events-api, normalized-event-payload, status-options]
affects: [sidebar-events-tab, alarm-page-generation]
tech-stack:
  added: []
  patterns: [cache-first, subtree-aware-filtering, newest-first-sort]
key-files:
  created: []
  modified:
    - backend/app/models/charts.py
    - backend/app/services/profiling_adapter.py
    - backend/app/api/charts.py
key-decisions:
  - Normalize raw `get_all_events(type='Shape Intel')` rows into a stable DTO for frontend use.
  - Keep event retrieval cache-backed to avoid repeated expensive loads per sidebar interaction.
patterns-established:
  - API filtering scope is equipment item + descendants when requested.
duration: "70min"
completed: 2026-04-19
---

# Phase 6 Plan 01 Summary

Implemented backend contracts for Shape Intel events with normalization, subtree filtering, and status discovery.

## Accomplishments

- Added `IntelEventCard` and `IntelEventsResponse` response models.
- Added adapter event ingestion pipeline from `wsp.get_all_events(type='Shape Intel')`.
- Added workspace-scoped cached retrieval and newest-first sorting.
- Added `GET /api/v1/charts/intel-events` endpoint with `item_id`, `include_descendants`, and `status` filters.

## Verification

- `python -m compileall backend/app` passes.

## Next Readiness

Ready for sidebar events-tab UX integration (Plan 02).
