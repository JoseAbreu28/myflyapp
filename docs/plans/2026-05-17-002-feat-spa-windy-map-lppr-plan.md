---
title: "feat: SPA Conversion + Windy Map + LPPR"
type: feat
status: active
date: 2026-05-17
origin: docs/plans/2026-05-17-001-feat-ppl-flight-dashboard-plan.md
---

# feat: SPA Conversion + Windy Map + LPPR

## Summary

Convert the existing multi-page Flask dashboard into a single-page tab-switched app. LPPR (Porto Airport, Francisco Sá Carneiro) replaces LPVL throughout. A new Map tab embeds Windy.com centered on LPPR. All existing panels (METAR/TAF, NOTAMs, FPL) migrate into tab sections inside a single `index.html`; the four separate page templates are retired. Flask API routes (`/api/metar/<icao>`, `/api/taf/<icao>`) are unchanged.

---

## Problem Frame

The existing app has four separate Flask pages with full-page reloads on navigation. The user wants a fluid single-page experience with all content accessible via tabs, plus an interactive Windy-like weather map and METAR/TAF for LPPR instead of LPVL.

---

## Requirements

- R1. App serves one HTML page at `/`; tab switching is JS-only, no page reload
- R2. Tabs: Dashboard, Weather, Map, NOTAMs, Flight Plan
- R3. Map tab embeds Windy.com iframe centered on LPPR coordinates (41.2481°N, 8.6814°W), wind layer, knots units
- R4. LPPR replaces LPVL in all config values, API calls, labels, and caches
- R5. Weather tab shows LPPR METAR panel + TAF panel + IPMA links (camera embed if LPPR source found, otherwise omitted)
- R6. Hash-based routing: `#dashboard`, `#weather`, `#map`, `#notams`, `#flightplan` — browser back/forward work
- R7. NOTAMs and Flight Plan sections preserve existing iframe/fallback and link-out behavior
- R8. Unused Flask page routes (`/weather`, `/notams`, `/flightplan`) removed; only `/` and `/api/*` remain

---

## Scope Boundaries

- No new data sources beyond LPPR METAR/TAF (aviationweather.gov) and Windy embed
- No change to the Flask API proxy logic — only config values change
- No user auth, no database, local only
- Camera embed included only if a direct-link LPPR source is found at implementation time; otherwise Weather tab shows METAR/TAF only

### Deferred to Follow-Up Work

- Auto-refresh WebSocket push (was deferred in prior plan)
- Full FPL form integration (was deferred in prior plan)
- IPMA brief-ng API auth integration (was deferred in prior plan)

---

## Context & Research

### Existing Implementation (origin plan: docs/plans/2026-05-17-001-feat-ppl-flight-dashboard-plan.md)

- `app.py` — Flask app, fully implemented with METAR/TAF proxy and 60s cache
- `config.py` — all constants, currently LPVL-centric
- `templates/base.html` — header, UTC clock, top nav
- `templates/index.html` — Dashboard with METAR card + nav cards
- `templates/weather.html`, `notams.html`, `flightplan.html` — standalone pages (to be retired)
- `static/js/app.js` — UTC clock, METAR/TAF fetch, embed fallback logic
- `static/css/style.css` — dark aviation theme, badge colors, card layout

### LPPR Reference Data

- ICAO: LPPR
- Full name: Aeroporto Francisco Sá Carneiro
- Coordinates: 41.2481°N, 8.6814°W
- aviationweather.gov METAR endpoint: `https://aviationweather.gov/api/data/metar?ids=LPPR&format=json`
- aviationweather.gov TAF endpoint: `https://aviationweather.gov/api/data/taf?ids=LPPR&format=json`

### Windy Embed

- Base URL: `https://embed.windy.com/embed2.html`
- Key params: `lat=41.2481&lon=-8.6814&zoom=8&overlay=wind&metricWind=kt&metricTemp=%C2%B0C`
- No API key required for iframe embed
- Additional useful overlays: `rain`, `clouds`, `temp` — user can switch inside the iframe

