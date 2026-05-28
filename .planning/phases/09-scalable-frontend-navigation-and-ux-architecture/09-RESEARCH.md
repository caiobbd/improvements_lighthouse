# Phase 9: Scalable Frontend Navigation and UX Architecture - Research

**Researched:** 2026-05-15
**Domain:** Charts frontend navigation, toolbar, chart-card interaction, and layout architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Locked Corrections From Latest Review

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

### Acceptance Gate

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

### Claude's Discretion

- Exact component boundaries and module splits for navigation shell, as long as current Charts behavior is preserved.
- Token-level spacing/typography tuning for compact controls, as long as readability remains operator-grade.
- Specific icon choices for controls/actions, as long as icon semantics are clear and aligned with existing UI patterns.
- Implementation mechanism for hiding/future-flagging the right-sidebar placeholder.

### Deferred Ideas (OUT OF SCOPE)

- Activate and populate the right sidebar for future workflows/features.
- Revisit whether select technical metadata deserves a tiny footer status indicator after initial rollout feedback.
</user_constraints>

## Project Constraints

- No `CLAUDE.md` file was present at repo root, so no additional Claude-specific directives were found. [VERIFIED: `Test-Path CLAUDE.md`]
- No `.claude/skills/` or `.agents/skills/` project skill directory was present. [VERIFIED: `Test-Path .claude/skills`; `Test-Path .agents/skills`]
- Planning refinement must not edit product code; only this phase research artifact is in scope. [VERIFIED: user request]

## Summary

The current in-progress implementation partially satisfies the top-control acceptance gate: `tab-navigation.js` renders a browser-tab strip with a trailing add tab, `date-filter.js` exposes the locked quick ranges, and `page-controls.js` colocates date controls, reload, frequency, grid, and settings in a right-side cluster. [VERIFIED: `frontend/charts/components/tab-navigation.js`; `frontend/charts/components/date-filter.js`; `frontend/charts/components/page-controls.js`]

The highest-priority gaps are not broad UX questions; they are exactness and event-boundary defects. The gear menu has an extra `System Info` item and non-exact labels, while the chart action menu still opens from the whole `.chart-actions` cluster and from `:focus-within`, so hovering or focusing `?` can open the `...` menu. [VERIFIED: `frontend/charts/components/page-controls.js:194`; `frontend/charts/components/chart-card.js:2322`; `frontend/charts/styles/components.css:1303`]

**Primary recommendation:** repair Phase 9 in this order: shell/sidebar boundaries, top-control exactness, chart-card overlay isolation, density pass, then acceptance-gate verification. [VERIFIED: `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-CONTEXT.md`]

## Gap Analysis

