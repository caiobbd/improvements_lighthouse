---
phase: "09"
name: "scalable-frontend-navigation-and-ux-architecture"
created: 2026-05-15
---

# Phase 9: scalable-frontend-navigation-and-ux-architecture — Context

## Decisions

- Global navigation:
  - Primary application navigation is a left sidebar.
  - Sidebar is collapsible and starts expanded by default.
  - Collapsed state uses icon-only navigation.
- Current-page navigation:
  - Equipment tree is a secondary sidebar placed immediately to the right of app navigation.
  - When equipment tree is expanded, the main app sidebar should auto-collapse to preserve workspace width.
- Top-area information architecture:
  - Technical metadata (`Environment`, `Backend Contract`) must be removed from persistent header display.
  - Metadata is available only through a `System Info` modal.
- Top-area control density:
  - Tabs live in their own dedicated row (browser-tab style).
  - `Create page` is a `+` tab immediately after the last tab.
  - Time-range controls move to top-right as explicit quick-range buttons (locked set: `24H`, `1W`, `4W`, `90D`, `Custom`).
  - `Custom` opens date-range UI adjacent to the clicked custom button.
  - `Reload data` appears next to a frequency toggle:
    - Toggle `off`: frequency options hidden and default/auto behavior applied.
    - Toggle `on`: frequency options become visible for manual selection.
  - Frequency options are manual-window values shown in a dropdown only when toggle is on.
  - Reload scope is all charts in active page (same behavior as current `Refresh Data`).
  - Grid layout is icon-only and color-state driven (no text-heavy grid buttons), with only `2-col` and `3-col` options.
  - A single gear settings menu contains remaining workspace options.
  - Settings menu contents (locked):
    - `Columns selector`
    - `Add chart`
    - `Save page`
    - `Rename page`
    - `Duplicate page`
    - `Delete page`
- Chart-card header controls:
  - Replace text buttons (`Refresh`, `?`, `Actions`) with icon-only controls.
  - `?` help button remains functional as-is but is positioned leftmost in the chart action cluster.
  - Refresh uses page-refresh symbol/icon semantics.
  - Actions opens an options list/menu.
  - Hover state must clearly highlight only the hovered icon button.
- Plot area space efficiency:
  - Increase usable plotting area by reducing non-essential chart chrome (header/footer density and internal paddings).
  - Keep legend/context available while reducing default vertical footprint.
  - Preserve current plot drawing height; optimize surrounding chrome and dead margins instead.
  - Preserve readability of axes and interaction affordances while minimizing dead margins.
- Right-sidebar future slot:
  - Build structural placeholder in code only.
  - Keep it off by default and out of visible UX for this phase.
- Visual style:
  - Keep Lighthouse light palette.
  - No dark header blocks or dark-mode-like top section treatment.
- Baseline reset before implementation:
  - Revert prior experimental `frontend/charts` UI edits and restart from production-style baseline.
  - Preserve existing Charts functionality while restructuring layout/navigation.

## Locked Corrections From Latest Review

- The current in-progress implementation is rejected as target output and must be replaced with the locked control model above.
- Explicit defects observed and required to be fixed:
  - Tabs are not rendered as a dedicated browser-like row.
  - `+` tab creation is missing next to the last tab.
  - Legacy page actions (`New Page`, `Actions`, inline `Edit`/`X`) still appear as separate noisy controls.
  - Time controls still render as old preset + date-input rows instead of compact top-right quick-range buttons.
  - Reload/frequency controls are not implemented as a coupled icon+toggle pattern with conditional manual dropdown visibility.
  - Grid control still exposes legacy text modes and wrong options instead of icon-only `2-col` / `3-col`.
  - Required settings actions are not consolidated into a single gear menu.
  - Vertical space usage worsened due to stacked rows and duplicated controls.
  - Chart header control leakage bug exists: hovering `?` also opens the `...` actions menu.
  - Help tooltip and actions menu overlap visually and behaviorally; overlays must be mutually exclusive.

## Acceptance Gate (Must Pass Before Phase 9 Completion)

- Tabs row is browser-like and isolated from toolbar controls.
- `+` tab creates new page and is positioned immediately after the last tab.
- Top-right row includes quick ranges (`24H`, `1W`, `4W`, `90D`, `Custom`), reload icon, frequency toggle, conditional manual dropdown, grid icons, and gear menu.
- Gear menu contains exactly:
  - `Columns selector`
  - `Add chart`
  - `Save page`
  - `Rename page`
  - `Duplicate page`
  - `Delete page`
- No legacy duplicated top controls remain visible.
- Chart header controls are icon-only; `?` remains leftmost and does not trigger `...` menu.
- `...` menu opens only from `...` interaction; help tooltip and action menu cannot be open simultaneously.
- Plot drawing height remains unchanged while surrounding chrome is reduced.

## Discretion Areas

- Exact component boundaries and module splits for navigation shell, as long as current Charts behavior is preserved.
- Token-level spacing/typography tuning for compact controls, as long as readability remains operator-grade.
- Specific icon choices for controls/actions, as long as icon semantics are clear and aligned with existing UI patterns.
- Implementation mechanism for hiding/future-flagging the right-sidebar placeholder.

## Deferred Ideas

- Activate and populate the right sidebar for future workflows/features.
- Revisit whether select technical metadata deserves a tiny footer status indicator after initial rollout feedback.
