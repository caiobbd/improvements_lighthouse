# Quick Task 260519-emn Plan

## Goal
Restore lost Charts UX behaviors after toolbar/navigation refactor.

## Tasks

1. Restore add-chart entry points in chart grid:
   - Make empty-state `+` control clickable.
   - Add inline "Add chart" tile when page already has charts.

2. Restore tab hover delete affordance:
   - Reintroduce hover/focus `X` button on each tab.
   - Keep deletion confirmation.

3. Fix visual regression in 2-column grid icon:
   - Render clear 2x2 square glyph.

4. Fix scroll-reset regressions and codify default rule:
   - Prevent unintended auto-scroll on regular interactions.
   - Preserve Table Columns modal list scroll offsets across rerenders.
   - Document scroll preservation convention in project docs.

## Verification

- Empty page: clicking plus creates first chart.
- Non-empty page: visible add-chart tile adds another chart.
- Tab close `X` appears on hover/focus and deletes after confirmation.
- Grid selector right icon renders four squares.
- Drag sensor to chart does not jump viewport to top.
- Table Columns modal keeps scroll position when toggling/reordering rows.