---

## Key Technical Decisions

- **Single Flask route for page**: `/` serves the full SPA; other page routes removed. API routes unchanged.
- **Tab switching mechanism**: JS shows/hides `<section>` elements by `id`; hash in URL drives active tab. No framework needed — plain `hashchange` event listener.
- **Windy iframe lazy load**: iframe `src` set on first Map tab activation to avoid loading Windy on every page open (saves bandwidth and initial render time).
- **METAR/TAF lazy load on Weather tab**: weather data fetched when Weather tab becomes active (not on page load), plus 5-minute auto-refresh while tab is visible.
- **Dashboard METAR**: Dashboard tab still pre-fetches LPPR METAR on page load for the status card — same behavior as before, just LPPR instead of LPVL.
- **Camera section**: implementation-time discovery — search flyweather.net or other sources for LPPR-compatible embed. If none found, omit camera entirely; Weather tab shows METAR/TAF + IPMA links only.

---

## High-Level Technical Design

> *Directional guidance for review, not implementation specification.*

```
Browser (single page at /)
│
├── <header> UTC clock
├── <nav> tab buttons → JS hash routing
│     #dashboard | #weather | #map | #notams | #flightplan
│
├── <section id="dashboard">  ← active by default
│     LPPR METAR status card (loaded on page open)
│
├── <section id="weather">    ← hidden until tab click
│     [camera iframe if source found | no camera]
│     METAR panel (fetch on tab activate)
│     TAF panel   (fetch on tab activate)
│     IPMA links
│
├── <section id="map">        ← hidden until tab click
│     Windy iframe (src set on first activate, then cached)
│
├── <section id="notams">     ← hidden until tab click
│     NOTAM viewer iframe + fallback
│
└── <section id="flightplan"> ← hidden until tab click
      FPL link-out + placeholder

Flask routes:
  GET /                     → render index.html (all sections)
  GET /api/metar/<icao>     → unchanged proxy
  GET /api/taf/<icao>       → unchanged proxy
  (removed: /weather, /notams, /flightplan)
```

---

## Implementation Units

### U1. Config: LPVL → LPPR

**Goal:** Update all constants in `config.py` to target LPPR; add Windy embed URL constant.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Modify: `config.py`

**Approach:**
- `HOME_AERODROME = "LPPR"`
- `STATION_NAME = "Francisco Sá Carneiro"` (full airport name)
- `STATION_SHORT = "Porto"` (display label for UI)
- Add `WINDY_EMBED_URL` constant with LPPR lat/lon, zoom 8, wind overlay, knots units, °C
- Update or remove `LPVL_CAMERA_URL` — rename to `LPPR_CAMERA_URL`; set to `None` or an LPPR source found at implementation time; if `None`, Weather tab skips camera section
- All other constants (`IPMA_*`, `NOTAM_VIEWER_URL`, `FPL_BRIEFING_URL`, `CACHE_TTL_SECONDS`, `REQUEST_TIMEOUT_SECONDS`) unchanged

**Test scenarios:**
- Happy path: `python -c "import config; assert config.HOME_AERODROME == 'LPPR'"` passes
- Happy path: `config.WINDY_EMBED_URL` contains `lat=41.2481` and `lon=-8.6814` and `metricWind=kt`

**Verification:** Import config in Python REPL; all values reflect LPPR.

---

### U2. Flask route consolidation

**Goal:** Collapse page-serving Flask routes to `/` only; pass new config vars to template; remove unused routes.

**Requirements:** R1, R8

**Dependencies:** U1

**Files:**
- Modify: `app.py`

