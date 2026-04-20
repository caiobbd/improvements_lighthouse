---
phase: "05"
name: "optimizing-for-performance-and-speed"
created: 2026-04-16
---

# Phase 5: optimizing-for-performance-and-speed — Context

## Decisions

- Keep refresh explicit/manual (no background polling).
- Make startup path cache/metadata-first: avoid blocking preset page generation on live timeseries probes.
- Apply macro-first sampling protocol with page-level control:
  - `<= 1 day -> 15m`
  - `<= 7 days -> 1h`
  - `<= 30 days -> 6h`
  - `> 30 days -> 1d`
- Manual frequency selection always overrides Auto.
- Keep existing plotted lines visible while refresh is in-flight; perform atomic swap when new payload completes.
- Use per-chart batch endpoint (`/timeseries-batch`) rather than per-page mega-batch in this phase.

## Discretion Areas

- Chosen backend cache TTL for item attributes and equipment sensors: 300 seconds.
- Lean tree response keeps only sidebar-required fields while preserving compatibility through optional `lean=true`.
- Frontend startup runs `getPages()` and `getEquipmentTree()` in parallel and tolerates partial failure (`Promise.allSettled`).

## Deferred Ideas

- Per-page timeseries batch endpoint for very large layouts.
- Dynamic sampling by point budget (target max points per chart) beyond current fixed window protocol.
- Server-sent/streaming progress for chart refresh (current implementation uses client-side in-flight counters).
