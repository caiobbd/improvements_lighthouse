---
status: complete
phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter
source:
  - 04-01-SUMMARY.md
  - 04-02-SUMMARY.md
  - 04-03-SUMMARY.md
  - 04-04-SUMMARY.md
  - 04-05-SUMMARY.md
started: 2026-04-14T15:39:29.3619451-03:00
updated: 2026-04-16T14:08:00.0000000-03:00
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Stop running frontend/backend services, start both from scratch, open Charts page, and confirm equipment tree + charts load without startup errors.
result: pass

### 2. Equipment Tree Load and Filter
expected: Equipment sidebar loads tree from API and filtering by equipment name (case-insensitive) keeps hierarchy path visible.
result: pass

### 3. Conditional Sensor Sidebar and Grouping
expected: Selecting equipment shows sensor sidebar only then, grouped by category, with only TimeSeries sensors listed.
result: pass

### 4. Sensor Right-Click Plot to New Chart
expected: Right-clicking sensor and choosing Plot to new chart creates a chart with that sensor tag and data.
result: pass

### 5. Equipment Right-Click Plot by Category
expected: Right-clicking equipment and choosing Plot by category creates one chart per category with category sensors.
result: pass

### 6. Equipment Right-Click Plot All Sensors with Cap
expected: Right-clicking equipment and choosing Plot all sensors creates one chart per sensor until page cap 30 is reached, then stops cleanly.
result: pass

### 7. Plotted Sensor Checkbox State
expected: Sensor checkbox appears checked for sensors already plotted in active page charts and updates after add/remove actions.
result: pass

### 8. Drag-and-Drop Sensor to Chart Zones
expected: Dragging a sensor into chart header, body, or tag area appends that sensor to the chart.
result: pass

### 9. Dedupe on Re-Plot or Re-Drop
expected: Re-plotting or re-dropping an already plotted sensor does not duplicate tags in the same chart.
result: pass

### 10. Chart Tag Table Overflow + Remove Action
expected: Charts with long tag lists render tags in a fixed-height scrollable table (single name column), and each row provides remove action without creating large empty spaces in chart cards.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

none
