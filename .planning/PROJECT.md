# Lighthouse Improvements - Charts Operations Frontend

## What This Is

This project is now charts-only. The active surface is the Lighthouse-style Charts workspace under `frontend/charts` with API support in `backend/app`.

The focus is fast operational analysis: chart composition, equipment/sensor plotting, and alarm/event recognition workflows that support triage.

## Core Value

Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## Requirements

### Validated

- Charts shell, tabs, and chart cards are functional.
- Backend API routing for chart, equipment, sensor, and intel-event flows is in place.
- Multi-asset/tag chart composition and chart-level actions are implemented.
- Dual-sidebar equipment/sensor workflow is implemented.

### Active

- Complete intel-events integration across charts workflows.
- Improve alarm payload rendering and alarm-row usability for recognition and triage.
- Continue chart interaction QoL and performance hardening.
- Preserve Lighthouse visual language with consistent tokens and predictable controls.

### Out of Scope

- Legacy two-page scope and its retired specs/pages.
- Framework migration away from current static frontend + FastAPI backend approach.

## Context

- Active frontend: `frontend/charts/**`
- Active backend: `backend/app/**`
- Legacy root pages/specs were removed from scope to avoid roadmap drift and ambiguity.

## Constraints

- Keep the Lighthouse dark-theme hierarchy recognizable.
- Maintain existing API contracts unless change is required and validated.
- Prioritize operational clarity and triage speed over decorative UI changes.

## Evolution

This file should be updated when requirements or scope change materially.

---
*Last updated: 2026-04-28*
