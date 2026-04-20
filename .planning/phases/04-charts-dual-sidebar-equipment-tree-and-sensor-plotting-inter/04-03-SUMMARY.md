---
phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter
plan: 03
subsystem: plotting-context-actions-and-cap
tags: [context-menu, plotting, chart-cap]
requires:
  - phase: 04-01
    provides: equipment/sensor data contracts
  - phase: 04-02
    provides: dual-sidebar interaction baseline
provides:
  - Sensor right-click action: Plot to new chart
  - Equipment right-click actions: Plot by category, Plot all sensors
  - Active-page plotted-sensor checkbox state
  - Raised chart cap to 30 with clean cap-stop handling
affects: [04-04 drag-drop]
key-files:
  modified:
    - frontend/charts/app.js
    - frontend/charts/state/store.js
    - frontend/charts/components/chart-grid.js
requirements-completed: [CHT-22, CHT-23, CHT-26, CHT-27, CHT-28]
completed: 2026-04-14
---

# Phase 04-03 Summary

Implemented sidebar-driven plotting actions and cap-safe creation behavior.

## Accomplishments
- Added right-click context menu actions for equipment and sensors.
- Added plotted-sensor checkbox state derived from active-page chart tags.
- Increased chart cap from 12 to 30 and added batch chart creation with cap enforcement.
- Ensured duplicate sensor insertion is blocked when adding tags to existing charts.

## Verification
- `node --check frontend/charts/state/store.js` -> pass
- `node --check frontend/charts/app.js` -> pass
- Runtime API smoke for target assets returned valid sensor totals for plotting flows.

## Files
- `frontend/charts/app.js`
- `frontend/charts/state/store.js`
- `frontend/charts/components/chart-grid.js`
