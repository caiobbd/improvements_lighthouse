# Conventions

## Frontend Interaction Contracts

### Scroll Preservation (Default)

- Interactive updates must preserve the user's current scroll position by default.
- This applies to:
  - page scroll (`window`)
  - scrollable panes (sidebars, modal lists, table containers)
- Automatic scrolling is only allowed for explicit navigation intents (for example: jumping to a newly created card), and must use non-disruptive behavior (`block: nearest`) to avoid reset-to-top jumps.

### UI Refresh Scope

- Re-render only the smallest UI surface required for a change.
- When a component must re-render fully, capture and restore its internal scroll offsets.
