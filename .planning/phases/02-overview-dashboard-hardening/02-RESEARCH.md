# Phase 2: Overview Dashboard Hardening - Research

**Researched:** 2026-04-12
**Domain:** Legacy Overview dashboard hardening (Chart.js + alarm triage UX)
**Confidence:** HIGH

<research_summary>
## Summary

The Overview implementation already provides most required building blocks (paired KPI charts, alarm list, detail modal, fullscreen chart modal), but logic quality and consistency are the main risks:

- dataset/label/unit coupling is fragile and mostly inline
- alarm rendering is not explicitly sorted by operational priority
- modal behavior can diverge from card-level chart context
- data coherence checks are manual and not encoded in repeatable verification

The best approach is to harden in-place through incremental refactors that preserve layout and interaction familiarity:
1. normalize chart metadata and KPI contracts
2. stabilize trend overlays and interactions
3. formalize alarm ordering and modal reliability
4. add deterministic verification pass for mock coherence

</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose |
|---------|---------|---------|
| Chart.js | 4.4.x | Overview chart rendering (legacy page) |
| Vanilla JS | ES modules + inline scripts | Page behaviors and modal interactions |
| CSS | existing stylesheet | Visual consistency and layout |

### Supporting
| Tool | Purpose |
|------|---------|
| Node `--check` | Syntax verification for extracted JS modules (if any) |
| Manual browser checks | Interaction and visual correctness validation |

</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: KPI Contract Object
Create a single KPI metadata registry (`id`, `units`, `labels`, `series`) and render charts from it. This reduces duplicated inline assumptions.

### Pattern 2: Deterministic Alarm Sort
Sort alarms by explicit priority rule before rendering to guarantee triage relevance.

### Pattern 3: Modal Reuse Contract
Modal chart rendering should re-use canonical config snapshots to avoid divergence between card and expanded views.

</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

1. Updating dataset arrays without updating unit/title labels.
2. Accidentally over-using plan overlays where not specified.
3. Tying alarm ordering to source array order instead of priority logic.
4. Changing Overview behavior in ways that regress Production Gas or Charts tab navigation.

</common_pitfalls>

<open_questions>
## Open Questions

1. Should severe alarm ordering prioritize occurrences over start recency when severity is equal?  
Recommendation: yes (occurrence count as urgency proxy).

2. Should Overview fullscreen charts include the same legends shown in-card?  
Recommendation: yes for consistency in interpretation.

</open_questions>

---

*Phase: 02-overview-dashboard-hardening*
*Research completed: 2026-04-12*