| Acceptance / locked item | Current evidence | Status | Planner action |
|---|---|---:|---|
| Primary app sidebar exists, collapsible, starts expanded; equipment tree is secondary sidebar immediately right of it. | Current DOM has one `<aside id="charts-sidebars">`; `renderSidebars()` renders equipment/sensor panes inside one fixed sidebar, not a distinct app nav plus current-page nav. [VERIFIED: `frontend/charts/index.html:40`; `frontend/charts/app.js:1985`] | FAIL | Plan 09-01 must split global app nav from equipment nav before polishing top controls. |
| Equipment expansion auto-collapses app sidebar. | Current sidebar collapse state is a single `charts-sidebars.collapsed` state; no distinct app sidebar state was found in inspected anchors. [VERIFIED: `frontend/charts/app.js:1989`; `frontend/charts/styles/components.css:1665`] | FAIL | Add explicit state contract for app nav and equipment nav; do not overload current equipment sidebar collapse. |
| Tabs row is browser-like and isolated from toolbar controls. | `renderTabNavigation()` creates `.browser-tab-strip`; `index.html` separates `.surface-top-row` from `.surface-control-row`. [VERIFIED: `frontend/charts/components/tab-navigation.js:45`; `frontend/charts/index.html:59`] | PASS/PRESERVE | Keep `tab-navigation.js` scoped to tabs only. |
| `+` tab creates a new page immediately after last tab. | `createAddTabButton()` appends after all pages and calls `actions.addPage()`. [VERIFIED: `frontend/charts/components/tab-navigation.js:24`; `frontend/charts/components/tab-navigation.js:50`] | PASS/PRESERVE | Add/keep regression check for visual position and action wiring. |
| Top-right row includes `24H`, `1W`, `4W`, `90D`, `Custom`, reload, frequency toggle, conditional dropdown, grid icons, gear. | `date-filter.js` defines the exact quick-range labels; `page-controls.js` renders date filter, refresh/frequency, grid, and settings into `.page-controls-right-cluster`. [VERIFIED: `frontend/charts/components/date-filter.js:3`; `frontend/charts/components/page-controls.js:460`] | PASS/PRESERVE | Keep this boundary; only tighten labels/placement if visual review fails. |
| Gear menu contains exactly `Columns selector`, `Add chart`, `Save page`, `Rename page`, `Duplicate page`, `Delete page`. | Current menu contains extra `System Info`; labels are `Columns Selector`, `Add Chart`, dirty label `Save Page*`, `Rename Page`, `Duplicate Page`, `Delete Page`. [VERIFIED: `frontend/charts/components/page-controls.js:194`; `frontend/charts/components/page-controls.js:202`; `frontend/charts/components/page-controls.js:223`] | FAIL | Move `System Info` entrypoint out of gear and normalize labels exactly. |
| No legacy duplicated top controls remain visible. | No `New Page`, legacy top `Actions`, inline `Edit`, or inline `X` top-control strings were found in the inspected top-control files. [VERIFIED: `rg` across requested files] | PASS WITH WATCH | During shell rework, do not reintroduce separate page action buttons. |
| Persistent technical metadata is removed from header surface. | `Environment` and `Backend Contract` are modal-only in `app.js`; persistent header still has `Chart Engine` and `Data Source` KPI cells. [VERIFIED: `frontend/charts/app.js:93`; `frontend/charts/index.html:43`] | PARTIAL | Decide whether `Chart Engine`/`Data Source` count as low-signal top metadata; safest path is to remove the KPI strip during shell pass. |
| Chart header controls are icon-only and `?` is leftmost. | `chart-card.js` appends help, refresh, and menu buttons in that order; refresh and menu use glyphs rather than text labels. [VERIFIED: `frontend/charts/components/chart-card.js:903`; `frontend/charts/components/chart-card.js:946`] | PASS/PRESERVE | Preserve button order while changing event ownership. |
| `?` does not trigger `...` menu. | `.chart-actions` listens for `mouseenter` and `focusin` and opens the action menu for the whole cluster, which includes `helpWrap`. [VERIFIED: `frontend/charts/components/chart-card.js:946`; `frontend/charts/components/chart-card.js:2322`] | FAIL | Move menu open/close behavior to the `...` trigger and menu only. |
| `...` menu opens only from `...`; help tooltip and action menu cannot be open simultaneously. | CSS displays menu when `.chart-actions:focus-within`; help tooltip opens through `.chart-help.open`, with no mutual exclusion state. [VERIFIED: `frontend/charts/styles/components.css:1252`; `frontend/charts/styles/components.css:1303`] | FAIL | Use explicit `is-help-open` / `is-menu-open` state and close one before opening the other. |
| Plot drawing height remains unchanged while chrome is reduced. | `renderLineChart()` is still called with `height: 300`; card body is `height: 320px`; card/footer chrome remains sizable. [VERIFIED: `frontend/charts/components/chart-card.js:1864`; `frontend/charts/styles/components.css:526`; `frontend/charts/styles/components.css:641`] | PARTIAL | Freeze chart draw height at 300, then reduce header/footer/card padding only. |

## Rework Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| UI regression from sidebar fixed positioning | `.charts-sidebars` is fixed at 680px and independent of `.charts-workspace-layout`, so adding a primary app nav can obscure or squeeze workspace if shell grid is not rebuilt first. [VERIFIED: `frontend/charts/styles/components.css:1665`] | Establish app shell grid in `index.html`/`charts-page.css` before sidebar JS changes. |
| Interaction conflict in chart-card controls | Menu state is owned by `.chart-actions`, not by the `...` button, so help and menu interactions leak across controls. [VERIFIED: `frontend/charts/components/chart-card.js:2322`; `frontend/charts/styles/components.css:1303`] | Refactor `chart-card.js` to button-scoped handlers; remove `.chart-actions:focus-within` menu display. |
| Legacy CSS leakage into new controls | Broad `.icon-button`, `.secondary-button`, `.chart-actions`, and `.page-toolbar-icon-button` styles affect multiple control surfaces. [VERIFIED: `frontend/charts/styles/components.css:83`; `frontend/charts/styles/components.css:1187`] | Add narrower classes for Phase 9 shell/toolbars; avoid changing base button rules unless required. |
| Gear menu acceptance failure from label exactness | Acceptance gate says the menu contains exactly six labels; current code has seven entries and title-case variants. [VERIFIED: `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-CONTEXT.md`; `frontend/charts/components/page-controls.js:194`] | Treat menu text as testable contract, not styling copy. |
| Plot density regression | Phase requires unchanged plot drawing height, but density work touches card/grid CSS and can accidentally reduce SVG plot area. [VERIFIED: `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-CONTEXT.md`; `frontend/charts/components/chart-card.js:1864`] | Measure `height: 300` call and rendered `.chart-card-body` before/after; only reduce chrome around it. |
| Header clutter remains after metadata relocation | The rejected implementation already removed `Environment`/`Backend Contract` from header, but the KPI strip still spends above-fold space on `Chart Engine` and `Data Source`. [VERIFIED: `frontend/charts/index.html:43`] | Remove or relocate KPI strip during shell pass unless stakeholder explicitly wants it retained. |

