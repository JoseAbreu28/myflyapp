# CSS

## Purpose

- Defines the dark aviation UI theme, responsive layout, tab visibility, map containers, modals, navigation/simulator layouts, manual instrument-study panels, mass/balance visuals, and print styles.

## Ownership

- Owns `style.css`.
- Markup hooks are owned by `templates/`; behavior that toggles classes is owned by `static/js/`.

## Local Contracts

- Preserve `.tab-section` hidden/active behavior for SPA routing.
- Preserve Leaflet map container dimensions for dashboard, flight plan, and navigation maps.
- Keep the navigation simulator usable at desktop and mobile breakpoints, with its map and instrument canvases remaining visible without overlap.
- Keep the draggable simulator aircraft visibly interactive with grab/grabbing cursor feedback and a touch-safe target.
- Keep the three manual instrument panels aligned as peers on desktop and stacked on narrow screens.
- Preserve `body.printing-navigation` styles used by navigation PDF/print fallback.
- Keep badge classes compatible with JS: `.vfr`, `.mvfr`, `.ifr`, `.lifr`, `.unknown`, `.mb-ok`, `.mb-bad`.

## Work Guidance

- Check mobile breakpoints when changing grids, maps, toolbars, or side panels.
- Avoid changes that make aviation warnings visually weaker than surrounding notes.
- Keep print styles readable on white backgrounds.

## Verification

- Browser-check desktop and narrow viewport after layout changes.
- For print-related edits, trigger navigation print/PDF fallback and inspect the print view.

## Child DOX Index

- No child docs.
