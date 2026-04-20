# Phase 3: Charts UX Simplification and Interaction Polish From Lighthouse Reference - Research

**Researched:** 2026-04-13  
**Domain:** Charts workspace interaction simplification  
**Confidence:** HIGH

<research_summary>
## Summary

Reference inspection of Lighthouse charts bundles indicates production patterns that directly match requested scope:

- explicit chart-per-page cap (`12`) with disabled add behavior,
- page-level save/dirty state and leave protection,
- compact action surfaces for page lifecycle (`close/duplicate/delete`),
- per-page stored period/date state,
- inline editable labels with hover-driven edit affordance,
- add-chart flow that auto-scrolls to bring newly added content into view.

Current local app already has foundations (tabs, actions, grid, selector, hover actions), so Phase 3 should focus on behavior polish rather than architecture changes.

</research_summary>

<architecture_patterns>
## Recommended Patterns

- **Policy constants:** centralize cap/naming/persistence keys in store or a shared constants module.
- **Scoped hover affordances:** render edit/remove icons only for hovered/active surface to reduce visual noise.
- **Per-page preference contract:** persist date/period by page id, not globally.
- **Deterministic naming:** avoid ambiguous duplicate names with monotonic suffixing.
- **Non-blocking discoverability:** disabled add states should explain why (limit reached), not silently fail.

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

1. Applying hover-only controls without keyboard/focus fallback.
2. Implementing global date persistence that leaks settings across tabs.
3. Auto-scroll triggering on every rerender instead of only creation events.
4. Name generation collisions when pages are deleted/reordered.
5. Inconsistent chart card heights causing visual jump and layout thrash.

</common_pitfalls>

<open_questions>
## Resolved by User Decisions

- Cap value: **12**
- Persistence strategy: **localStorage only**
- Title edit affordance: **hovered card only**
- Hover controls preference: **rename/delete icons on hover**
- Tag removal UX: **top chips hover remove**
- Colors: **deterministic by tag identity**

</open_questions>

---

*Phase: 03-charts-ux-simplification-and-interaction-polish-from-lightho*  
*Research completed: 2026-04-13*
