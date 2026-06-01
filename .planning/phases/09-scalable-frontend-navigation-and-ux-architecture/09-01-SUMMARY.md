---
phase: 09-scalable-frontend-navigation-and-ux-architecture
plan: 01
subsystem: ui
tags: [charts, layout, sidebar, navigation]
requires: []
provides:
  - Header-first charts shell with app-level header and tabs
  - Docked left pane layout contract with non-overlapping workspace
  - Sidebar resize persistence (320-440, default 360)
  - Deterministic sidebar precedence (fullscreen/open, <1400 collapse, remembered state)
  - Single-active sidebar contexts (Equipment, Sensors, Events) with collapsed rail reopen
affects: [09-02, 09-03]
tech-stack:
  added: []
  patterns:
    - CSS grid shell contract for docked left-pane geometry
    - Explicit JS precedence resolver for responsive/fullscreen/sidebar state
key-files:
  created: []
  modified:
    - frontend/charts/index.html
    - frontend/charts/app.js
    - frontend/charts/styles/charts-page.css
    - frontend/charts/styles/components.css
key-decisions:
  - "Use CSS-grid docking instead of fixed/overlay sidebar positioning."
  - "Persist sidebar width and user-collapsed intent in localStorage, then resolve effective state by precedence."
  - "Model Equipment/Sensors/Events as one active context at a time with explicit context tabs/rail."
requirements-completed: [TBD]
duration: continuation-session
completed: 2026-06-01
---

# Phase 09 Plan 01: Header-First Shell and Docked Left Pane Contract Summary

**Charts shell now uses a full-width app header and a docked, resizable, precedence-driven left pane contract that keeps chart workspace unobscured.**

## Performance

- **Completed:** 2026-06-01T14:17:29-03:00
- **Tasks completed:** 3/3
- **Files modified:** 4

## Accomplishments

- Preserved and finalized Task 1 shell hierarchy: full-width `Main Application Header Bar` with `Lighthouse 2.0`, `Charts` active tab, and disabled `Shape Agents`.
- Reworked layout to a docked sidebar/workspace grid so chart canvases are never overlaid by the left pane.
- Added sidebar resize behavior with min/max/default bounds (`320-440`, default `360`) and persisted width.
- Implemented deterministic sidebar precedence:
  - Fullscreen forces open
  - Viewport `<1400px` auto-collapses
  - Otherwise remembered user state applies
- Implemented single-active sidebar contexts (`Equipment`, `Sensors`, `Events`) with collapsed icon rail for one-click reopen.

## Verification Results

### Executed checks

1. `node --check frontend/charts/app.js`
- Result: **PASS** (exit code 0)

2. `rg -n "main-app-header|Lighthouse 2.0|Shape Agents|tab-navigation|page-controls|refresh-progress|alarm-details-row|chart-grid" frontend/charts/index.html`
- Result: **PASS** (required shell anchors and app header/tab content present)

3. Static contract checks executed via PowerShell:
- `legacy-header-check`: **PASS** (no visible legacy breadcrumb/subtitle markers in `index.html`)
- `shape-agents-disabled-check`: **PASS** (`aria-disabled` + `Coming soon` tooltip markers present)
- `docked-sidebar-check`: **PASS** (`.charts-sidebars` no longer fixed overlay contract)
- `resize-precedence-constants-check`: **PASS** (`320/440/360` and `1400` precedence constants present)
- `collapsed-rail-resize-style-check`: **PASS** (collapsed rail and resize handle styles present)
- `single-active-context-check`: **PASS** (Equipment/Sensors/Events single-context model present)

## Deviations from Plan

None - plan executed within the defined scope of 09-01.

## Issues Encountered

- One temporary PowerShell quoting error while running a verification command; command was corrected and rerun successfully.

## Next Phase Readiness

- 09-01 shell/layout foundation is complete and stable for Phase 09 follow-up plans.
- **Wave 2 readiness:** **READY** (09-02 can refine tabs/controls exactness without reopening shell architecture).
