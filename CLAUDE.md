# Project rules

## Design and UI (applies to every mockup, prototype and production screen)

- **Structurally responsive, always.** Nothing may overlap, get cut off, or get squished
  at any width from 360px phones to 1920px desktops.
  - Use fluid layouts: flex-wrap, `grid-template-columns: repeat(auto-fill, minmax(Npx, 1fr))`,
    `max-width` instead of fixed `width`, `min-width: 0` on flex children that hold text.
  - Add breakpoints where layout must change (e.g. side-by-side panels stack on narrow screens).
  - Long text truncates with ellipsis or wraps; it never pushes layout out of bounds.
  - Popovers and tooltips must open in a direction that stays on screen.
  - Test every design at 390px, 1024px and 1440px before shipping it.
- Black and white UI, Atlassian-style foundations. See `docs/DESIGN.md`.
- Simplicity scales: one job per screen, one main action.

## Writing to the CEO

- Short, plain, specific. No em dashes.
