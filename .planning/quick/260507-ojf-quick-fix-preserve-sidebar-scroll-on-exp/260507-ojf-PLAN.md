# Quick Task 260507-ojf: Preserve sidebar scroll continuity

**Date:** 2026-05-07  
**Status:** Completed

## Goal

Ensure equipment and sensor sidebars keep their current scroll position during row activation, sensor drag-and-drop plotting, and context-menu plotting flows.

## Tasks

1. Patch sidebar scroll capture/restore lifecycle in `frontend/charts/app.js` so rapid sequential renders do not overwrite restored scroll with `0`.
2. Reduce redundant sidebar invalidation in expandable equipment-row activation flow while preserving current behavior contracts.
3. Add/extend frontend behavior tests for the scroll-preservation guards.
4. Review and clarify requirements wording in `.planning/REQUIREMENTS.md` if the affected interaction contracts are not explicit enough.
