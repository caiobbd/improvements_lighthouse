# Phase 1: Baseline and Shell Alignment - Research

**Researched:** 2026-04-11
**Domain:** Charts-tab product shell with D3.js visualization and FastAPI data service
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Build a functional Lighthouse starting with a single `Charts` tab.
- Match charts layout and interaction patterns from `https://modec-lighthouse.shapedigital.com/charts`.
- Use D3.js for chart rendering.
- Use FastAPI for backend APIs.
- Use palette direction from OWID-style design references in the provided design folder.
- Keep chart visuals minimalist while preserving reference-level functionality.

### the agent's Discretion
- Frontend module architecture.
- Endpoint naming details.
- Internal state-management strategy for tab/page/chart composition.

### Deferred Ideas (OUT OF SCOPE)
- Non-charts tabs as first delivery target.
- Full multi-domain Lighthouse rebuild in this phase.

</user_constraints>

<research_summary>
## Summary

Reference bundle analysis indicates the Charts experience is a stateful workspace composed of: page tabs, per-page chart cards, date filter controls (preset + custom range), chart add/remove/duplicate actions, chart variable selection, and optional fullscreen/legend interactions. The interaction depth is substantial, so implementing this as a modular workspace (not a single monolithic chart view) is critical.

For visualization, D3.js can fully cover line charts, tooltips, scales, legends, zoom/pan, and brush behaviors while keeping rendering minimalist. A clear chart component contract (`input payload -> normalized series -> rendered svg`) will reduce coupling and support preset/custom pages.

Backend integration should wrap the profiling reference API through a service adapter that converts workspace/profiling responses into frontend-ready chart DTOs (series arrays, timestamp-value pairs, metadata). This keeps FastAPI endpoints stable even if upstream profiling internals evolve.

**Primary recommendation:** Build the Charts feature as three parallelized slices: backend API adapter, charts workspace shell, and D3 interaction engine with integration.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.11x+ | Backend API service | High developer velocity, strong typing, mature OpenAPI support |
| Pydantic | 2.x | Request/response schemas | Explicit contracts for chart payloads |
| D3.js | 7.x | SVG chart rendering and interactions | Fine-grained control for minimalist charting and interaction parity |
| Python | 3.11+ | Backend runtime | Compatible with modern FastAPI ecosystem |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Uvicorn | 0.3x+ | ASGI server | Local development and production entrypoint |
| pandas | existing dependency | Data shaping in profiling adapter | Converting workspace dataframes to chart DTOs |
| pytest | 8.x | API and adapter tests | Validate endpoint contracts and data parsing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| D3.js | ECharts/Recharts | Faster startup but conflicts with explicit D3 requirement |
| FastAPI | Flask/FastAPI-lite | Less typed contract discipline and slower scaffold for this use case |

**Installation (target):**
```bash
pip install fastapi uvicorn pydantic pandas pytest
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
backend/
  app/
    main.py
    api/
      charts.py
    services/
      profiling_adapter.py
      workspace_client.py
    models/
      charts.py
    config.py
frontend/
  charts/
    index.html
    app.js
    services/api-client.js
    state/store.js
    components/
      tab-navigation.js
      chart-card.js
      d3-line-chart.js
      date-filter.js
      legend-panel.js
    styles/
      tokens.css
      charts-page.css
```

### Pattern 1: Backend Adapter Layer
**What:** isolate `ProfilingV1` usage in `profiling_adapter.py`, returning normalized DTOs.
**When to use:** all data retrieval from workspace/profiling package.
**Why:** prevents frontend payload shape from being coupled to raw dataframe/internal API changes.

### Pattern 2: Frontend Workspace State Model
**What:** store pages/tabs/charts in a normalized client store with explicit IDs and save-state flags.
**When to use:** add/remove/duplicate/save page and chart interactions.
**Why:** reference behavior includes unsaved indicators, tab rename, page duplication, and local-state transitions.

### Pattern 3: D3 Component Contract
**What:** `renderChart(container, series, options)` with immutable input and isolated SVG lifecycle.
**When to use:** all chart cards and fullscreen chart view.
**Why:** supports consistent rendering logic and avoids interaction drift between chart instances.

### Anti-Patterns to Avoid
- Reusing Chart.js in the new Charts tab (violates D3 requirement).
- Passing raw profiling dataframe responses directly to the frontend.
- Embedding all chart logic into one file without explicit chart card/state boundaries.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API schema validation | Manual dict checks everywhere | Pydantic response models | Prevents silent payload drift |
| Date math for chart ranges | Ad-hoc date parsing | Unified range utility + ISO normalization | Avoids timezone/range bugs |
| State persistence semantics | Implicit global vars | explicit store + persistence keys | Required for preset/custom page behavior |

