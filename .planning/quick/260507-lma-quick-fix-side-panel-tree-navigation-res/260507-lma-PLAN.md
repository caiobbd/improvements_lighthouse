# Quick Task 260507-lma: Side panel tree navigation responsiveness

**Date:** 2026-05-07  
**Status:** Completed

## Goal

Make the equipment tree interaction in the charts side panel immediate and predictable, with reliable click targets for expanding/collapsing branches.

## Tasks

1. Update equipment-tree interaction logic in `frontend/charts/app.js`:
   - Row click opens branch when closed and selects node.
   - Row click on already-open node does not collapse it.
   - Leaf row click only selects.
   - Expander arrow remains the explicit toggle control.
2. Improve expander hitbox and affordance in `frontend/charts/styles/components.css`:
   - Increase click target size and spacing.
   - Add clear hover/focus styles for expander control area.
3. Add/update frontend checks in `tests/frontend` to guard behavior contracts and run targeted tests.
