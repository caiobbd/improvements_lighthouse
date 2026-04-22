---
phase: "08"
name: "Cross-chart hover and pinned cursors"
created: 2026-04-22
---

# Phase 8: Cross-chart hover and pinned cursors - Context

## Decisions

- Cursor model is page-global:
  - Maximum of 5 pinned cursors per active page.
  - Hover X and pinned cursor X values are synchronized to all visible charts on active page.
- Lifetime is session-only:
  - Pinned cursors are not persisted to localStorage/backend.
  - They live only in runtime memory for current browser session.
- Hover behavior:
  - Mouse movement over chart area shows transient vertical hover line.
  - Hover line snaps to closest available timestamp (no interpolation).
  - Hover tooltip is lightweight and semi-transparent.
  - Tooltip timestamp format must be UTC.
  - Tooltip values include only currently visible traces.
- Pinned behavior:
  - Single left-click (without drag) drops a pinned cursor.
  - Click+drag must not create a new pin.
  - If 5 pins already exist, additional clicks are ignored.
  - Pinned tooltip is opaque and anchored near top of pinned line.
  - Pinned tooltip includes timestamp header and per-trace value rows in trace color.
- Drag behavior for pinned cursors:
  - User can drag cursor by vertical line or tooltip header.
  - If released inside chart bounds, cursor repositions to new timestamp.
  - If dragged fully off left/right chart edge, cursor is deleted immediately.
  - Hovering draggable pin affordance shows horizontal move cursor (`ew-resize`).
- Pan ergonomics:
  - Bottom 20% of plot area (still above x-axis) is a pan zone.
  - Cursor changes to hand in pan zone.
  - Drag in pan zone behaves as horizontal pan (equivalent to `Shift+drag`).
- Existing interaction contract remains valid:
  - `Drag`: zoom XY
  - `Ctrl+Drag`: zoom X
  - `Alt+Drag`: zoom Y
  - `Shift+Drag`: pan X
  - `Ctrl+Shift+Drag`: synced X zoom selection
  - `Ctrl+Wheel`: X zoom
  - `Alt+Wheel`: Y zoom
- Reset behavior:
  - `Reset Zoom` and `Reset Zoom All Plots` keep pinned cursors at same X positions.
  - Only view domains reset; cursor state does not reset.

## Discretion Areas

- Exact visual styling tokens for hover/pinned tooltips as long as hierarchy matches reference:
  - timestamp on top
  - values in compact rows below
  - line/value colors aligned with trace colors
- Internal representation for global cursor state (sync-bus extension vs dedicated per-page runtime object).
- Drag threshold (pixel tolerance) to distinguish click vs drag, as long as click-only pin creation is reliable.
- Performance optimizations (throttle/requestAnimationFrame/bisector caching) to keep hover responsive on dense charts.
- Collision handling of multiple pinned tooltips near each other (stacking/offset policy).

## Deferred Ideas

- Persisting pinned cursors across page reloads.
- Numeric interpolation modes (linear/spline) for sampled values.
- Multi-page cursor linking.
- Touch/mobile cursor gesture parity.
