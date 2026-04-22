# Quick Task 260422-cck Summary

## Outcome

Completed quick fixes for Charts UX:

1. Fixed ghost empty-state card remaining visible after charts are added.
2. Extended plotting actions:
   - Alarm page now creates a first combined chart with all matched alarm sensors, then individual charts.
   - Sensor category header context menu now supports `Plot category` and `Plot category sensors`.

## Files Changed

- `frontend/charts/components/chart-grid.js`
- `frontend/charts/app.js`

## Verification

- `node --check frontend/charts/components/chart-grid.js`
- `node --check frontend/charts/app.js`

Both checks passed.
