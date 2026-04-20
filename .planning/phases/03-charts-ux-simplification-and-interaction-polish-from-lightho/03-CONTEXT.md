# Phase 3: Charts UX Simplification and Interaction Polish From Lighthouse Reference - Context

**Gathered:** 2026-04-13  
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the Charts page interaction model using Lighthouse reference patterns while preserving the current core charting flow (selector, multi-asset plotting, and existing D3 interactions). This phase is focused on reducing clutter and increasing operator speed for common page/chart actions.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Use the Lighthouse charts page as functional interaction reference during execution.
- **D-02:** Page rename/delete controls appear as icons only on hover (`1B`), reducing always-visible clutter.
- **D-03:** New pages must auto-name as `New Page N` (`2B`).
- **D-04:** Tag removal remains from top chips with hover affordance; no separate delete list (`3B`).
- **D-05:** Tag colors are deterministic by tag identity so the same tag keeps the same color (`4A`).
- **D-06:** Keep consistent graph card positioning with fixed plot-area structure (`5A`).
- **D-07:** Keep chart header controls minimal, with core controls only (`6A`).
- **D-08:** Enforce chart-per-page limit of **12** (`F1`).
- **D-09:** Auto-scroll to newly added chart after creation (`F2`).
- **D-10:** Add explicit unsaved/saved handling and leave-protection behavior (`F3`).
- **D-11:** Provide compact page lifecycle actions (`duplicate/close/delete`) in one actions surface (`F5`).
- **D-12:** Persist period/date-range per page using **localStorage only** (`F6`).
- **D-13:** Chart title editing should be inline with edit affordance shown on **hovered card only** (`F8`).

</decisions>

<specifics>
## Specific Ideas

- Introduce centralized constants for `MAX_CHARTS_PER_PAGE=12` and naming conventions.
- Keep save state visible but lightweight (`All saved` / dirty indicator).
- Avoid extra modal complexity for routine actions where hover affordances are sufficient.
- Keep behavior deterministic and reversible: no destructive action without confirmation.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/PROJECT.md`
- `.planning/phases/02.2-charts-ux-and-performance-hardening/02.2-CONTEXT.md`
- `.planning/phases/02.2-charts-ux-and-performance-hardening/02.2-VERIFICATION.md`
- `frontend/charts/app.js`
- `frontend/charts/state/store.js`
- `frontend/charts/components/tab-navigation.js`
- `frontend/charts/components/page-controls.js`
- `frontend/charts/components/chart-grid.js`
- `frontend/charts/components/chart-card.js`
- `frontend/charts/components/date-filter.js`
- `frontend/charts/styles/charts-page.css`
- `frontend/charts/styles/components.css`
- `https://modec-lighthouse.shapedigital.com/charts`

</canonical_refs>

<deferred>
## Deferred Ideas

- Backend-persisted page preferences (beyond localStorage scope for this phase).
- “Available pages” library panel and advanced workspace sharing flow.
- Adaptive chart-cap by viewport or user role.

</deferred>

---

*Phase: 03-charts-ux-simplification-and-interaction-polish-from-lightho*  
*Context gathered: 2026-04-13*
