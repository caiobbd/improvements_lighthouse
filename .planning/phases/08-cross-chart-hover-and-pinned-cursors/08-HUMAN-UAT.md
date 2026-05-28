---
status: partial
phase: 08-cross-chart-hover-and-pinned-cursors
source: [08-VERIFICATION.md]
started: 2026-05-28T11:15:30-03:00
updated: 2026-05-28T11:15:30-03:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. Hover synchronization and active-chart tooltip behavior
expected: Hovering one chart updates aligned hover cursor across visible charts and active chart shows timestamp/value context.
result: [pending]

### 2. Pinned cursor drag lifecycle (reposition and off-edge delete)
expected: Dragging a pin in-bounds repositions it; dragging fully off left/right removes it and frees a slot without text selection artifacts.
result: [pending]

### 3. Bottom pan-zone affordance and behavior
expected: Bottom 20% band shows hand cursor and drag performs horizontal pan equivalent to Shift+drag.
result: [pending]

### 4. Reset Zoom / Reset Zoom All Plots pin persistence
expected: Reset actions restore domains while preserving pinned cursor timestamps.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

