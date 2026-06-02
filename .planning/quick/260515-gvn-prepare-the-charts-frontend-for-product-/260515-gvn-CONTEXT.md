# Quick Task 260515-gvn: Prepare the Charts frontend for product expansion with an expandable app shell, refined top header, and preserved Charts features - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Task Boundary

Prepare the current Charts frontend so it reads as part of a broader Lighthouse product rather than a prototype tool. The work should focus on the top application/header area shown in the user screenshot while preserving existing Charts page workflows and controls.

</domain>

<decisions>
## Implementation Decisions

### Product Shell
- Replace prototype-facing technical labels in the top region with a reusable application shell: brand, product area, module navigation, and operational workspace status.
- Keep future pages represented as navigation affordances only; do not implement non-Charts page content or routing in this quick task.

### Charts Continuity
- Preserve current Charts tab navigation, page controls, equipment/sensor sidebars, chart grid, alarm details, and API-backed bootstrapping.
- Keep operational controls above the fold and avoid marketing-style hero content.

### Visual Direction
- Make the page feel more productized and attentive to detail through layout hierarchy, density, spacing, and responsive behavior.
- Keep Lighthouse visual identity recognizable with restrained dark top-level navigation and the existing work-focused chart surface.

</decisions>

<specifics>
## Specific Ideas

- Turn the current breadcrumbs/title/meta stack into an app-level top bar and concise module header.
- Move implementation details such as chart engine and backend contract out of the primary top area.
- Add clear expansion points for Overview, Charts, Alarms, Assets, and Reports without breaking Charts as the active page.

</specifics>

<canonical_refs>
## Canonical References

- User-provided screenshot of the current top area.
- AGENTS.md project guidance: Charts-centered scope, operational content above the fold, follow existing vanilla frontend/D3/FastAPI architecture.

</canonical_refs>
