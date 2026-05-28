# Roadmap: Lighthouse Improvements - Extended Lighthouse Frontend

## Summary

This roadmap evolves the Lighthouse reference experience and adds operational capabilities on top of it: reliable API-backed chart composition, equipment/sensor plotting, alarm-event context, and high-quality chart interactions for faster investigation.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5, 6, 7, 8): planned milestone work
- Decimal phases (2.1, 2.2, 6.1, 6.2, 6.2.1): inserted scope refinements

- [x] **Phase 1: Charts Baseline and Shell Alignment** - Establish stable charts shell foundations and baseline interaction model. (completed 2026-04-12)
- [x] **Phase 2: Charts Operational Baseline Hardening** - Consolidate chart metadata, labels, and alarm-oriented baseline behavior. (completed 2026-04-19)
- [x] **Phase 2.1: Charts Selector and Multi-Asset Tagging (INSERTED)** - Add selector workflow and per-chart tags for API-backed multi-asset plotting. (completed 2026-04-19)
- [x] **Phase 2.2: Charts UX and Performance Hardening (INSERTED)** - Apply first-user feedback for selector behavior, chart updates, and responsiveness. (completed 2026-04-19)
- [x] **Phase 3: Workspace Simplification and Interaction Polish** - Reduce clutter and improve page/chart lifecycle ergonomics. (completed 2026-04-13)
- [x] **Phase 4: Dual-Sidebar Equipment and Sensor Plotting** - Add equipment-tree navigation and direct sensor-to-chart interactions. (completed 2026-04-16)
- [x] **Phase 5: Performance and Speed Optimization** - Improve startup/refresh performance, frequency control, and batching. (completed 2026-04-19)
- [x] **Phase 6: Intel Events Integration** - Integrate Shape Intel events into sidebar workflows and alarm-specific pages. (completed 2026-04-19)
- [x] **Phase 6.1: Alarm Row Parity (INSERTED)** - Align alarm-row layout and markdown payload rendering for operator readability. (completed 2026-04-19)
- [x] **Phase 6.2: Advanced Chart Interaction QoL (INSERTED)** - Add precision zoom/pan and multi-trace analysis controls. (completed 2026-04-19)
- [x] **Phase 6.2.1: Scroll Stability and Non-Destructive Loading (INSERTED)** - Preserve sidebar/chart continuity through heavy interaction flows. (completed 2026-04-19)
- [x] **Phase 7: Timeseries Incremental Loading and Persistence** - Keep existing chart data visible while incrementally fetching missing data. (completed 2026-04-20)
- [x] **Phase 8: Cross-Chart Hover and Pinned Cursors** - Deliver synchronized hover/pinned timestamp comparison across charts. (completed 2026-05-28)
- [x] **Phase 8.1: Improving context from attributes (INSERTED)** - Enrich chart sensor context, threshold controls, and custom alarm metadata workflows. (completed 2026-05-04)
- [ ] **Phase 9: Scalable Frontend Navigation and UX Architecture** - Establish scalable application navigation and UX structure for multi-page expansion without regressing Charts workflows.

## Phase Details

### Phase 1: Charts Baseline and Shell Alignment
**Goal**: Deliver a stable Charts shell and baseline render path suitable for iterative feature delivery.  
**Depends on**: Nothing (first phase)  
**Requirements**: Foundational phase (pre-CHT traceability baseline)  
**Status**: Completed

### Phase 2: Charts Operational Baseline Hardening
**Goal**: Harden chart metadata, display consistency, and initial alarm-oriented behavior.  
**Depends on**: Phase 1  
**Requirements**: Foundational phase (pre-CHT traceability baseline)  
**Status**: Completed

### Phase 2.1: Charts Selector and Multi-Asset Tagging (INSERTED)
**Goal**: Deliver selector-driven chart composition with multi-asset timeseries selection and direct tag management.  
**Depends on**: Phase 2  
**Requirements**: CHT-01, CHT-02, CHT-03, CHT-04, CHT-05, CHT-06  
**Status**: Completed

### Phase 2.2: Charts UX and Performance Hardening (INSERTED)
**Goal**: Improve selector ergonomics and chart interaction responsiveness from first-user feedback.  
**Depends on**: Phase 2.1  
**Requirements**: CHT-07, CHT-08, CHT-09, CHT-10, CHT-11, CHT-12, CHT-13  
**Status**: Completed

