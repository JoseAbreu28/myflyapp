# Templates

## Purpose

- Holds Jinja templates for the single-page MyFlyApp interface.
- `base.html` provides the document shell, Leaflet CSS/JS includes, header, language selector, tab navigation, and script blocks.
- `index.html` contains all tab sections, the navigation simulator and manual instrument-study panels, and server-rendered data injection.

## Ownership

- Owns `base.html` and `index.html`.
- Backend route context is owned by root `app.py`; browser behavior for template IDs/classes is owned by `static/js/`.

## Local Contracts

- Preserve stable IDs and `data-*` attributes used by `static/js/*.js`.
- Keep tab sections in one page; Flask currently serves only `/` plus API routes.
- Preserve Jinja-provided globals: `station`, `windy_embed_url`, `notam_viewer_url`, `fpl_briefing_url`, `flyweather_sources`, and `aerodromes`.
- Maintain visible aviation disclaimers for navigation and mass/balance tools.
- Keep the navigation simulator unavailable until a route with at least two points exists.
- Keep the manual HSI/RMI/VOR study panel independent of route state, visible at the bottom of Navegações, and initially populated with a complete example.
- External embeds must have link-out or fallback behavior where possible.

## Work Guidance

- User-facing text should remain Portuguese unless adding/updating matching i18n entries in JS.
- Before renaming IDs/classes, search `static/js` and `static/css` for dependencies.
- Use template inheritance rather than duplicating document chrome.

## Verification

- `python -c "import app; print('import OK')"`.
- Run the app and check `/` renders with no Jinja errors.
- Browser-check tab switching after structural changes.

## Child DOX Index

- No child docs.