## Recommended Execution Order

1. **Shell and navigation contract (`index.html`, `app.js`, `charts-page.css`, sidebar CSS).** Create a real app shell with primary app sidebar, secondary equipment sidebar, main workspace, and hidden right-rail placeholder; keep chart DOM anchors stable. [VERIFIED: `09-01-PLAN.md`]
2. **Top-control exactness (`tab-navigation.js`, `page-controls.js`, `date-filter.js`, `components.css`).** Preserve the working browser tabs and quick ranges, but make the gear menu exactly six items and relocate `System Info` outside gear. [VERIFIED: `09-02-PLAN.md`; `frontend/charts/components/page-controls.js:194`]
3. **Chart-card interaction isolation (`chart-card.js`, chart-card CSS only).** Scope menu open/close to the `...` button/menu and make help/menu mutually exclusive. [VERIFIED: `09-03-PLAN.md`; `frontend/charts/components/chart-card.js:2322`]
4. **Plot/chrome density (`components.css`, `charts-page.css`; `d3-line-chart.js` only if margin math requires it).** Keep `renderLineChart({ height: 300 })` unchanged and reduce surrounding chrome. [VERIFIED: `frontend/charts/components/chart-card.js:1864`]
5. **Verification pass.** Run syntax checks, then manual acceptance matrix; add targeted frontend tests only where DOM string/event contracts can be tested cheaply. [VERIFIED: `pytest.ini`; `tests/frontend/`]

## Module Boundaries

| Module | Owns | Must not own |
|---|---|---|
| `frontend/charts/components/tab-navigation.js` | Browser-like tabs, active state, dirty marker, trailing `+` tab. [VERIFIED: file read] | Page actions, settings, date controls. |
| `frontend/charts/components/date-filter.js` | Quick-range buttons and adjacent custom range popover. [VERIFIED: file read] | Reload/frequency/grid/settings. |
| `frontend/charts/components/page-controls.js` | Top-right toolbar composition, reload/frequency, grid icons, exact six-item gear menu. [VERIFIED: file read] | System Info modal payload or chart-card actions. |
| `frontend/charts/app.js` | Shell state, sidebars, System Info modal, action wiring into components. [VERIFIED: `frontend/charts/app.js:83`; `frontend/charts/app.js:1985`] | Component DOM styling details. |
| `frontend/charts/components/chart-card.js` | Chart-card title controls, help tooltip, refresh, `...` menu, per-chart data loading. [VERIFIED: file read] | Page toolbar or app shell controls. |
| `frontend/charts/styles/charts-page.css` | Page shell, workspace rows, chart grid layout. [VERIFIED: file read] | Generic button behavior. |
| `frontend/charts/styles/components.css` | Component-specific visual states; should keep Phase 9 selectors narrow. [VERIFIED: file read] | Global layout assumptions that belong in `charts-page.css`. |

## Verification Matrix

