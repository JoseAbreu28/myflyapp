# JavaScript

## Purpose

- Implements browser behavior for the MyFlyApp SPA.
- `app.js` owns tab routing, UTC clock, METAR/TAF fetch/rendering, dashboard maps, flight-plan helper, chart/NOTAM modals, and frequency board.
- `navigation.js` owns Leaflet route planning, route builder, alternate/reference markers, i18n strings, E6B helpers, navigation simulation, and navigation PDF export.
- `hsi.js`, `rmi.js`, and `vor-indicator.js` expose reusable Canvas instrument classes used by the navigation simulator and `teste.html`.
- `instrument-lab.js` binds manual HSI/RMI/VOR inputs to independent instrument instances in the Navegações study panel.
- `massbalance.js` owns aircraft mass/balance data, POH assumptions, CG envelope validation, and SVG chart rendering.

## Ownership

- Owns all files in `static/js/`.
- API endpoints and response schemas are owned by root `app.py`; DOM structure is owned by `templates/`.

## Local Contracts

- Keep scripts vanilla JS; do not introduce a build step without a project-level decision.
- Guard browser APIs and third-party globals (`window.L`, `localStorage`) where availability may vary.
- Preserve global integration points currently used across scripts: `window.HOME_ICAO`, `window.AERODROMES`, `window.MyFlyNavigation`, `window.MyFlyI18n`, and `myflyapp:language`.
- Keep METAR/TAF failures graceful; upstream outages should render unavailable states, not break the page.
- Keep fplbriefing tokens in-memory/request-scoped only.
- Treat `massbalance.js` source assumptions as safety-relevant; update comments when POH data, limits, or units change.

## Work Guidance

- Search templates before changing DOM IDs or `data-*` attributes.
- Keep Portuguese and English i18n keys aligned when adding visible text that participates in language switching.
- For navigation changes, preserve route/alternate/reference state updates together with map rendering and summary tables.
- Keep simulator guidance modes distinct: `breakpoints` targets each active route point, while `destination` retains the final route point as the instrument reference.
- Keep the simulator aircraft draggable only along the planned route; dragging pauses playback and synchronizes distance, elapsed time, and all instrument indications.
- Keep manual study inputs route-independent, seed every fresh page load with a valid random example, and update their instrument/readout immediately on input.
- Treat instrument indications and route playback as simplified educational aids, not certified avionics or flight-training substitutes.
- For PDF export changes, keep server payload generation in sync with `/api/navigation/pdf`.

## Verification

- Run the app and check browser console for errors.
- Exercise affected tabs: Dashboard, Plano de voo, Navegacoes, and Massa & Balanceamento.
- For simulator changes, verify route gating, play/pause/reset, both guidance modes, forward/backward aircraft dragging, the moving map marker, and all three instrument canvases.
- For manual instrument-study changes, verify random initial values vary across reloads, every numeric input remains valid, VOR TO/FROM/OFF selection works, and readouts/canvases update live.
- For API-consuming code, verify happy path and unavailable/error states when practical.

## Child DOX Index

- No child docs.
