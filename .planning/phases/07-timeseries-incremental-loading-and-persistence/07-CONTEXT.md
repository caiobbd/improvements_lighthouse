---
phase: "07"
name: "timeseries-incremental-loading-and-persistence"
created: 2026-04-20
---

# Phase 7: timeseries-incremental-loading-and-persistence - Context

## Decisions

- When user adds a new tag to an existing chart, already plotted series must remain visible while only the missing/new tag data is fetched.
- Frequency changes (for example `6h` to `1h`) must follow stale-while-revalidate behavior: keep current frequency visible until replacement data is ready.
- Chart updates must avoid full grid teardown/remount for tag-only mutations. Update chart instances incrementally by chart ID.
- Timeseries fetching should be optimized for perceived speed and backend efficiency:
  - Frontend per-tag cache and in-flight dedupe.
  - Incremental merge for new tags.
  - Backend cache for repeated timeseries requests.
- Manual refresh remains authoritative and should invalidate affected caches for fresh retrieval.

## Discretion Areas

- Exact cache TTL values for frontend and backend timeseries caches.
- Whether backend parallelization is implemented inside existing `/timeseries-batch` flow or by internal adapter-level fanout utilities.
- Instrumentation format for performance metrics (console/dev metrics vs lightweight telemetry payload in dev mode).

## Deferred Ideas

- Long-term persistence of timeseries data to disk (outside current in-memory/TTL scope).
- Progressive downsampling/render virtualization for extremely high-point charts.
- Cross-tab shared worker cache for multi-tab sessions.