**Approach:**
- Remove `@app.route("/weather")`, `@app.route("/notams")`, `@app.route("/flightplan")` route handlers
- Update `index()` route: pass `windy_embed_url=config.WINDY_EMBED_URL`, `camera_url=config.LPPR_CAMERA_URL` (may be `None`), `ipma_briefing_url`, `ipma_metar_taf_url`, `notam_viewer_url`, `fpl_briefing_url`
- Keep `/api/metar/<icao>` and `/api/taf/<icao>` unchanged
- No change to cache logic, `_build_metar_payload`, `_build_taf_payload`, or helper functions

**Test scenarios:**
- Happy path: `GET /` returns HTTP 200
- Happy path: `GET /api/metar/LPPR` returns JSON with `station == "LPPR"`
- Error path: `GET /weather`, `GET /notams`, `GET /flightplan` return 404 (routes removed)

**Verification:** `curl http://127.0.0.1:5000/` returns 200; removed routes return 404.

---

### U3. Single-page template: all sections in index.html

**Goal:** Merge all content into one `index.html` with five tab sections; retire separate page templates.

**Requirements:** R1, R2, R3, R5, R6, R7

**Dependencies:** U1, U2

**Files:**
- Rewrite: `templates/index.html` (currently Dashboard only → becomes full SPA)
- Modify: `templates/base.html` (nav links → tab buttons)
- Delete: `templates/weather.html`, `templates/notams.html`, `templates/flightplan.html`

**Approach:**

*base.html changes:*
- Nav `<a href="...">` links replaced by `<button data-tab="dashboard">` etc. (or `<a href="#dashboard">`)
- Remove `url_for()` calls from nav — routing is now hash-based JS only
- Keep UTC clock, header, container wrapper

*index.html sections:*

`#dashboard` — METAR status card (existing content: category badge, raw, wind, visibility, ceiling, QNH); nav cards removed (navigation is now via tab buttons)

`#weather` — conditionally render camera block only if `camera_url` is not `None`; METAR decoded table; TAF raw pre-block; IPMA link buttons

`#map` — single `<iframe>` with `data-windy-src="{{ windy_embed_url }}"` and `src` initially empty; JS sets `src` on first activation (lazy load pattern). Full-height iframe (min 500px).

`#notams` — existing NOTAM viewer iframe with `data-embed-container` / `data-embed-fallback` pattern; instructional note below

`#flightplan` — existing FPL link-out button; placeholder note; HTML comment scaffolding for future form

All sections share `class="tab-section"`, only the active one has `class="tab-section active"`.

**Test scenarios:**
- Happy path: page loads without JS errors in browser console
- Happy path: all five tab sections present in DOM (even if hidden)
- Happy path: `#map` section contains iframe with `data-windy-src` attribute pointing to embed.windy.com
- Happy path: camera block absent from DOM when `camera_url` is `None` (Jinja conditional)
- Happy path: IPMA link buttons present in `#weather` section

**Verification:** Open browser; all tabs clickable; Map section contains Windy iframe when Map tab activated.

---

### U4. JS: tab switching, hash routing, lazy data loading

**Goal:** Replace page-navigation JS with tab switching; add hash routing; implement lazy Windy iframe load; update METAR/TAF to target LPPR.

**Requirements:** R1, R3, R6

**Dependencies:** U3

**Files:**
- Modify: `static/js/app.js`

**Approach:**

*Tab switching:*
- `initTabs()`: attach `click` listener to each `[data-tab]` nav button; on click, hide all `.tab-section`, show target section, update active button class, push `#tabname` to `history.pushState` (or just set `location.hash`)
- `activateTab(name)`: the core show/hide function; also triggers lazy-load callbacks
- On `DOMContentLoaded`: read `location.hash` to determine initial tab; default `#dashboard` if absent or unrecognized
- On `window.addEventListener("hashchange")`: call `activateTab` with new hash

*Lazy loads:*
- Windy iframe: `activateTab("map")` checks if `iframe[data-windy-src]` has `src` set; if not, copy `data-windy-src` → `src`. Once set, never reset (cached).
- Weather data: `activateTab("weather")` calls `loadMetar(icao)` and `loadTaf(icao)` if not already loaded; stores a `weatherLoaded` flag. Auto-refresh timer starts on first Weather tab activation.
- Dashboard METAR: loaded immediately on `DOMContentLoaded` (same as current behavior)

