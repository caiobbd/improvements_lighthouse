# Quick Task 260507-ojf Summary

**Date:** 2026-05-07  
**Status:** Completed

## Scope

Fixed sidebar scroll resets observed in equipment-tree and sensor-plot interaction flows, and clarified requirement wording for these continuity contracts.

## Root Cause

Sidebar scroll restoration only happened inside `requestAnimationFrame`. During rapid consecutive re-renders, a new sidebar DOM could be captured before restoration settled, which allowed scroll snapshots to drift back to top (`0`) in specific flows (expandable-row click and plot interactions that trigger update + notice renders).

## Changes Made

1. Hardened sidebar scroll restore in `frontend/charts/app.js`:
   - Apply `host.scrollTop = target` immediately.
   - Keep RAF restore pass as a second stabilization step and guard with `host.isConnected`.
2. Reduced redundant render churn in expandable equipment-row activation:
   - Row expansion now avoids a duplicate immediate sidebar invalidation when `selectEquipmentNode` already handles rendering.
   - Kept explicit fallback render only for the no-op selection case.
3. Updated frontend interaction contract tests:
   - Added assertions for resilient scroll-restore behavior.
   - Updated row-activation contract assertions after logic refactor.
4. Clarified requirements wording in `.planning/REQUIREMENTS.md`:
   - Expanded CHT-64 and CHT-65 to explicitly include expandable-row click, filter apply, context-menu plot actions, and drag-and-drop plotting.

## Verification

- `node --check frontend/charts/app.js` -> OK
- `py -3.14 -m pytest -q tests/frontend/test_equipment_tree_navigation_interactions.py` -> `5 passed`
- `py -3.14 -m pytest -q tests/frontend` -> `21 passed`

## Notes

- `REQUIREMENTS.md` already contained the relevant continuity requirements (CHT-64/CHT-65); this quick task made those scenarios explicit to remove ambiguity.

