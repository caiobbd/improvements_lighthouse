# Phase 2: Overview Dashboard Hardening - Context

**Gathered:** 2026-04-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the legacy MVBAC Overview dashboard (`index.html`) so KPI charts and alarm triage behavior are operationally reliable for stakeholder walkthroughs. This phase keeps the mock-data baseline for Overview while enforcing consistency of labels, units, interaction quality, and alarm prioritization.

</domain>

<decisions>
## Implementation Decisions

### Product scope and UX direction
- **D-01:** Keep Overview page in current static HTML/CSS/JS architecture for this milestone.
- **D-02:** Preserve Lighthouse visual language while improving chart readability and triage usability.
- **D-03:** Treat chart interaction quality (tooltip, expand, legend behavior) as an operational requirement, not cosmetic polish.

### Data and chart behavior
- **D-04:** Keep Overview data mock-based in Phase 2, but enforce internally coherent ranges and units.
- **D-05:** Ensure 7-day accumulated and 48-hour trend pairings are semantically aligned per KPI.
- **D-06:** Keep plan/target overlays only where intended by spec and avoid misleading overlays.

### Alarm and triage behavior
- **D-07:** Alarm cards must be reliably ordered by severity and urgency signals.
- **D-08:** Alarm detail modal must expose actionable metadata and stable chart rendering.

### Carry-forward debt
- **D-09:** Phase 1 browser validation debt (`human_needed`) carries forward and should be closed during Phase 2 execution verification.

</decisions>

<specifics>
## Specific Ideas

- Normalize KPI chart titles/units to avoid ambiguity between accumulated totals vs rates.
- Consolidate chart construction helpers inside Overview script to reduce duplicated option wiring.
- Introduce deterministic alarm sorting rule:
  1. severity rank
  2. occurrence count
  3. start time recency
- Validate alarm modal series generation against alarm duration context to avoid misleading trends.

</specifics>

<canonical_refs>
## Canonical References

### Product and spec references
- `spec_mvbac_overview_mvp.md`
- `plan_frontpage_ship.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`

### Existing implementation references
- `index.html` (Overview page and inline chart/alarm logic)
- `js/mock-data.js`
- `css/styles.css`

### Prior phase outputs to preserve
- `.planning/phases/01-baseline-and-shell-alignment/01-VERIFICATION.md`
- `.planning/phases/01-baseline-and-shell-alignment/01-04-SUMMARY.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.html` already contains the full Overview structure, Chart.js setup, and modal flows.
- `js/mock-data.js` already has KPI datasets and alarm fixtures.
- `css/styles.css` already includes design tokens and card patterns for Overview/alarms.

### Integration Notes
- Most Phase 2 work can be delivered by improving existing Overview scripts and data contracts without architectural migration.
- Hardening should avoid breaking the newly introduced Charts app (`frontend/charts`).

</code_context>

<deferred>
## Deferred Ideas

- Replace Overview mock data with live API feeds (target later phase/milestone).
- Full redesign of global header/sidebar architecture.

</deferred>

---

*Phase: 02-overview-dashboard-hardening*
*Context gathered: 2026-04-12*
