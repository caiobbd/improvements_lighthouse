---
status: complete
phase: 08-cross-chart-hover-and-pinned-cursors
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md
started: 2026-04-22T17:51:00.353Z
updated: 2026-05-28T11:14:54.3031134-03:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Synced Hover Line Across Charts
expected: Hovering one chart shows aligned vertical hover lines on all visible charts at the same timestamp.
result: pass

### 2. Click to Pin Cursor (Global Limit)
expected: A single click adds a pinned cursor at that timestamp, and page-global pins are limited to 5 total.
result: pass

### 3. Pinned Tooltip Content and Format
expected: Pinned cursor tooltip shows UTC timestamp and visible-trace values using each trace color, sampled by closest point (no interpolation).
result: pass

### 4. Drag Pinned Cursor to Reposition
expected: Dragging a pinned cursor line or header repositions it to a new timestamp and all charts update to the new aligned position.
result: pass

### 5. Drag Off Edge Removes Cursor
expected: Dragging a pinned cursor fully beyond left or right chart bounds removes it immediately and frees a pin slot.
result: issue
reported: "when I drag, I noticed that my cursor also selects text, making it less clean after deleting a pin"
severity: minor

### 6. Bottom Pan Zone Behavior
expected: In the lower 20% of plot area (above x-axis), pointer changes to hand and drag performs horizontal pan equivalent to Shift+Drag.
result: pass

### 7. Click vs Drag Arbitration
expected: Click creates a pin, but click-and-drag does not create a pin and instead performs the selected interaction (zoom/pan).
result: pass

### 8. Reset Zoom Actions and Pin Persistence
expected: "Reset zoom" and "Reset zoom for all plots" reset domains but keep existing pinned cursors.
result: pass

### 9. Chart Help Shortcut Guidance
expected: Chart help/tooltip includes Phase 8 interaction guidance (hover, pin, drag remove, pan zone).
result: pass

## Summary

total: 9
passed: 8
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps
- truth: "Dragging a pinned cursor fully beyond left or right chart bounds removes it immediately and frees a pin slot."
  status: failed
  reason: "User reported: when I drag, I noticed that my cursor also selects text, making it less clean after deleting a pin"
  severity: minor
  test: 5
  artifacts: []
  missing: []
