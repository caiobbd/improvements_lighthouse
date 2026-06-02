# Quick Task 260528-na2 Summary

**Task:** Research AVEVA/OSIsoft PI exception and compression patterns for future Lighthouse timeseries display/storage optimizations.
**Date:** 2026-05-28
**Status:** Research complete. No code changes made.

## Output

- Research artifact: `260528-na2-RESEARCH.md`

## Key Conclusions

- PI's useful architectural lesson is the separation between upstream exception filtering, archive compression, and display retrieval.
- Lighthouse should not start with lossy storage compression. The current product need is faster chart display over large time ranges.
- Recommended first future phase: backend viewport-aware M4 display aggregation with reduction metadata and exact reload on zoom.
- PI-inspired storage compression should wait until Lighthouse owns a persisted timeseries cache/archive and can validate per-sensor tolerances with raw replay.

## Local Code Context

- Backend endpoint: `backend/app/api/charts.py`
- Backend adapter: `backend/app/services/profiling_adapter.py`
- Frontend API client: `frontend/charts/services/api-client.js`
- Chart loader: `frontend/charts/components/chart-card.js`
- D3 renderer: `frontend/charts/components/d3-line-chart.js`

## Verification

- Verified local code path by search and targeted file inspection.
- Verified external concepts against AVEVA/OSIsoft materials and visualization literature.
- No tests were run because this was research-only.
