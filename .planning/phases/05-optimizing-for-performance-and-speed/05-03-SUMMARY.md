---
phase: 05-optimizing-for-performance-and-speed
plan: 03
subsystem: "timeseries-fetch-and-refresh-ux"
tags: [batch-fetch, progress, stale-guard, no-flicker]
provides: [timeseries-batch-endpoint, global-progress, latest-request-wins]
affects: [chart-refresh-flow, perceived-performance]
tech-stack:
  added: []
  patterns: [per-chart-batch, atomic-render-swap, inflight-visibility]
key-files:
  created: []
  modified:
    - backend/app/models/charts.py
    - backend/app/api/charts.py
    - frontend/charts/services/api-client.js
    - frontend/charts/components/chart-card.js
    - frontend/charts/app.js
    - frontend/charts/index.html
    - frontend/charts/styles/components.css
key-decisions:
  - Batch by chart (not by full page) to keep payloads scoped and integration low-risk.
  - Keep existing lines on screen until replacement payload is ready.
patterns-established:
  - Latest-request token guard prevents stale async responses from overwriting newer data.
duration: "95min"
completed: 2026-04-16
---

# Phase 5: Batch fetching and refresh UX Summary

Converted chart refresh to per-chart batched requests with global in-flight feedback and no-blank refresh behavior.

## Performance

- **Duration:** 95 min
- **Tasks:** 3 completed
- **Files modified:** 7

## Accomplishments

- Added `/api/v1/charts/timeseries-batch` and response models with per-tag success/error payloads.
- Updated chart cards to fetch tags in one request per chart and preserve rendered data during refresh.
- Added top global progress bar that appears while one or more chart refresh requests are active.

## Task Commits

1. **Task 1: Add batch timeseries endpoint + models** - not committed (workspace in-progress)
2. **Task 2: Switch frontend chart loading to batch + stale guards** - not committed (workspace in-progress)
3. **Task 3: Add global refresh progress UI** - not committed (workspace in-progress)

## Files Created/Modified

- `backend/app/models/charts.py` - `effective_window` and batch response models.
- `backend/app/api/charts.py` - `/timeseries-batch` endpoint and window resolution handling.
- `frontend/charts/services/api-client.js` - batch API client + dedupe integration points.
- `frontend/charts/components/chart-card.js` - chart-level load token guard and no-flicker refresh flow.
- `frontend/charts/app.js` - global refresh counters and page-wide refresh trigger.
- `frontend/charts/index.html` - progress container mount point.
- `frontend/charts/styles/components.css` - progress bar styling and animation.

## Decisions & Deviations

None - followed plan as specified.

## Next Phase Readiness

Ready for cache policy hardening and verification baseline capture (Plan 04).
