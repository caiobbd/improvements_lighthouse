---
phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter
plan: 02
subsystem: dual-sidebar-layout-and-filtering
tags: [frontend, sidebars, equipment-filter]
requires:
  - phase: 04-01
    provides: backend contracts for tree and sensors
provides:
  - Dual sidebar shell with synchronized collapse
  - Case-insensitive equipment-name filtering with preserved hierarchy context
  - Conditional sensor sidebar shown only after equipment selection
affects: [04-03 plotting-actions, 04-04 drag-drop]
key-files:
  modified:
    - frontend/charts/index.html
    - frontend/charts/app.js
    - frontend/charts/services/api-client.js
    - frontend/charts/styles/charts-page.css
    - frontend/charts/styles/components.css
requirements-completed: [CHT-20, CHT-21, CHT-25]
completed: 2026-04-14
---

# Phase 04-02 Summary

Built the dual-sidebar UI and connected it to live API data.

## Accomplishments
- Added a sidebar host region to the Charts surface layout.
- Added equipment-tree loading + filtering logic in app state orchestration.
- Added conditional sensor sidebar rendering and one-toggle collapse for both sidebars.
- Added frontend API clients for equipment tree and equipment sensors.

## Verification
- `node --check frontend/charts/app.js` -> pass
- `node --check frontend/charts/services/api-client.js` -> pass
- `Invoke-WebRequest http://127.0.0.1:4173/index.html` (static smoke) -> `200`, sidebar host present

## Files
- `frontend/charts/index.html`
- `frontend/charts/app.js`
- `frontend/charts/services/api-client.js`
- `frontend/charts/styles/charts-page.css`
- `frontend/charts/styles/components.css`
