# Quick Task 260515-gvn: Prepare Charts Frontend for Product Expansion - Plan

## Goal

Introduce an expandable Lighthouse application shell around the existing Charts workspace so the page reads as part of a product, not a standalone prototype, while preserving all current Charts features.

## Task 1: App Shell Markup

**Files:** `frontend/charts/index.html`

**Action:**
- Replace the current breadcrumbs/header/meta block with a reusable app shell containing product brand, module navigation, environment status, and user/workspace affordances.
- Add a compact Charts module header that explains the current operational workspace without exposing implementation details as primary UI.
- Keep existing DOM roots (`tab-navigation`, `page-controls`, `refresh-progress`, `alarm-details-row`, `chart-grid`, `charts-sidebars`) unchanged.

**Verify:**
- The Charts app still bootstraps against the same DOM IDs.
- Existing page controls and chart grid remain in the same order inside the workspace surface.

**Done:**
- Top area supports future application pages without adding fake routes or breaking Charts.

## Task 2: Productized Responsive Styling

**Files:** `frontend/charts/styles/tokens.css`, `frontend/charts/styles/charts-page.css`, `frontend/charts/styles/components.css`

**Action:**
- Add restrained shell styling for the global top bar, module navigation, status chips, and compact module header.
- Remove decorative radial background treatment and use a quieter operational surface.
- Adjust workspace spacing so controls remain above the fold and responsive layouts do not overlap.

**Verify:**
- Desktop and mobile layouts keep text within containers.
- Existing components continue using current tokens and button classes.

**Done:**
- The top region feels expandable and product-level while retaining the Charts page functionality.

## Task 3: Validation and Summary

**Files:** `.planning/STATE.md`, `.planning/quick/260515-gvn-prepare-the-charts-frontend-for-product-/260515-gvn-SUMMARY.md`

**Action:**
- Run targeted frontend tests and a browser/static smoke check where practical.
- Summarize implementation details, verification, and residual risks.
- Update project state quick task table.

**Verify:**
- Tests pass or any limitations are documented.

**Done:**
- GSD artifacts and state reflect the completed quick task.
