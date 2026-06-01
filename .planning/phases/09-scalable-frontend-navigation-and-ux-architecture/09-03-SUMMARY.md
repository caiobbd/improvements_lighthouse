---
phase: 09-scalable-frontend-navigation-and-ux-architecture
plan: 03
subsystem: ui
tags: [charts, interactions, overlays, compactness]
requires: [09-02]
provides:
  - Icon-only chart header controls in order `?`, refresh, `...`
  - Help/menu overlay mutual exclusion across hover/focus/click/Escape/outside-click/rerender
  - Compact chart chrome pass preserving chart-height strategy
  - Final automated acceptance checks available in this environment
affects: []
tech-stack:
  added: []
  patterns:
    - Explicit overlay lifecycle helpers with deterministic close order
    - Per-overlay outside-click handling inside chart card scope
key-files:
  created:
    - .planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-03-SUMMARY.md
  modified:
    - frontend/charts/components/chart-card.js
    - frontend/charts/styles/components.css
    - frontend/charts/styles/charts-page.css
key-decisions:
  - "Always close menu before opening help and close help before opening menu."
  - "Close all header overlays on chart-card rerender update path."
  - "Reduce spacing/chrome only; keep chart height contract untouched."
requirements-completed: [TBD]
duration: single-session
completed: 2026-06-01
---

# Phase 09 Plan 03: Chart Interaction Isolation and Final Acceptance Gate Summary

**Chart header interactions are isolated to explicit controls (`?`, refresh, `...`), overlay states are mutually exclusive, and chart chrome is compacted without changing chart-height behavior.**

## Tasks Completed

- Task 1: Enforced icon-only header controls in order `?`, refresh, `...`, with trigger-scoped behavior.
- Task 2: Implemented explicit help/menu mutual exclusion lifecycle and cleanup on Escape, outside click, and rerender update.
- Task 3: Applied compact spacing pass and executed all feasible automated acceptance checks.

## Implementation Notes

- `frontend/charts/components/chart-card.js`
  - Header icon values normalized (`?`, `\u21BB`, `...`) and order preserved: `helpWrap`, `refresh`, `menuWrap`.
  - Added overlay lifecycle helpers:
    - `closeActionMenu()`
    - `closeHelpTooltip()`
    - `closeAllHeaderOverlays()`
    - `closeOverlaysOnEscape(...)`
  - `openHelpTooltip()` closes menu first.
  - `openActionMenu()` closes help first.
  - Pointer outside logic now closes each overlay if pointer target is outside that overlay/trigger, including clicks inside the same chart card body.
  - `update(...)` closes overlays before rerender work.

- `frontend/charts/styles/components.css`
  - Compacted chart-card chrome (header gap, chip/table spacing, footer height, icon button sizing, menu/icon spacing).
  - Preserved chart-height strategy:
    - `grid-template-rows: auto minmax(320px, 1fr) auto`
    - Chart body `min-height: 320px`
    - Chart body `height: 320px`

- `frontend/charts/styles/charts-page.css`
  - Reduced container/top-row/body/grid spacing to remove dead visual space while preserving shell and pane contracts.

## Verification Results

### Syntax checks

1. `node --check frontend/charts/app.js` — **PASS**
2. `node --check frontend/charts/components/tab-navigation.js` — **PASS**
3. `node --check frontend/charts/components/page-controls.js` — **PASS**
4. `node --check frontend/charts/components/date-filter.js` — **PASS**
5. `node --check frontend/charts/components/chart-card.js` — **PASS**

### Frontend tests

6. `python -m pytest tests/frontend` — **PASS** (`28 passed`)
   - Warning observed: `PytestCacheWarning` for `.pytest_cache` write permission (`WinError 5`), non-blocking for test assertions.

### Static acceptance assertions executed in this environment

7. Chart interaction assertions (`chart-card.js`) — **PASS**
   - Control order `helpWrap, refresh, menuWrap`
   - Help open closes menu first
   - Menu open closes help first
   - Per-overlay outside-click close behavior
   - Rerender update closes overlays
   - Help icon `?` and menu icon `...` literals

8. Rebaselined shell/controls contract assertions (`index.html`, `app.js`, `page-controls.js`) — **PASS**
   - Full-width app header markers (`Lighthouse 2.0`, `Charts`, disabled `Shape Agents` + `Coming soon`)
   - Legacy header block absence markers
   - Sidebar constants `320/440/360` and breakpoint `1400`
   - Grid lock `1/2`
   - Settings six-action contract
   - Metadata/System Info hidden markers

9. Chart-height strategy assertions (`components.css`) — **PASS**

## Manual Acceptance Status

- Manual browser interaction matrix (hover/focus/click visual checks and full shell geometry walkthrough) was **not executed in this session**.
- Automated checks are green; final phase-level signoff still needs manual visual/interaction verification.

## Deviations from Plan

None.

## Known Stubs

None.
