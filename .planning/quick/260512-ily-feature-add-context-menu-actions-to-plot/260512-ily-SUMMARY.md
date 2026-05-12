# 260512-ily Summary

## Scope Delivered
- Preserved both unit-group context-menu actions:
  - Asset: `Plot Sensors by Unit`
  - Category: `Plot Category (group by units)`
- Added unit metadata resolution during equipment sensor load.
- Added gating so unit-group actions are disabled until unit metadata is loaded for that equipment.
- Fixed readiness stall so unit-group actions unlock right after side-panel sensor load pipeline completes.
- Kept `N/A` fallback bucket behavior for empty/null units.

## Implementation
- Updated `backend/app/models/charts.py`:
  - Extended `ItemAttribute` with `unit_of_measurement` and `sub_attributes`.
  - Extended `EquipmentSensor` with `unit_of_measurement` and `unit_metadata_loaded`.
- Updated `backend/app/services/profiling_adapter.py`:
  - Added `_resolve_attribute_unit_of_measurement(...)`.
  - Populated attribute unit metadata from direct `unit_of_measurement` and fallback `sub_attributes` units.
  - Carried resolved unit metadata into `get_equipment_sensors(...)` payload.
- Updated `frontend/charts/app.js`:
  - Added unit metadata readiness tracking per equipment (`unitMetadataReadyByEquipmentId`).
  - Extended sensor normalization with `unitMetadataLoaded` detection.
  - Added frontend fallback enrichment from `/item-attributes` when `/equipment-sensors` does not include unit fields.
  - Parses units from direct fields and `sub_attributes` entries during that fallback pass.
  - Marks sensor unit metadata as loaded after enrichment (including explicit `N/A` fallback).
  - Sets unit readiness true when the equipment sensor load flow finishes enrichment, enabling context-menu unit plot options.
  - Added user notice guard when unit-group actions are triggered early.
  - Kept chart title convention deterministic: `{Prefix} - {UnitLabel}`.

## Regression/Tests
- Added backend test: `tests/backend/test_equipment_sensor_units.py`
  - Verifies equipment sensor units resolve from direct `unit_of_measurement` and fallback `sub_attributes`.
- Updated frontend test: `tests/frontend/test_context_menu_unit_group_plot_actions.py`
  - Verifies metadata-readiness gating plus fallback enrichment hook from `getItemAttributes`.

## Verification Commands
- Executed:
  - `python -m py_compile backend/app/models/charts.py backend/app/services/profiling_adapter.py tests/backend/test_equipment_sensor_units.py tests/frontend/test_context_menu_unit_group_plot_actions.py`
- Attempted but unavailable:
  - `python -m pytest ...` (fails because `pytest` is not installed in this environment).

## Files Changed
- `backend/app/models/charts.py`
- `backend/app/services/profiling_adapter.py`
- `frontend/charts/app.js`
- `tests/backend/test_equipment_sensor_units.py`
- `tests/frontend/test_context_menu_unit_group_plot_actions.py`
- `.planning/quick/260512-ily-feature-add-context-menu-actions-to-plot/260512-ily-PLAN.md`
- `.planning/quick/260512-ily-feature-add-context-menu-actions-to-plot/260512-ily-SUMMARY.md`
