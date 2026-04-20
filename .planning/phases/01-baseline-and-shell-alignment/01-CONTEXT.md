# Phase 1: Baseline and Shell Alignment - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a functional Lighthouse baseline focused on a single `Charts` tab, including page/tab management, chart visualization flows, and backend data connectivity needed for realistic chart rendering. This phase prioritizes layout and interaction parity with the reference charts experience while using D3.js for visualization and FastAPI for data APIs.

</domain>

<decisions>
## Implementation Decisions

### Product scope and UX direction
- **D-01:** Build a functional Lighthouse starting with only one primary tab: `Charts`.
- **D-02:** Charts page must support preset pages and user-custom visualization pages.
- **D-03:** UI layout and interaction patterns should mirror the reference charts experience at `https://modec-lighthouse.shapedigital.com/charts`.

### Visualization stack and behavior
- **D-04:** Use **D3.js** as the chart rendering engine (no ECharts).
- **D-05:** Keep graph visuals minimalist, prioritizing readability and low visual noise.
- **D-06:** Preserve reference-level chart usability patterns (date filter, legend behavior, fullscreen/open chart behavior, multi-chart grid behavior, chart add/remove flows).

### Visual language and palette
- **D-07:** Use color palette direction from the design references in:
  `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design`
- **D-08:** Apply palette through design tokens to guarantee consistency across charts UI controls, axes, and series colors.

### Backend and data integration
- **D-09:** Backend stack must be **Python + FastAPI**.
- **D-10:** API integration approach should reference:
  `C:\Users\CaioBorges\_pgms\shape-workspace-api\workspace_api\profiling2\core.py`
- **D-11:** Expose clean chart-oriented APIs (timeseries, presets/pages metadata, variable selection payloads) suitable for D3 ingestion.
- **D-12:** Phase 1 completion requires at least one backend-seeded pre-saved chart that renders non-empty live API data on initial load.

### the agent's Discretion
- Exact frontend framework strategy (vanilla modules vs lightweight framework) as long as D3 is the renderer and interactions meet parity goals.
- Exact endpoint naming and internal backend module layout.
- Specific component decomposition for chart card internals and modal implementation.

</decisions>

<specifics>
## Specific Ideas

- Reference charts behavior extracted from runtime bundles indicates:
  - 1/2/3-column chart grid switcher
  - date period + custom date range flow (with clear/reset behavior)
  - add-chart flow with asset/variable selection and side panel behavior
  - tab/page actions: add, rename inline, save, duplicate, close/delete
  - chart card actions: duplicate, remove, open fullscreen
  - side legend panel with toggle behavior
- Design references indicate an OWID-like palette style:
  - light neutral background and subtle grid lines
  - muted typography hierarchy
  - strong but non-neon category line colors (blue, red/orange, violet, brown/gold accents)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and interaction references
- `.tmp/reference/charts-page.js` - Charts page runtime behaviors (tabs/pages, save/duplicate/delete, grid controls)
- `.tmp/reference/tab-charts.js` - Chart card behavior, add-variable flow, legend/fullscreen/action menu interactions
- `.tmp/reference/charts.css` - Charts page shell styles and layout classes
- `.tmp/reference/tab-charts.css` - Tab charts structure and visual details

### Existing project docs
- `spec_mvbac_overview_mvp.md` - Existing operational charting/UI direction already accepted in this repo
- `spec_mvbac_production_gas.md` - Existing drilldown interaction conventions and domain vocabulary
- `plan_frontpage_ship.md` - Prior stakeholder rationale and UX priorities

### Design palette sources
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our world in data - example 1.png`
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our world in data - example 2.png`
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our world in data - example 3.png`
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our world in data - example 4.png`
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our world in data - example 5.png`
- `C:\Users\CaioBorges\OneDrive - Shape Digital\1. Pessoal\5. Estudo\design\our wold in data - example 6.png`

### Backend API integration reference
- `C:\Users\CaioBorges\_pgms\shape-workspace-api\workspace_api\profiling2\core.py` - ProfilingV1 methods for asset lookup, attribute filtering, and timeseries retrieval

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.html` and `production-gas.html` already include Lighthouse shell elements (header/sidebar structure).
- `css/styles.css` already contains dark-theme tokens and component conventions.
- `js/mock-data.js` provides initial patterns for chart dataset organization.

### Established Patterns
- Existing pages are static HTML + JS with Chart.js and modal interactions.
- Sidebar navigation between pages is already implemented and can be reused for Charts-tab first iteration.

### Integration Points
- New charts-focused frontend modules can be introduced while preserving current shell markup conventions.
- FastAPI service can be introduced under a new backend folder and consumed by frontend through an API client module.
- Existing mock-data pipeline can remain as fallback while backend endpoints are wired.

</code_context>

<deferred>
## Deferred Ideas

- Multi-tab experience beyond `Charts` as the first functional tab.
- Full parity implementation for non-charts Lighthouse pages.
- Deep role-based dashboard customization controls beyond page presets.

</deferred>

---

*Phase: 01-baseline-and-shell-alignment*
*Context gathered: 2026-04-11*
