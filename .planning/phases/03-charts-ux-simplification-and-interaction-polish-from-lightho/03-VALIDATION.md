---
phase: 03
slug: charts-ux-simplification-and-interaction-polish-from-lightho
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-04-13
---

# Phase 03 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vanilla JS + node syntax checks + targeted UI smoke |
| **Config file** | none - command-level verification |
| **Quick run command** | `node --check frontend/charts/state/store.js && node --check frontend/charts/components/chart-card.js` |
| **Full suite command** | `node --check frontend/charts/app.js && node --check frontend/charts/components/tab-navigation.js && node --check frontend/charts/components/page-controls.js && node --check frontend/charts/components/chart-grid.js && node --check frontend/charts/components/date-filter.js` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run quick command
- **After every plan wave:** Run full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CHT-14 | - | guarded page lifecycle actions | smoke | `node --check frontend/charts/components/tab-navigation.js` | yes | pending |
| 03-02-01 | 02 | 1 | CHT-15, CHT-16 | - | deterministic naming and hard cap enforcement | smoke | `node --check frontend/charts/state/store.js` | yes | pending |
| 03-03-01 | 03 | 2 | CHT-17 | - | one-time auto-scroll and stable layout | smoke | `node --check frontend/charts/components/chart-grid.js` | yes | pending |
| 03-04-01 | 04 | 2 | CHT-18, CHT-19 | - | page-scoped persistence and hover-only title edit | smoke | `node --check frontend/charts/components/chart-card.js && node --check frontend/charts/components/date-filter.js` | yes | pending |

---

## Wave 0 Requirements

- Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover-only rename/delete icons | CHT-14 | Visual interaction | Hover tabs and confirm controls appear only on interaction |
| Max chart cap feedback | CHT-16 | UX messaging/state | Add charts until 12 and verify disabled feedback |
| Auto-scroll to new chart | CHT-17 | Requires viewport behavior | Add chart near page bottom and verify new card is brought into view |
| Per-page persistence | CHT-18 | Stateful across tabs/reload | Set different date filters per page, reload, verify each page restores own state |
| Hovered-card-only title edit | CHT-19 | UX semantics | Hover one card and verify only that card shows edit affordance |

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands
- [ ] Sampling continuity maintained
- [ ] Manual checks completed and documented
- [ ] `nyquist_compliant: true` set after successful validation

**Approval:** pending
