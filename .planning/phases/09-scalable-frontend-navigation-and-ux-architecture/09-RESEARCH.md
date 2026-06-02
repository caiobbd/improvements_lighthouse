# Phase 9: Scalable Frontend Navigation and UX Architecture - Research (Rebaselined)

**Researched:** 2026-06-01  
**Domain:** Charts shell hierarchy, docked left pane behavior, compact controls, and chart interaction stability  
**Confidence:** HIGH

<user_constraints>
## Locked Decisions (Current)

- Full-width `Main Application Header Bar` above Charts tabs.
- Header content:
  - `Lighthouse 2.0`
  - app page tabs: `Charts` (active), `Shape Agents` (disabled, tooltip only)
- Legacy breadcrumbs/title/subtitle block removed.
- Left pane:
  - docked (never overlays charts)
  - resizable `320-440` (default `360`)
  - single-active context tabs: `Equipment`, `Sensors`, `Events`
  - collapsed slim icon rail remains visible
  - state precedence:
    - fullscreen: force open
    - viewport `< 1400`: auto-collapse
    - otherwise: remembered state
- Charts rows remain separated:
  - row 1: charts page tabs
  - row 2: charts controls
- Controls remain compact; quick ranges/reload/frequency preserved.
- Grid modes are `1-col` and `2-col` only.
- Metadata:
  - `Environment` and `Backend Contract` hidden in this phase
  - `System Info` out of scope
- "No blank spaces" means no dead side space or pane/graph overlap.
- Keep current chart-height strategy.

## Explicit Removed Scope

- Left app-sidebar global navigation model.
- App-sidebar auto-collapse by equipment expansion behavior.
- Hidden right-rail placeholder.
- System Info entrypoint/modal dependency.
- Old grid mode lock (`2-col` / `3-col`).
</user_constraints>

## Repo Facts (Current Implementation)

- Current page still uses legacy header/breadcrumb/title structure in `frontend/charts/index.html`.
- Current pane root is `#charts-sidebars` and uses fixed positioning/width in `frontend/charts/styles/components.css`.
- Charts tab row (`tab-navigation`) and controls row (`page-controls`) already exist as separate anchors in `frontend/charts/index.html`.
- Quick ranges and controls components are already modular (`date-filter.js`, `page-controls.js`, `tab-navigation.js`).

## Gap Analysis

| Target Contract | Current Evidence | Status | Planner Action |
|---|---|---:|---|
| Full-width app header above tabs only | Legacy header block still present | FAIL | Recompose shell in 09-01 |
| Docked non-overlapping pane | Fixed sidebar model risks overlay-style behavior | FAIL | Rebuild pane/workspace geometry in 09-01 |
| Pane resize `320-440`, default `360` | Not enforced as the new contract | FAIL | Add bounded resize + persisted width in 09-01 |
| State precedence (fullscreen / `<1400` / remembered) | Not codified end-to-end | FAIL | Implement deterministic precedence in 09-01 |
| `Shape Agents` disabled tooltip-only in app header | App header does not yet exist | FAIL | Implement app-header tabs in 09-01 |
| Grid modes `1-col` + `2-col` only | Older plan and controls assumed different pair | FAIL | Update control contract in 09-02 |
| Metadata hidden entirely | Prior docs expected System Info routing | FAIL | Remove metadata visibility + entrypoints in 09-02 |
| Help/menu mutual exclusion on chart cards | Prior leak existed in clustered handlers/styles | FAIL | Close in 09-03 |

## Risk Notes

- Layout risk: pane docking and workspace width calculations can regress chart grid sizing if CSS and runtime state drift.
- Responsiveness risk: precedence rules can conflict at threshold transitions if order is not explicit.
- Controls drift risk: stale label/mode contracts from older Phase 9 docs can re-enter during implementation unless tests/acceptance matrix is updated.
- Interaction risk: chart header help/menu behavior can regress if hover/focus handling remains cluster-scoped.

## Recommended Sequence

1. **09-01:** shell hierarchy + docked pane + precedence model.
2. **09-02:** tabs/controls exactness + grid mode lock + metadata removal from visible UI.
3. **09-03:** chart icon interaction isolation + compact chrome + final integrated gate.

## Verification Strategy

- Syntax guards per module:
  - `app.js`, `tab-navigation.js`, `page-controls.js`, `date-filter.js`, `chart-card.js`
- Manual gate for:
  - app header hierarchy
  - pane docking/resizing/preference precedence
  - row separation and controls exactness
  - grid 1/2 modes only
  - hidden metadata and disabled `Shape Agents`
  - chart help/menu isolation
- Regression check:
  - `python -m pytest tests/frontend`

## Source Files Reviewed

- `.planning/phases/09-scalable-frontend-navigation-and-ux-architecture/09-CONTEXT.md`
- `frontend/charts/index.html`
- `frontend/charts/app.js`
- `frontend/charts/components/tab-navigation.js`
- `frontend/charts/components/page-controls.js`
- `frontend/charts/components/date-filter.js`
- `frontend/charts/components/chart-card.js`
- `frontend/charts/styles/charts-page.css`
- `frontend/charts/styles/components.css`

## Metadata

**Valid until:** Phase 9 implementation changes shell/layout contracts again.  
**Notes:** This research supersedes earlier Phase 9 research that depended on left app-sidebar, right-rail placeholder, and System Info scope.
