# Quick Plan — Context Menu Unit-Grouped Plot Actions

## Objective
Add two new context-menu actions on Charts page to plot sensors grouped by measurement unit, reusing existing `Plot by Category` data/API flow and creating one chart per unique unit (including `N/A`).

## Scope
- Frontend-only behavior for two new actions:
  - Asset menu: `Plot Sensors by Unit`
  - Category menu: `Plot Category (group by units)`
- No backend contract changes.
- No unrelated refactors.

## Naming Convention (Required)
- Context menu labels:
  - `Plot Sensors by Unit` (asset scope)
  - `Plot Category (group by units)` (category scope)
- Internal action IDs (proposed, consistent with existing action-key pattern):
  - `plotAssetByUnit`
  - `plotCategoryByUnit`
- Generated chart title pattern (must be deterministic):
  - Asset action: `{AssetName} — {UnitLabel}`
  - Category action: `{CategoryName} — {UnitLabel}`
- Unit label normalization:
  - Use canonical unit string from same metadata path used by `Plot by Category`.
  - Missing/empty/null units map to literal `N/A` and all such sensors are grouped together.

## Tasks

### Task 1 — Add New Context-Menu Actions and Routing
- Files: Charts/context-menu action definitions and handlers currently used by asset/category actions.
- Action:
  - Add the two new menu entries in the same menu construction path as current plot actions.
  - Wire click handlers to a shared unit-group plotting entrypoint (no duplicate flow per menu type).
  - Keep existing actions and ordering intact except insertion of the two new actions.
- Verify (automated):
  - `rg "Plot Sensors by Unit|Plot Category \(group by units\)|plotAssetByUnit|plotCategoryByUnit" src`
- Done:
  - Both actions appear in code and route to executable handlers without breaking existing menu actions.

### Task 2 — Implement Unit-Grouped Chart Creation Reusing Plot-by-Category Data Flow
- Files: Existing chart-creation pipeline used by `Plot by Category` and any helper used for tag/sensor grouping.
- Action:
  - Reuse the same payload assembly, fetch path, and chart instantiation behavior as current `Plot by Category`.
  - Before chart creation, group selected sensors by normalized unit value.
  - For each unique unit bucket (including `N/A`), create exactly one new chart containing sensors from that unit only.
  - Apply chart title convention from this plan for both asset and category triggers.
  - Do not introduce new API fields/endpoints/contracts.
- Verify (automated):
  - `npm run test -- --runInBand` (or project-equivalent fast test command covering chart action flow)
  - `rg "N/A|group by unit|plotAssetByUnit|plotCategoryByUnit" src`
- Done:
  - Triggering either new action produces one chart per unique unit with correct sensor partitioning and existing API behavior unchanged.

### Task 3 — Guardrails and Regression Check for Existing Plot-by-Category Behavior
- Files: Existing tests/specs for chart actions; add/adjust focused tests if absent.
- Action:
  - Add or update focused tests to prove:
    - Unit grouping produces one chart per unique unit.
    - Empty/missing units are grouped as `N/A`.
    - Existing `Plot by Category` behavior still works with unchanged request contract.
  - Keep test changes scoped to this feature path.
- Verify (automated):
  - `npm run test -- --runInBand` (or targeted spec command if available)
- Done:
  - Automated coverage exists for new action behavior and key regression guard on existing flow.

## Success Criteria
- Both context-menu actions are available and functional.
- Chart creation is unit-grouped with deterministic titles.
- `N/A` grouping is explicit and consolidated.
- Existing `Plot by Category` backend/data contract remains unchanged.
- No unrelated frontend refactor introduced.
