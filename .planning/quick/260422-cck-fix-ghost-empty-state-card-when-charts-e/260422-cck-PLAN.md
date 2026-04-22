# Quick Task 260422-cck Plan

## Description

Fix ghost empty-state card when charts exist.

## Tasks

1. Reproduce and identify chart-grid empty-state lifecycle bug.
2. Patch chart-grid reconciliation so empty-state nodes are always removed when charts are present.
3. Run syntax checks and validate no regression in empty-page flow.

## Target Files

- `frontend/charts/components/chart-grid.js`