### Phase 3: Workspace Simplification and Interaction Polish
**Goal**: Simplify page/chart lifecycle controls and keep chart workspace interactions predictable.  
**Depends on**: Phase 2.2  
**Requirements**: CHT-14, CHT-15, CHT-16, CHT-17, CHT-18, CHT-19  
**Status**: Completed

### Phase 4: Dual-Sidebar Equipment and Sensor Plotting
**Goal**: Enable equipment-tree exploration and sensor plotting workflows that are fast and scalable.  
**Depends on**: Phase 3  
**Requirements**: CHT-20, CHT-21, CHT-22, CHT-23, CHT-24, CHT-25, CHT-26, CHT-27, CHT-28, CHT-29  
**Status**: Completed

### Phase 5: Performance and Speed Optimization
**Goal**: Improve startup, refresh, and repeated-load latency with frequency control and cache-aware batching.  
**Depends on**: Phase 4  
**Requirements**: CHT-30, CHT-31, CHT-32, CHT-33, CHT-34, CHT-35, CHT-36, CHT-37  
**Status**: Completed

### Phase 6: Intel Events Integration
**Goal**: Add event-alarm workflows so operators can move from event cards to alarm pages with contextual charts.  
**Depends on**: Phase 5  
**Requirements**: CHT-38, CHT-39, CHT-40, CHT-41, CHT-42, CHT-43, CHT-44, CHT-45  
**Status**: Completed

### Phase 6.1: Alarm Row Parity (INSERTED)
**Goal**: Render alarm payload text and metadata in a readable, safe, and Lighthouse-consistent alarm row.  
**Depends on**: Phase 6  
**Requirements**: CHT-46, CHT-47, CHT-48, CHT-49, CHT-50, CHT-51  
**Status**: Completed

### Phase 6.2: Advanced Chart Interaction QoL (INSERTED)
**Goal**: Deliver precision interaction tools for anomaly analysis without breaking current chart workflows.  
**Depends on**: Phase 6.1  
**Requirements**: CHT-52, CHT-53, CHT-54, CHT-55, CHT-56, CHT-57, CHT-58, CHT-59, CHT-60, CHT-61, CHT-62, CHT-63  
**Status**: Completed

### Phase 6.2.1: Scroll Stability and Non-Destructive Loading (INSERTED)
**Goal**: Preserve scroll position and chart continuity through interactive operations and background fetches.  
**Depends on**: Phase 6.2  
**Requirements**: CHT-64, CHT-65, CHT-66, CHT-67  
**Status**: Completed

### Phase 7: Timeseries Incremental Loading and Persistence
**Goal**: Keep existing series visible while incrementally loading new/frequency-shifted data.  
**Depends on**: Phase 6  
**Requirements**: CHT-68, CHT-69, CHT-70, CHT-71, CHT-72, CHT-73  
**Status**: Completed

### Phase 8: Cross-Chart Hover and Pinned Cursors
**Goal**: Support synchronized timestamp comparison across visible charts using hover and pinned cursors.  
**Depends on**: Phase 7  
**Requirements**: CHT-74, CHT-75, CHT-76, CHT-77, CHT-78, CHT-79, CHT-80, CHT-81, CHT-82, CHT-83  
**Status**: Completed

### Phase 8.1: Improving context from attributes (INSERTED)
**Goal**: Deliver enriched chart sensor context tables, threshold toggles/overlays, and custom alarm metadata persistence without regressing existing chart workflows.  
**Depends on**: Phase 8  
**Requirements**: CHT-84, CHT-85, CHT-86, CHT-87, CHT-88, CHT-89, CHT-90, CHT-91, CHT-92, CHT-93, CHT-94, CHT-95  
**Status**: Completed

### Phase 9: Scalable Frontend Navigation and UX Architecture

**Goal:** Reframe Charts as part of a scalable product shell with global navigation, compact operational controls, and extensible side-panel architecture.  
**Depends on:** Phase 8.1  
**Requirements**: TBD  
**Status**: Pending

Plans:
- [ ] 09-01 Product Shell Layout and Dual-Left Navigation Foundation
- [ ] 09-02 Browser-Like Tabs and Top-Right Control Model
- [ ] 09-03 System Info, Chart-Control Iconification, and Plot-Space Optimization

---
*Last updated: 2026-05-28 after cross-phase verification/debt closure sync*