| Gate item | Automated check | Manual check |
|---|---|---|
| App sidebar + equipment sidebar order | `node --check frontend/charts/app.js` after shell changes. [VERIFIED: existing plan command] | Expanded app nav appears left of equipment nav; opening equipment auto-collapses app nav. |
| Hidden right-sidebar placeholder | Inspect DOM/class; verify no visible right panel. [VERIFIED: locked decision] | No new right-side UI appears in default Charts page. |
| Tabs isolated and browser-like | `node --check frontend/charts/components/tab-navigation.js`. [VERIFIED: existing plan command] | Tabs sit in their own row; toolbar controls are not in the tab row. |
| `+` tab creates page | DOM check for `.browser-tab-add`; click smoke. [VERIFIED: `frontend/charts/components/tab-navigation.js:33`] | New page is created immediately after clicking trailing `+`. |
| Quick ranges and custom popover | `node --check frontend/charts/components/date-filter.js`. [VERIFIED: existing plan command] | `24H`, `1W`, `4W`, `90D`, `Custom`; custom UI opens adjacent to `Custom`. |
| Reload/frequency coupling | `node --check frontend/charts/components/page-controls.js`. [VERIFIED: existing plan command] | Toggle off hides manual dropdown; toggle on shows manual dropdown; reload refreshes active page charts. |
| Grid icons only | DOM check for two grid buttons and no text grid modes. [VERIFIED: `frontend/charts/components/page-controls.js:55`] | Only 2-column and 3-column icon controls are visible. |
| Gear menu exactness | DOM/text assertion for exactly six labels in exact case. [VERIFIED: acceptance gate] | Gear contains only `Columns selector`, `Add chart`, `Save page`, `Rename page`, `Duplicate page`, `Delete page`. |
| No duplicated legacy top controls | `rg -n "New Page|inline Edit|Refresh Data|Actions" frontend/charts`. [VERIFIED: locked corrections] | No separate top `New Page`, `Actions`, inline edit, or delete controls are visible. |
| Chart help/menu isolation | Add or manually run event smoke around `?` and `...`. [VERIFIED: current bug source] | Hover/focus `?` opens only help; click/focus `...` opens only menu; opening one closes the other. |
| Plot height unchanged and chrome reduced | Confirm `renderLineChart({ height: 300 })` remains unchanged. [VERIFIED: `frontend/charts/components/chart-card.js:1864`] | Chart body still draws same plot height; header/footer/card chrome visibly tighter. |

## Validation Architecture

| Property | Value |
|---|---|
| Nyquist validation | Enabled in `.planning/config.json`. [VERIFIED: `.planning/config.json`] |
| Syntax checks | `node --check frontend/charts/app.js`; `node --check frontend/charts/components/tab-navigation.js`; `node --check frontend/charts/components/page-controls.js`; `node --check frontend/charts/components/date-filter.js`; `node --check frontend/charts/components/chart-card.js`. [VERIFIED: phase plans] |
| Existing test framework | `pytest` configured by `pytest.ini`; frontend tests exist under `tests/frontend/`. [VERIFIED: `pytest.ini`; `rg --files`] |
| Full frontend test command | `python -m pytest tests/frontend`. [VERIFIED: `09-03-PLAN.md`] |
| Current gap | Existing frontend tests cover prior chart interactions, but no dedicated test file for Phase 9 toolbar exactness or chart help/menu mutual exclusion was found. [VERIFIED: `tests/frontend/` file list] |

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Removing the KPI strip is the safest interpretation of "operationally relevant content above the fold" and metadata de-cluttering, but the locked text only explicitly names `Environment` and `Backend Contract`. [ASSUMED] | Gap Analysis / Rework Risks | Planner may remove a strip the stakeholder wanted retained; confirm before deletion if not obvious in UI review. |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-CONTEXT.md` - locked decisions, corrections, acceptance gate. [VERIFIED: file read]
- `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-01-PLAN.md` - shell/navigation planned scope. [VERIFIED: file read]
- `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-02-PLAN.md` - tabs/top-control planned scope. [VERIFIED: file read]
- `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-03-PLAN.md` - modal/chart-card/density planned scope. [VERIFIED: file read]
- `frontend/charts/index.html` - current DOM anchors and persistent top content. [VERIFIED: file read]
- `frontend/charts/components/tab-navigation.js` - current tab implementation. [VERIFIED: file read]
- `frontend/charts/components/page-controls.js` - current toolbar/gear implementation. [VERIFIED: file read]
- `frontend/charts/components/date-filter.js` - current quick range/custom implementation. [VERIFIED: file read]
- `frontend/charts/components/chart-card.js` - current chart header/action implementation. [VERIFIED: file read]
- `frontend/charts/styles/components.css` - current component interaction and sidebar styles. [VERIFIED: file read]
- `frontend/charts/styles/charts-page.css` - current page layout and chart grid styles. [VERIFIED: file read]

### Secondary (MEDIUM confidence)

- `rg` searches over requested files for legacy top-control strings and Phase 9 selectors. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Gap analysis: HIGH - directly compared acceptance gate against requested source files.
- Rework risks: HIGH - risks map to concrete selectors/event handlers/DOM locations.
- Execution order: HIGH - order follows plan dependencies and observed current gaps.

**Research date:** 2026-05-15
**Valid until:** Phase 9 implementation resumes or any inspected frontend file changes.
