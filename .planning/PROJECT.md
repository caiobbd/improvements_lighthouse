# Lighthouse Improvements - Operations Frontend

## What This Is

This project evolves the Lighthouse experience with a charts-first, operations-focused workflow. The current product surface is the Charts workspace and its connected alarm/event analysis flows: API-backed plotting, selector-driven multi-asset composition, equipment/sensor navigation, and alarm-context investigation.

## Core Value

Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

## Requirements

### Validated

- Charts page renders backend-seeded preset pages with non-empty API-backed timeseries.
- Selector workflow supports asset search, timeseries-only attribute selection, and per-chart tag editing.
- Equipment tree + sensor sidebar interactions are available (plot, drag/drop, category grouping, plotted-state awareness).
- Frequency control, batched fetch, and cache-aware loading paths are in place for improved responsiveness.

### Active

- Complete Intel Events integration in Charts (event cards, status filters, equipment subtree filtering, alarm-page generation).
- Align alarm row behavior and payload markdown rendering with Lighthouse full alarm workflow expectations.
- Finalize advanced chart interaction quality features (zoom/pan precision controls, normalization/split-axis safeguards, synced behaviors).
- Harden scroll stability and non-destructive loading continuity in sidebars/charts under rapid interactions.
- Deliver cross-chart hover and pinned cursor interactions for synchronized timestamp comparison.

### Out of Scope

- Legacy non-charts page flows and unrelated page rebuilds in this milestone.
- End-user dashboard personalization/widgets outside chart/workspace behavior.
- New AI button functionality.

## Context

- Repository contains a dedicated Charts frontend at `frontend/charts` and FastAPI services at `backend/app`.
- Current workstream and planning are centered on chart composition, event/alarm workflows, and chart interaction reliability.
- Stakeholder direction remains business-value-first: production KPIs, trends, and exceptions over decorative UI.

## Constraints

- Keep Lighthouse visual hierarchy and readability familiar to existing operators.
- Preserve the current architecture (vanilla frontend modules + D3 + FastAPI) during this milestone.
- Keep scope focused on charts and alarm-recognition workflows for predictable delivery.
- Prefer API-backed behavior and contracts over placeholder/mock-only behavior.
- Keep operational content discoverable and actionable with minimal interaction friction.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Prioritize operations KPIs and deviations over decorative content | Aligns with stakeholder adoption feedback | Good |
| Treat Charts workspace as the primary delivery surface | Concentrates effort where operators spend analysis time | Good |
| Use backend-seeded preset pages + attribute-targeted timeseries contracts | Keeps startup deterministic and supports reliable chart hydration | Good |
| Sequence work through interaction/performance hardening before wider expansion | Reduces regressions and supports faster operator feedback loops | Good |

## Evolution

This document evolves at phase transitions and milestone boundaries:

1. Move delivered requirements to Validated.
2. Move invalidated items to Out of Scope with a reason.
3. Add newly discovered requirements to Active.
4. Log important implementation decisions and their outcomes.

---
*Last updated: 2026-04-28 after legacy scope cleanup*