*LPPR update:*
- `window.HOME_ICAO` set from Flask template (will be `"LPPR"` after U1)
- No hard-coded ICAO strings in JS — reads `window.HOME_ICAO`

*Remove:*
- `window.LPVL_DASHBOARD` and `window.LPVL_WEATHER` flags — replaced by tab activation callbacks
- `window.LPVL_WEATHER` script block in (now-removed) weather.html

**Test scenarios:**
- Happy path: clicking Weather tab shows `#weather` section and hides others
- Happy path: clicking Map tab sets `src` on Windy iframe (first time only)
- Happy path: clicking Map tab twice does not reset Windy iframe `src` (no reload)
- Happy path: navigating to `http://127.0.0.1:5000/#map` directly loads Map tab
- Happy path: browser Back button after tab navigation returns to previous tab
- Happy path: `loadMetar("LPPR")` called when Weather tab activated; LPPR METAR populates panel
- Edge case: unknown hash (e.g. `#foo`) falls back to `#dashboard`

**Verification:** Manual browser test — all tabs switch correctly; map loads Windy on first activation; LPPR METAR populates; back/forward works.

---

### U5. CSS: tab navigation active states + map section layout

**Goal:** Style active tab button indicator; make tab sections default hidden; size Windy iframe appropriately.

**Requirements:** R1, R3

**Dependencies:** U3

**Files:**
- Modify: `static/css/style.css`

**Approach:**
- `.tab-section { display: none; }` + `.tab-section.active { display: block; }`
- `nav [data-tab].active` (or `nav a.active`): highlight active tab (e.g. amber underline, matching existing color scheme)
- `#map .map-wrap iframe`: `width: 100%; height: 550px; border: none;` — enough height for usable weather map
- Ensure map section card-wrap has no conflicting padding that would clip the iframe
- No other structural changes to existing card/badge/table styles

**Test scenarios:**
- Happy path: only active tab section visible; others `display: none`
- Happy path: active tab button visually distinct (underline or color change)
- Happy path: Windy iframe fills available width without horizontal scroll on standard desktop viewport

**Verification:** Browser visual check — one section visible at a time; map iframe fills panel.

---

## System-Wide Impact

- **API routes unchanged**: U2 only removes page-serving routes; the METAR/TAF proxy is unaffected. Any external tool calling `/api/metar/LPVL` will still work (ICAO is URL param, not hardcoded to LPPR).
- **Cache**: existing 60s in-memory cache keyed by ICAO string — switching to LPPR means the LPVL cache key simply never gets populated. No migration needed.
- **Template removal**: `weather.html`, `notams.html`, `flightplan.html` deletion is safe — no other code references them after U2 removes the route handlers.
- **JS flags removed**: `window.LPVL_DASHBOARD` and `window.LPVL_WEATHER` no longer needed; `app.js` tab activation callbacks replace them.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Windy embed blocks iframe in some browser configs (CSP, privacy settings) | Windy allows embedding by design; add `allow="fullscreen"` attribute; fallback: show link-out to windy.com/LPPR |
| flyweather.net has no LPPR camera source | Implementation-time search; if not found, omit camera block (Jinja conditional on `camera_url`) |
| Browser hash routing conflicts with Flask routes | All Flask page routes removed (U2); no conflict possible |
| NOTAM viewer `lflopes402.github.io/notam/` iframe still blocked | Existing fallback pattern unchanged; already handled |

---

## Documentation / Operational Notes

- Run: `python app.py` — unchanged
- Opens at `http://127.0.0.1:5000` — unchanged
- Deep-link to specific tab: `http://127.0.0.1:5000/#map`
- LPPR METAR check: `curl http://127.0.0.1:5000/api/metar/LPPR`
