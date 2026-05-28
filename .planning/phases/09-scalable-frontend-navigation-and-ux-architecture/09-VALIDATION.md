# Phase 9 Validation: Plan Readiness

**Validated:** 2026-05-15  
**Scope:** Planning-only readiness check for revised Phase 9 plans.  
**Verdict:** PASS after plan-doc patch.

## Inputs Read

- `09-CONTEXT.md`
- `09-RESEARCH.md`
- `09-01-PLAN.md`
- `09-02-PLAN.md`
- `09-03-PLAN.md`
- `.planning/ROADMAP.md`
- `.planning/config.json`
- `.codex/get-shit-done/references/gates.md`

## Acceptance Gate Coverage

| Gate item | Covering plan/task | Status |
|---|---|---|
| Browser-like isolated tabs row | 09-02 Task 1 | Covered |
| `+` tab immediately after last tab creates page | 09-02 Task 1 | Covered |
| Top-right quick ranges, reload, frequency toggle/dropdown, grid icons, gear | 09-02 Task 2 | Covered |
| Gear menu contains exactly six locked labels | 09-02 Task 3 | Covered |
| No legacy duplicated top controls visible | 09-02 Tasks 1 and 3 | Covered |
| Chart header controls icon-only, `?` leftmost | 09-03 Task 1 | Covered |
| `?` does not trigger `...` menu | 09-03 Task 1 | Covered |
| `...` opens only from `...`; help/menu mutually exclusive | 09-03 Task 2 | Covered |
| Plot drawing height unchanged while chrome is reduced | 09-03 Task 3 | Covered |
| Primary app sidebar plus secondary equipment sidebar | 09-01 Tasks 1 and 2 | Covered |
| Equipment expansion auto-collapses app sidebar | 09-01 Task 2 | Covered |
| Metadata only through System Info | 09-01 Tasks 1 and 3 | Covered |
| Hidden right-sidebar future slot, not visible by default | 09-01 Task 1 | Covered |
| Lighthouse light palette/no dark header treatment | 09-01 Task 1 | Covered after patch |
| Baseline reset from rejected experimental shell/header/sidebar treatment | 09-01 Task 1 | Covered after patch |

## Sequencing

| Plan | Wave | Depends on | Reason |
|---|---:|---|---|
| 09-01 | 1 | none | Establishes shell/sidebar/metadata anchors first. |
| 09-02 | 2 | 09-01 | Builds top controls against stable shell anchors. |
| 09-03 | 3 | 09-02 | Fixes chart-card overlays and density, then runs final acceptance matrix. |

Dependency graph is valid and acyclic. Shared files are sequenced, not parallelized.

## Nyquist Compliance

| Task | Plan | Wave | Automated command(s) | Status |
|---|---|---:|---|---|
| Establish explicit shell landmarks | 09-01 | 1 | `node --check frontend/charts/app.js` | PASS |
| Split sidebar state | 09-01 | 1 | `node --check frontend/charts/app.js` | PASS |
| Wire System Info | 09-01 | 1 | `node --check frontend/charts/app.js` | PASS |
| Lock browser-tab row | 09-02 | 2 | `node --check frontend/charts/components/tab-navigation.js` | PASS |
| Implement top-right controls | 09-02 | 2 | `node --check frontend/charts/components/page-controls.js`; `node --check frontend/charts/components/date-filter.js` | PASS |
| Enforce gear exactness | 09-02 | 2 | `node --check frontend/charts/components/page-controls.js`; `powershell ... rg ...` | PASS |
| Scope chart header interactions | 09-03 | 3 | `node --check frontend/charts/components/chart-card.js` | PASS |
| Mutual exclusion overlays | 09-03 | 3 | `node --check frontend/charts/components/chart-card.js` | PASS |
| Density and final gate | 09-03 | 3 | `node --check frontend/charts/components/chart-card.js`; `rg ... renderLineChart`; `python -m pytest tests/frontend` | PASS |

Sampling: every implementation task has an automated check, plus manual checks for DOM layout and interaction behavior that syntax tests cannot prove.

## Readiness Notes

- Formal roadmap requirements for Phase 9 are still `TBD`; this validation uses `09-CONTEXT.md` locked decisions, corrections, and acceptance gate as the operative requirement source.
- `CLAUDE.md`, `.claude/skills/`, and `.agents/skills/` were not present, so no project-specific skill or Claude directive conflicts were found.
- No product/frontend code was edited during this validation.

## Remaining Execution Watch Items

- Visual review must verify that baseline reset removes rejected shell/header/sidebar treatment instead of preserving it behind new markup.
- Gear-menu exactness is brittle by design: label case and extra entries should be treated as acceptance failures.
- Chart overlay isolation must be checked with hover, focus, click, Escape, outside click, and rerender paths because the existing defect is event-boundary related.
- Plot-height preservation requires visual comparison in addition to the `height: 300` string guard; chrome can shrink while the plot draw area remains constant.
