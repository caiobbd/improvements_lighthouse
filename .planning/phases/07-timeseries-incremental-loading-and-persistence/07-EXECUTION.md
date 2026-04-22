# Phase 7 Execution Notes

## Implemented

- Frontend chart-grid reconciliation now reuses chart-card instances keyed by `chart.id` instead of clearing/recreating all cards.
- Chart cards now keep runtime state (`series`, hidden tags, interaction domains) in a per-card cache across updates.
- Tag loads are incremental:
  - same query context + additive tags -> fetch only missing tags
  - frequency/date context change or forced refresh -> full reload swap
- Frontend API client now supports per-tag cache entries and reuses cached tag series independent of chart tag-set composition.
- Backend adapter now has TTL cache for timeseries-by-item/attribute/date/window requests.
- `/timeseries-batch` now deduplicates equivalent tag requests server-side before calling adapter fetch.

## Verification Performed

### Static/syntax checks

- `python -m compileall backend/app/api/charts.py backend/app/services/profiling_adapter.py`
- `node --check frontend/charts/services/api-client.js`
- `node --check frontend/charts/components/chart-card.js`
- `node --check frontend/charts/components/chart-grid.js`

### Focused behavioral script checks

- Adapter cache behavior:
  - two identical `get_timeseries_from_attribute(...)` calls with fake workspace
  - observed workspace API call count: `1` (cache hit on second call)
- Batch dedupe behavior:
  - `/timeseries-batch` equivalent function call with duplicate tag requests
  - observed adapter fetch count: `1` for 2 duplicate tags
  - response still returned 2 tag entries (contract preserved)

## Manual UAT Recommended

- Add a tag to an already-loaded chart and confirm existing line(s) stay visible while new tag loads.
- Switch frequency (`6h -> 1h`) and confirm stale data remains visible until replacement render.
- Repeat add/remove/add same tag and confirm fewer repeated network calls in browser devtools.
