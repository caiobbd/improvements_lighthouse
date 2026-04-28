# Roadmap: Lighthouse Improvements - Charts Operations Frontend

## Overview

This roadmap is charts-only. It tracks delivery of chart composition, sensor workflows, and alarm/event recognition inside the Charts workspace.

## Phases

- [x] **Phase 1: Baseline and Shell Alignment** - Establish charts shell and core API connectivity.
- [x] **Phase 2.1: Charts Selector and Multi-Asset Tagging** - Implement selector-driven chart composition.
- [x] **Phase 2.2: Charts UX and Performance Hardening** - Improve selector ergonomics and chart responsiveness.
- [x] **Phase 3: Charts UX Simplification and Interaction Polish** - Reduce UI friction and stabilize page/chart controls.
- [x] **Phase 4: Dual Sidebar Equipment/Sensor Plotting** - Deliver tree navigation and sensor plotting flows.
- [x] **Phase 5: Performance and Speed Optimization** - Improve startup, refresh, batching, and caching behavior.
- [ ] **Phase 6: Intel Events Integration** - Integrate events tab, event filtering, and alarm page creation flow.
- [ ] **Phase 6.1: Alarm Row Parity and Payload Rendering** - Improve alarm row structure, markdown rendering, and fallback handling.
- [ ] **Phase 6.2: Advanced Chart Interaction QoL** - Expand zoom/pan/axis ergonomics and cross-chart analysis quality.
- [ ] **Phase 6.2.1: Sidebar Stability + Non-Disruptive Loading UX** - Preserve scroll context and keep chart canvas/data visible during updates.
- [ ] **Phase 7: Timeseries Incremental Loading and Persistence** - Preserve plotted data while adding tags/frequency changes and reduce redundant calls.
- [ ] **Phase 8: Cross-Chart Hover and Pinned Cursors** - Provide synchronized hover and persistent cursor comparison tools.

## Scope Guardrails

- Legacy two-page scope is removed.
- All new work must target `frontend/charts/**` and `backend/app/**`.
- Roadmap changes should preserve operational clarity and alarm triage speed as primary outcomes.

---
*Last updated: 2026-04-28*
