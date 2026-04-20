# Lighthouse Improvements - MVBAC Operations Frontend

## What This Is

This project evolves the Lighthouse experience for MVBAC with an operations-first interface focused on high-signal charting and alarm triage. The current baseline includes a functional Charts tab with real API-backed preset charts, and now inserts dedicated selector/performance hardening phases to stabilize API-backed multi-asset composition before resuming Production Gas work.

## Core Value

Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## Requirements

### Validated

- Header and left-sidebar navigation shell exist and are functional in the brownfield codebase.
- Overview page renders operational charts and alarm cards using mocked data.
- Production Gas page renders equipment diagrams, trend charts, and detail/alarm sections.
- Phase 1 Charts tab baseline is functional with D3 rendering and at least one pre-saved chart loading live API data.
- Backend adapter path supports asset resolution, item attributes, and attribute-targeted timeseries retrieval with API key/base URL configuration.

### Active

- Deliver a stable MVP of the MVBAC Overview page aligned with the approved spec.
- Deliver Lighthouse-style selector UX in Charts for API-backed asset search, timeseries-only attribute selection, and per-chart tag editing.
- Harden Charts selector and rendering performance from first-user feedback (explicit search trigger, asset-first attribute loading, fast default sampling, local cache strategy, chart-local updates).
- Deliver a stable MVP of the Production Gas drilldown page aligned with the approved spec.
- Ensure alarm and equipment interactions support fast triage (hover, filtering, drilldown behavior).
- Preserve Lighthouse visual language with consistent design tokens.
- Prepare a clear handoff path from mocked data to API-backed data sources across remaining pages.

### Out of Scope

- Additional sub-group drilldown pages beyond Production Gas in this iteration.
- Full API integration for Overview and Production Gas in this milestone (Charts selector flow and plotting are in scope; broad integration is deferred).
- End-user dashboard customization/widgets.
- New AI button functionality.

## Context

- Repository is a brownfield static frontend with `index.html` and `production-gas.html` as primary legacy pages.
- A dedicated Charts app now exists under `frontend/charts` with FastAPI backend services under `backend/app`.
- Existing spec artifacts:
  - `spec_mvbac_overview_mvp.md`
  - `spec_mvbac_production_gas.md`
  - `plan_frontpage_ship.md`
- Stakeholder direction remains business-value-first: production KPIs, trends, and exceptions over decorative UI.

## Constraints

- Design system continuity: maintain Lighthouse visual hierarchy and readability.
- Architecture: keep current static/vanilla approach for frontend deliverables in this milestone.
- Scope: Overview + Production Gas are still required for MVP acceptance.
- Data strategy: Charts baseline already includes live integration; Phase 2.1 covers selector-driven chart composition and Phase 2.2 optimizes interaction/performance quality before widening API coverage.
- Usability: operational content must stay discoverable and actionable with minimal interaction friction.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize operations KPIs and deviations over decorative content | Aligns with stakeholder adoption feedback | Good |
| Build two-page MVP first (Overview + Production Gas) | Focused, testable scope before broad rollout | Good |
| Add a dedicated Charts tab baseline with D3 + FastAPI + live preset API data in Phase 1 | De-risks data path and validates interaction model early | Good |
| Use backend-seeded preset charts with attribute-targeted timeseries retrieval | Guarantees at least one pre-saved chart renders real data deterministically | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries:

1. Move delivered requirements to Validated.
2. Move invalidated items to Out of Scope with a reason.
3. Add newly discovered requirements to Active.
4. Log important implementation decisions and their outcomes.

---
*Last updated: 2026-04-13 after Phase 2.2 hardening insertion*
