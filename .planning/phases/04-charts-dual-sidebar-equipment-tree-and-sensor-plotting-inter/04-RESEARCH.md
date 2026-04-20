# Phase 4: Charts Dual-Sidebar Equipment Tree and Sensor Plotting Interactions - Research

**Researched:** 2026-04-14  
**Domain:** Charts navigation + API-backed sensor plotting  
**Confidence:** HIGH

<research_summary>
## Summary

The current workspace API package available in this environment (`workspace_api 0.0.13`) exposes:

- `Workspace.get_item_tree(ancestor_id: str | None = None)` in `workspace_api.main`,
- item attribute retrieval with category metadata and data-source typing via existing adapter flow.

This matches the requested Phase 4 interactions: equipment-tree navigation, category-grouped timeseries sensor listing, and chart plotting actions originating from sidebars.

</research_summary>

<architecture_patterns>
## Recommended Patterns

- **Tree-first, sensor-second loading:** fetch equipment tree first, then fetch sensors only after equipment selection.
- **Active-page derived checkbox state:** compute plotted sensors from current page charts (`selectedTags`) instead of maintaining an additional parallel store.
- **Action router for plotting:** normalize all plot entrypoints (sensor menu, equipment menu, drag-drop) to one chart-tag insertion pipeline.
- **Cap-safe batch creation:** pre-calculate chart slots before creating charts and stop at 30 with clear status feedback.
- **Category normalization:** keep one sensor row per `(item_id, attribute)` identity while allowing category fan-out views.

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

1. Running sensor queries before equipment selection, causing unnecessary API calls and latency.
2. Failing to dedupe sensors when they appear in multiple categories.
3. Coupling checkbox state to transient UI selection instead of active chart state.
4. Bulk chart creation without pre-cap check, producing partial inconsistent results.
5. Drag-drop hitzones too narrow, making header/tag/body drops unreliable.

</common_pitfalls>

<integration_notes>
## Integration Notes

- Backend should continue using the API key + base URL connection model.
- `get_item_tree()` should be wrapped in backend service to avoid frontend direct dependency on workspace package internals.
- Timeseries filtering must rely on `data_source` field from item-attributes payload, not text heuristics.
- Existing chart model already supports multi-tag plotting and should remain the source of truth.

</integration_notes>

---

*Phase: 04-charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter*  
*Research completed: 2026-04-14*
