# Quick Task 260519-emn Summary

## Completed

1. Add-chart entry points restored
   - Empty-state plus is now a real button that calls `addChart`.
   - Grid now shows an inline "Add chart" tile whenever chart limit is not reached.

2. Tab hover delete restored
   - Browser-style tabs now include a hover/focus `X` button.
   - Delete path uses confirmation and existing page delete action.

3. Grid icon fixed
   - 2-column selector icon now renders as four distinct squares.

4. Scroll behavior stabilized
   - Pending chart auto-scroll now consumes once, and only scrolls when target is outside viewport.
   - Auto-scroll alignment uses `block: nearest` to avoid top resets.
   - Table Columns modal now remembers and restores both list scroll positions during rerenders.

5. Documentation updated
   - Added default scroll-preservation convention to `.planning/CONVENTIONS.md`.
   - Added rule summary in `README.md`.

## Validation

- `node --check` passed for modified frontend modules.
- `python -m pytest tests/frontend -q` passed (`25 passed`).
