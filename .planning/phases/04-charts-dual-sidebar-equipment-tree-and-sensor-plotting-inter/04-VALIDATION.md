---
phase: 04
slug: charts-dual-sidebar-equipment-tree-and-sensor-plotting-inter
status: draft
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 04 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vanilla JS + FastAPI syntax/integration checks + targeted UI smoke |
| **Config file** | none - command-level verification |
| **Quick run command** | `python -m compileall backend/app && node --check frontend/charts/app.js` |
| **Full suite command** | `python -m compileall backend/app && node --check frontend/charts/app.js && node --check frontend/charts/state/store.js && node --check frontend/charts/services/api-client.js && node --check frontend/charts/components/chart-card.js && node --check frontend/charts/components/chart-grid.js` |
| **Estimated runtime** | ~25 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work 4`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | CHT-20, CHT-21 | - | API returns equipment tree + timeseries categorized sensors | smoke | `python -m compileall backend/app` | yes | passed |
| 04-02-01 | 02 | 1 | CHT-20, CHT-25 | - | dual sidebars render and collapse together with correct visibility rules | smoke | `node --check frontend/charts/app.js` | yes | passed |
| 04-03-01 | 03 | 2 | CHT-22, CHT-23, CHT-26, CHT-27 | - | right-click plot actions and cap logic keep chart state consistent | smoke | `node --check frontend/charts/state/store.js && node --check frontend/charts/components/chart-grid.js` | yes | passed |
| 04-04-01 | 04 | 2 | CHT-24, CHT-28 | - | drag-drop appends sensors without duplicates across chart target zones | smoke | `node --check frontend/charts/components/chart-card.js` | yes | passed |
| 04-05-01 | 05 | 2 | CHT-29 | - | chart tag list uses fixed-height scrollable table and inline remove action without expanding card height | smoke | `node --check frontend/charts/components/chart-card.js && node --check frontend/charts/styles/components.css` | yes | passed |

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Equipment tree filter | CHT-20 | Visual tree semantics | Type mixed-case substring and confirm matching equipment names with full path retained |
| Category-grouped sensor sidebar | CHT-21 | Grouped rendering | Select equipment and confirm only timeseries sensors grouped by category |
| Right-click menus | CHT-22, CHT-23 | Browser context behavior | Right-click sensor and equipment nodes to verify actions and resulting charts |
| Bulk cap enforcement at 30 | CHT-26 | Stateful UX feedback | Execute Plot all sensors on dense equipment and verify chart creation stops at 30 |
| Active-page checkbox state | CHT-27 | Page state coupling | Plot/unplot sensors and confirm checkbox state tracks active page only |
| Drag-drop target zones | CHT-24 | Pointer interaction | Drag sensor to header, body, and tag area and confirm append behavior |
| Chart tag table overflow + remove | CHT-29 | Visual density + row interaction | Add many tags to one chart and confirm tag section has fixed height with vertical scroll and row-level remove action |

---

## Validation Sign-Off

- [x] All tasks have automated verify commands
- [x] Sampling continuity maintained
- [x] Manual checks completed and documented
- [x] `nyquist_compliant: true` set after successful validation

**Approval:** approved
