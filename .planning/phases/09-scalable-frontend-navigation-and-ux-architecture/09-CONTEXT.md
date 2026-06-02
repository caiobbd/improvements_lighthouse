---
phase: "09"
name: "scalable-frontend-navigation-and-ux-architecture"
created: 2026-05-15
updated: 2026-06-01
---

# Phase 9: scalable-frontend-navigation-and-ux-architecture - Context (Rebaselined)

## Decisions

- Application navigation model:
  - Use a full-width `Main Application Header Bar` above the Charts workspace.
  - Header left content is `Lighthouse 2.0`.
  - Application pages are text tabs in the same header row:
    - `Charts` (active)
    - `Shape Agents` (visible, disabled)
  - Clicking `Shape Agents` does not navigate; it shows tooltip-only feedback (`Coming soon`).
- Header/shell hierarchy:
  - The main application header is the only row above Charts page tabs.
  - Remove the current legacy breadcrumbs/title/subtitle block from visible UI.
  - Keep Charts page tabs and Charts controls in separate rows under the app header.
- Left pane model:
  - Left pane is docked and must never overlay chart canvases.
  - Main chart workspace starts to the right of the pane and reflows with pane width changes.
  - Left pane is resizable with bounds `320px` to `440px`, default `360px`.
  - Left pane uses a single active context selector:
    - `Equipment`
    - `Sensors`
    - `Events`
  - Keep context-specific filter/search actions on the left and align the row with right-side controls.
- Left pane state precedence:
  - Entering browser full-screen forces pane open.
  - Outside full-screen, restore remembered open/collapsed state.
  - When viewport width is below `1400px`, auto-collapse overrides remembered open state.
  - Collapsed mode keeps a slim icon rail visible for fast reopen.
- Top-area controls:
  - Charts page tabs remain browser-like with trailing `+` tab for page creation.
  - Quick ranges remain `24H`, `1W`, `4W`, `90D`, `Custom`.
  - Reload/frequency coupling behavior remains.
  - Grid controls are icon-only with exactly two modes: `1-col` and `2-col`.
  - Settings gear keeps existing page actions contract (`Columns selector`, `Add chart`, `Save page`, `Rename page`, `Duplicate page`, `Delete page`).
- Metadata visibility:
  - `Environment` and `Backend Contract` metadata are hidden entirely in this phase.
  - `System Info` is out of scope for this phase (no entrypoint).
- Density rule:
  - "No blank spaces" is enforced as removal of dead side space and layout overlap.
  - Keep chart-height strategy unchanged; no aggressive chart-height shrink in this phase.
- Visual style:
  - Keep Lighthouse light palette and operational readability.
  - Avoid decorative hero/marketing treatment and avoid dark header block regressions.

## Locked Corrections From Rebaseline

- Replace old Phase 9 assumptions:
  - Remove left app-sidebar global navigation model.
  - Remove app-sidebar auto-collapse by equipment expansion requirement.
  - Remove hidden right-rail placeholder requirement.
  - Remove System Info modal dependency for metadata.
  - Replace old grid lock (`2-col` / `3-col`) with new lock (`1-col` / `2-col`).
- Preserve previous valid constraints:
  - Tabs and controls remain separated.
  - Help/actions menu isolation and compact chart behavior remain required.

## Acceptance Gate (Must Pass Before Phase 9 Completion)

- Main application header is full-width and is the only row above Charts tabs.
- Header content includes `Lighthouse 2.0`, `Charts` (active), and `Shape Agents` (disabled with tooltip-only behavior).
- Legacy breadcrumb/title/subtitle header block is removed.
- Left pane is docked and non-overlapping with charts in all states.
- Left pane supports `Equipment/Sensors/Events` single-active context switching.
- Left pane width is resizable (`320-440`) with default `360`.
- Full-screen always opens the pane.
- Below `1400px`, pane auto-collapses; above `1400px`, remembered state applies.
- Collapsed pane shows slim icon rail reopen affordance.
- Charts tabs row and controls row remain separate and compact.
- Top-right controls keep quick-range + reload/frequency contracts.
- Grid controls expose only `1-col` and `2-col`.
- `Environment`/`Backend Contract` and `System Info` are not visible in this phase.
- Existing chart interaction behavior remains stable (`?`, refresh, `...` boundaries in 09-03 scope).

## Discretion Areas

- Exact class/module boundaries used to express the app header and docked pane.
- Exact icon set for collapsed pane rail and controls, provided semantics stay clear.
- Exact pane-resize handle UX details (hit area, cursor, persistence key naming).
- Minor spacing/token tuning needed to keep controls compact and readable.

## Deferred Ideas

- Activating real content/routing for `Shape Agents`.
- Reintroducing a metadata details surface (`System Info` or equivalent) in a later phase.
- Any right-side rail/panel expansion in future phases.
