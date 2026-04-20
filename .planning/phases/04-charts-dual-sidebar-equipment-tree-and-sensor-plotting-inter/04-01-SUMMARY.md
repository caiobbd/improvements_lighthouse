---
phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter
plan: 01
subsystem: backend-sidebar-contracts
tags: [api, equipment-tree, timeseries-sensors]
requires: []
provides:
  - Equipment tree API endpoint for sidebar navigation
  - Equipment sensor endpoint grouped by category using timeseries data source
  - Extended item attribute payload with data_source/timeseries metadata
affects: [04-02 frontend-sidebars]
key-files:
  modified:
    - backend/app/api/charts.py
    - backend/app/models/charts.py
    - backend/app/services/profiling_adapter.py
requirements-completed: [CHT-20, CHT-21]
completed: 2026-04-14
---

# Phase 04-01 Summary

Implemented backend APIs for Phase 4 sidebars.

## Accomplishments
- Added `GET /api/v1/charts/equipment-tree` returning normalized equipment nodes and roots.
- Added `GET /api/v1/charts/equipment-sensors` returning only `data_source == TimeSeries` sensors grouped by category.
- Extended item attributes model to include `data_source` and `is_timeseries_data_source`.

## Verification
- `python -m compileall backend/app` -> pass
- FastAPI TestClient:
  - `/api/v1/charts/equipment-tree` -> `200`, non-empty payload
  - `/api/v1/charts/equipment-sensors?asset_name=MV30-HBG-1120B (CRUDE HEATER)` -> `200`, categorized sensors

## Files
- `backend/app/api/charts.py`
- `backend/app/models/charts.py`
- `backend/app/services/profiling_adapter.py`
