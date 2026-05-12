# Quick Plan - Context Menu Unit-Grouped Plot Actions

## Objective
Add two new context-menu actions on Charts page to plot sensors grouped by measurement unit, creating one chart per unique unit (including `N/A`).

## Scope
- Frontend behavior for two new actions:
  - Asset menu: `Plot Sensors by Unit`
  - Category menu: `Plot Category (group by units)`
- Backend + frontend wiring needed to carry unit metadata from attribute/sub-attribute payload into equipment sensor payload.
- Unit-group actions must be unavailable until unit metadata is loaded for the target equipment.
- No unrelated refactors.

## Naming Convention (Required)
- Context menu labels:
  - `Plot Sensors by Unit` (asset scope)
  - `Plot Category (group by units)` (category scope)
- Internal action IDs (proposed, consistent with existing action-key pattern):
  - `plotAssetByUnit`
  - `plotCategoryByUnit`
- Generated chart title pattern (must be deterministic):
  - Asset action: `{AssetName} - {UnitLabel}`
  - Category action: `{CategoryName} - {UnitLabel}`
- Unit label normalization:
  - Use canonical unit string resolved during equipment sensor load.
  - Missing/empty/null units map to literal `N/A` and all such sensors are grouped together.

## Tasks

### Task 1 - Add New Context-Menu Actions and Routing
- Files: Charts/context-menu action definitions and handlers currently used by asset/category actions.
- Action:
  - Add the two new menu entries in the same menu construction path as current plot actions.
  - Wire click handlers to a shared unit-group plotting entrypoint (no duplicate flow per menu type).
  - Keep existing actions and ordering intact except insertion of the two new actions.
- Verify (automated):
  - `rg "Plot Sensors by Unit|Plot Category \(group by units\)|plotAssetByUnit|plotCategoryByUnit" src`
- Done:
  - Both actions appear in code and route to executable handlers without breaking existing menu actions.

### Task 2 - Resolve Unit Metadata During Equipment Sensor Load
- Files: `backend/app/models/charts.py`, `backend/app/services/profiling_adapter.py`, frontend sensor normalization path in `frontend/charts/app.js`.
- Action:
  - Parse `unit_of_measurement` from item attributes when equipment sensors are fetched.
  - If `unit_of_measurement` is missing, derive unit from `sub_attributes` entries as fallback.
  - Include unit metadata in equipment sensor payload consumed by frontend.
  - Mark unit metadata as loaded even when resolved value is empty/null (so `N/A` grouping is explicit, not implicit).
- Verify (automated):
  - Backend test coverage proving unit is resolved from both direct field and sub-attributes.
- Done:
  - Equipment sensor payload always carries unit-metadata-loaded signal for plot-by-unit eligibility checks.

### Task 3 - Implement Frontend Gating + Unit Grouping
- Files: Existing chart action paths and focused frontend tests.
- Action:
  - Gate asset/category unit-group menu entries so they stay disabled until unit metadata for that equipment has been loaded.
  - Preserve existing `Plot by category`/`Plot all sensors` behavior.
  - Group by resolved unit and keep `N/A` bucket behavior when unit exists but is empty/null.
  - Add or update focused tests to prove:
    - Unit-group actions are gated by metadata readiness.
    - Unit grouping produces one chart per unique unit once metadata is ready.
    - Empty/missing units are grouped as `N/A`.
    - Existing `Plot by Category` behavior still works.
- Verify (automated):
  - `npm run test -- --runInBand` (or targeted spec command if available)
- Done:
  - Automated coverage exists for new action behavior, gating rules, and key regression guard on existing flow.

## Success Criteria
- Both context-menu actions are available and functional.
- Unit-group actions are disabled before unit metadata load and enabled afterward.
- Chart creation is unit-grouped with deterministic titles.
- `N/A` grouping is explicit and consolidated.
- Unit metadata is resolved from direct attribute fields and sub-attributes during equipment sensor load.
- No unrelated frontend/backend refactor introduced.
