# Phase 9 Validation: Plan Readiness (Rebaselined)

**Validated:** 2026-06-01  
**Scope:** Planning-only readiness check for rebaselined Phase 9 documents.  
**Verdict:** PASS (docs internally consistent with new layout contract).

## Inputs Read

- `09-CONTEXT.md`
- `09-RESEARCH.md`
- `09-01-PLAN.md`
- `09-02-PLAN.md`
- `09-03-PLAN.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`

## Rebaseline Consistency Check

| Removed from scope | Removed in docs |
|---|---|
| Left app-sidebar global navigation model | Yes |
| Equipment-driven auto-collapse of app sidebar | Yes |
| Hidden right-rail placeholder | Yes |
| System Info requirement/entrypoint | Yes |
| Grid lock `2-col`/`3-col` | Yes (now `1-col`/`2-col`) |

## Acceptance Gate Coverage

| Gate item | Covering plan/task | Status |
|---|---|---|
| Full-width app header is only row above charts tabs | 09-01 Task 1 | Covered |
| Header shows `Lighthouse 2.0`, active `Charts`, disabled `Shape Agents` tooltip-only | 09-01 Task 1 | Covered |
| Legacy breadcrumbs/title/subtitle removed | 09-01 Task 1 | Covered |
| Left pane docked and non-overlapping | 09-01 Task 2 | Covered |
| Left pane resize bounds `320-440` with default `360` | 09-01 Task 2 | Covered |
| Fullscreen force-open + `<1400` auto-collapse + remembered state | 09-01 Task 3 | Covered |
| Slim icon rail in collapsed state | 09-01 Task 3 | Covered |
| Single-active pane contexts (`Equipment/Sensors/Events`) | 09-01 Task 3 | Covered |
| Tabs row separate from controls row | 09-02 Task 1 | Covered |
| Quick ranges + reload/frequency behavior preserved | 09-02 Task 2 | Covered |
| Grid modes locked to `1-col` and `2-col` | 09-02 Task 2 | Covered |
| Settings menu exact six actions | 09-02 Task 3 | Covered |
| Metadata hidden (`Environment`, `Backend Contract`, `System Info`) | 09-02 Task 3 | Covered |
| Chart `?` does not open `...` | 09-03 Task 1 | Covered |
| Help/menu overlays mutually exclusive | 09-03 Task 2 | Covered |
| Compact chart chrome with stable chart-height strategy | 09-03 Task 3 | Covered |

## Sequencing Validity

| Plan | Wave | Depends on | Result |
|---|---:|---|---|
| 09-01 | 1 | none | Valid |
| 09-02 | 2 | 09-01 | Valid |
| 09-03 | 3 | 09-02 | Valid |

Dependency chain is linear and consistent with behavior ownership boundaries.

## Verification Command Coverage

| Plan | Core checks present |
|---|---|
| 09-01 | `node --check frontend/charts/app.js` + manual shell/pane matrix |
| 09-02 | `node --check` for tabs/controls/date-filter + metadata grep guard |
| 09-03 | `node --check` for chart-card + `python -m pytest tests/frontend` + integrated manual gate |

## Notes

- Phase 9 roadmap requirements remain `TBD`; this validation treats the rebaselined `09-CONTEXT.md` as the operative source of truth.
- Validation is planning-readiness only; implementation evidence will be required in future `*-SUMMARY.md` artifacts.
- This document supersedes prior Phase 9 validation that referenced removed scope (right rail/System Info/left app-sidebar model).
