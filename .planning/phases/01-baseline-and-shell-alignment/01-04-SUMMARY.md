---
phase: 01-baseline-and-shell-alignment
plan: 04
subsystem: api+ui
tags: [preset-pages, live-data, api-integration, d3]
requires:
  - phase: 01-03
    provides: chart card renderer and interactions
provides:
  - Backend-driven live preset chart metadata (item_id + attribute target)
  - Frontend preset hydration from /pages on bootstrap
  - Attribute-based timeseries routing for deterministic preset loading
affects: [phase-01 verification closure, phase-02 chart hardening]
tech-stack:
  added: []
  patterns: [backend-seeded-presets, attribute-targeted-fetch, preset-sync]
key-files:
  modified:
    - backend/app/models/charts.py
    - backend/app/api/charts.py
    - backend/app/services/workspace_client.py
    - frontend/charts/services/api-client.js
    - frontend/charts/state/store.js
    - frontend/charts/components/chart-card.js
    - frontend/charts/app.js
key-decisions:
  - "Preset charts are generated from real asset/attribute discovery on backend pages endpoint."
  - "Frontend boot flow syncs backend preset pages before regular rendering."
  - "Chart-card uses timeseries-from-attribute when item/attribute metadata exists."
requirements-completed: [UXQ-06]
duration: 45min
completed: 2026-04-12
---

# Phase 01-04 Summary

**Closed the Phase 1 API gap by ensuring presets are real-data aware and consumable at UI startup.**

## Accomplishments
- Extended chart DTO contract with optional `item_id`, `attribute_id`, `attribute_name`.
- Reworked `/api/v1/charts/pages` to build presets from live asset/attribute discovery for:
  - `MV27-HBG-1130C (CRUDE HEATER)`
  - `MV30-HBG-1120A (CRUDE HEATER)`
- Added proxy-environment hardening in workspace client initialization to avoid failed API calls caused by inherited localhost proxy settings.
- Updated frontend API client to auto-switch between `/timeseries` and `/timeseries-from-attribute`.
- Added preset synchronization in store and app bootstrap so UI consumes backend preset pages.

## Verification
- `python -m py_compile backend/app/models/charts.py backend/app/api/charts.py backend/app/services/workspace_client.py` -> pass
- `node --check frontend/charts/services/api-client.js` -> pass
- `node --check frontend/charts/state/store.js` -> pass
- `node --check frontend/charts/components/chart-card.js` -> pass
- `node --check frontend/charts/app.js` -> pass
- Runtime checks on updated backend instance:
  - `GET /api/v1/charts/pages` -> preset charts include `item_id` + `attribute_id`
  - `GET /api/v1/charts/timeseries-from-attribute` using preset chart metadata -> non-empty points (721 points in sampled run)

## Notes
- Stale process on `127.0.0.1:8001` was replaced and updated backend is now serving on the standard port.