**Key insight:** custom logic is still needed for D3 interactions, but contracts and state semantics should stay framework-grade and explicit.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Interaction parity gaps
**What goes wrong:** Charts render but controls do not behave like reference (grid switcher, tab actions, fullscreen, date flows).
**Why it happens:** focusing on chart rendering before workspace behavior.
**How to avoid:** implement shell/state interactions first, then bind D3 rendering.
**Warning signs:** chart card works in isolation but page-level actions are inconsistent.

### Pitfall 2: Backend payload impedance mismatch
**What goes wrong:** frontend adapters become brittle because backend returns mixed/raw structures.
**Why it happens:** exposing profiling internals directly.
**How to avoid:** enforce stable API DTO schema with unit tests.
**Warning signs:** repeated payload mapping hacks in UI components.

### Pitfall 3: Over-styled charts reducing readability
**What goes wrong:** excessive gradients/effects hurt interpretability.
**Why it happens:** trying to make D3 visuals "fancy" instead of operational.
**How to avoid:** enforce minimalist styling tokens and restrained series styling.
**Warning signs:** users cannot quickly compare trends across cards.
</common_pitfalls>

<code_examples>
## Code Examples

### FastAPI endpoint contract shape (target pattern)
```python
@router.get("/timeseries", response_model=TimeSeriesResponse)
def get_timeseries(asset_name: str, start_date: str, end_date: str, window: str = "1h"):
    series = adapter.get_timeseries(asset_name, start_date, end_date, window)
    return TimeSeriesResponse(asset_name=asset_name, series=series)
```

### D3 line chart lifecycle pattern (target pattern)
```javascript
export function renderLineChart(container, payload, options) {
  const svg = d3.select(container).selectAll("svg").data([null]).join("svg");
  // scales, axes, paths, tooltip, zoom handlers
  return { destroy: () => svg.remove() };
}
```

### Page state transition pattern (target pattern)
```javascript
store.updatePage(pageId, { isSaved: false, charts: nextCharts });
store.persist();
```
</code_examples>

<sota_updates>
## State of the Art (2024-2026)

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Monolithic chart pages | Workspace-like composable chart pages | Better extensibility for presets/custom pages |
| Backend-agnostic mock-only charts | API-backed charts with fallback mock mode | Faster transition to production data |
| Heavy styled dashboards | Minimalist operational design systems | Better readability and decision speed |

**New patterns to apply:**
- Explicit chart DTO contracts between backend and frontend.
- Deterministic state persistence for tab/page workspaces.
- D3 component encapsulation for repeatable behavior across many cards.
</sota_updates>

<open_questions>
## Open Questions

1. **Authentication method for backend calls**
   - What we know: profiling reference uses workspace APIs and item lookup.
   - What's unclear: credential/session model expected for this repo.
   - Recommendation: define env-based auth adapter in backend config first.

2. **Preset page source of truth**
   - What we know: reference supports saved/opened pages and duplication flows.
   - What's unclear: should presets be seeded in code, backend DB, or JSON config.
   - Recommendation: start with backend JSON seed + runtime in-memory persistence, then evolve.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- `https://modec-lighthouse.shapedigital.com/charts` (app shell and linked chart bundles)
- `.tmp/reference/charts-page.js`
- `.tmp/reference/tab-charts.js`
- `.tmp/reference/charts.css`
- `.tmp/reference/tab-charts.css`
- `C:\Users\CaioBorges\_pgms\shape-workspace-api\workspace_api\profiling2\core.py`

### Secondary (MEDIUM confidence)
- Existing project implementation files (`index.html`, `production-gas.html`, `css/styles.css`, `js/mock-data.js`)

### Tertiary (LOW confidence - needs validation)
- None
</sources>

<metadata>
## Metadata

**Research scope:**
- Reference interaction model extraction
- D3 + FastAPI technical strategy
- Profiling API adapter feasibility
- Palette/system implications

**Confidence breakdown:**
- Reference interactions: HIGH
- Backend adapter approach: HIGH
- D3 rendering architecture: HIGH
- Auth/runtime deployment details: MEDIUM

**Research date:** 2026-04-11
**Valid until:** 2026-05-11
</metadata>

---

*Phase: 01-baseline-and-shell-alignment*
*Research completed: 2026-04-11*
*Ready for planning: yes*
