<!-- GSD:project-start source:PROJECT.md -->
## Project

**Lighthouse Improvements - Charts Operations Frontend**

This project evolves the Lighthouse Charts experience for operations users. The active product surface is the Charts workspace (`frontend/charts`) with the FastAPI backend (`backend/app`) focused on API-backed charting, sensor plotting, and alarm/event triage workflows.

**Core Value:** Users can quickly spot operational deviations and act on them without digging through decorative or low-signal UI.

### Constraints

- **Design System**: Keep Lighthouse dark theme and information hierarchy recognizable - preserves user familiarity.
- **Architecture**: Current stack is static HTML/CSS/JS + D3 frontend and FastAPI backend - no framework migration in this milestone.
- **Scope**: Charts workspace and alarm recognition/event flows only; legacy two-page scope is out of scope.
- **Data**: Keep API-backed chart contracts stable while supporting deterministic fallback behavior for missing alarm fields.
- **Usability**: Operationally relevant content must remain above the fold where possible - core stakeholder requirement.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
