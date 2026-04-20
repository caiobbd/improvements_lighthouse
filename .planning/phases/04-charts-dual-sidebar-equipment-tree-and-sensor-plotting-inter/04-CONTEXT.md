# Phase 4: Charts Dual-Sidebar Equipment Tree and Sensor Plotting Interactions - Context

**Gathered:** 2026-04-14  
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two chart-workspace sidebars that support equipment navigation and sensor discovery from live API data, then connect those sidebars to chart creation/edit flows through right-click actions and drag-and-drop interactions.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Sidebar 1 uses API-backed equipment tree navigation (`Workspace.get_item_tree()` via backend).
- **D-02:** Sidebar 1 filter is case-insensitive and matches equipment names only.
- **D-03:** Equipment tree rendering must preserve full visible path/hierarchy while filtering.
- **D-04:** Sidebar 2 is visible only after an equipment is selected.
- **D-05:** Sidebar 2 sensor groups are derived from `get_item_attributes()` categories.
- **D-06:** Sidebar 2 shows only attributes where `data_source == Timeseries`.
- **D-07:** Sensors may appear in multiple categories when API data maps them that way.
- **D-08:** Sensor right-click action: `Plot to new chart`.
- **D-09:** Equipment right-click actions: `Plot by category` and `Plot all sensors`.
- **D-10:** `Plot by category` plots all sensors for each category.
- **D-11:** `Plot all sensors` creates one chart per sensor.
- **D-12:** Chart-per-page limit is raised to **30** for this phase.
- **D-13:** Bulk plotting stops cleanly when creating more than 30 charts would be required.
- **D-14:** Sidebar must show checkbox state for sensors already plotted on the active page.
- **D-15:** Sensor drag target supports chart **header + body + tag area**.
- **D-16:** Both sidebars collapse/expand together with one navigation toggle.
- **D-17:** Right-click context menus are the only menu trigger for this phase.
- **D-18:** Chart tag rendering must use a fixed-height, scrollable table layout (single name column) with inline per-row remove action so long tag lists do not inflate chart card height.

</decisions>

<specifics>
## Specific Ideas

- Keep sensor checkbox state computed from active-page chart tags and refresh it after each add/remove action.
- Add defensive dedupe logic so plotting an already-plotted sensor does not create duplicate chart tags.
- Keep sidebar fetches lazy: load sensor panel only after equipment selection.
- Reuse existing chart tag data model (`selectedTags`) for all sidebar-driven plotting actions.
- Reuse existing tag label data as table row text for the Phase 4 tag-table view (no extra API calls).

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/phases/03-charts-ux-simplification-and-interaction-polish-from-lightho/03-CONTEXT.md`
- `.planning/phases/03-charts-ux-simplification-and-interaction-polish-from-lightho/03-VERIFICATION.md`
- `backend/app/services/workspace_client.py`
- `backend/app/services/profiling_adapter.py`
- `backend/app/api/charts.py`
- `backend/app/models/charts.py`
- `frontend/charts/app.js`
- `frontend/charts/state/store.js`
- `frontend/charts/services/api-client.js`
- `frontend/charts/components/chart-grid.js`
- `frontend/charts/components/chart-card.js`
- `frontend/charts/styles/charts-page.css`
- `frontend/charts/styles/components.css`
- `C:/Users/CaioBorges/_pgms/shape-workspace-api/workspace_api/main.py`
- `C:/Users/CaioBorges/_pgms/shape-workspace-api/workspace_api/profiling2/core.py`
- `https://modec-lighthouse.shapedigital.com/charts`

</canonical_refs>

<deferred>
## Deferred Ideas

- Full parent/child lazy tree virtualization and very large-tree optimization.
- Touch-device alternative interaction model for context actions (non-right-click fallback).
- Cross-page global sensor selection memory beyond active-page scope.

</deferred>

---

*Phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter*  
*Context gathered: 2026-04-14*
