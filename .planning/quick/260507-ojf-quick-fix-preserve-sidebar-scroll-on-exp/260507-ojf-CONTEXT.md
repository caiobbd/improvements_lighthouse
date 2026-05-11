# Quick Task 260507-ojf: Preserve sidebar scroll continuity - Context

**Gathered:** 2026-05-07  
**Status:** Ready for planning

## Task Boundary

Fix sidebar scroll resets to top during equipment-tree and sensor-list interactions in Charts.

## Implementation Decisions

### Equipment tree behavior
- Clicking an expandable equipment row must keep current scroll position.
- Expander arrow toggle behavior remains unchanged.
- Existing right-click context menu behavior remains unchanged.

### Sensor list behavior
- Drag-and-drop from sensor list to chart must keep current sensor sidebar scroll position.
- Plot actions triggered from right-click context menu must keep current sensor sidebar scroll position.

### Scope limits
- Preserve current interaction contracts (selection, expand/collapse, plotting actions).
- Focus on scroll-state continuity under rapid consecutive re-renders.

## Specific Ideas

- Harden scroll restore to survive back-to-back sidebar renders.
- Remove unnecessary immediate duplicate sidebar invalidation on expandable row activation.

