# Quick Task 260507-lma: Side panel tree navigation responsiveness - Context

**Gathered:** 2026-05-07  
**Status:** Ready for planning

## Task Boundary

Improve equipment tree responsiveness in the charts side panel. Expansion/collapse and click hitboxes must feel precise and immediate.

## Implementation Decisions

### Row click behavior
- Clicking a row for a node with children expands the branch immediately and also selects the node.
- Clicking a row for a leaf node only selects the node.
- Clicking a row for a node that is already expanded does not collapse it.

### Expander behavior
- Expander arrow is the only control that toggles open/close state.
- Arrow must keep explicit visual affordance as a clickable target area.

### Collapsed parent and selected node
- Collapsing a parent that contains the selected node must not clear selection or the sensor/events panel state.

### Filter behavior
- When a filter is active, expansion still respects manual toggles (no forced auto-expand).

### Context menu
- Keep right-click context menu behavior intact.

## Specific Ideas

- Expand the clickable area around the expander arrow.
- Make row-level click handler perform one-way expand (open only), while expander keeps bidirectional toggle.

