---
title: "feat: Local PPL Flight Planning Dashboard (LPVL)"
type: feat
status: active
date: 2026-05-17
---

# feat: Local PPL Flight Planning Dashboard (LPVL)

## Summary

Local Python/Flask web app that consolidates four Portuguese aviation data sources into a single dashboard for EASA PPL training at LPVL (Vilar de Luz). Provides live weather camera embed, native METAR/TAF display via Flask proxy (aviationweather.gov primary + IPMA link), NOTAM viewer, and a FPL submission placeholder — all at `http://127.0.0.1:5000`, LPVL pre-configured throughout.

---

## Problem Frame

PPL student flying from LPVL currently needs 4+ browser tabs to check go/no-go conditions and manage flight planning. A local dashboard removes that friction and keeps aviation data in one place.

---

## Requirements

- R1. App starts with `python app.py` and is accessible at `http://127.0.0.1:5000`
- R2. Dashboard shows current LPVL METAR with flight-category color (VFR/MVFR/IFR/LIFR)
- R3. Weather page shows LPVL camera feed and full METAR/TAF breakdown
- R4. METAR/TAF fetched server-side from aviationweather.gov (avoids CORS); IPMA briefing linked as supplementary
- R5. NOTAM page embeds `lflopes402.github.io/notam/` viewer
- R6. Flight plan page provides prominent link to `fplbriefing.nav.pt` (placeholder; full form deferred)
- R7. UI uses an aviation dark theme; LPVL is the default station throughout

---

## Scope Boundaries

- No user authentication or accounts
- No persistent storage or database
- Not deployed — local only
- No wind/route calculation tools
- No multi-airport support (LPVL only for now)

### Deferred to Follow-Up Work

- Full FPL form integration: blocked until user provides nav.pt credentials and templates — separate iteration
- Auto-refresh / WebSocket real-time push for weather
- IPMA brief-ng API integration: requires auth; deferred until credentials available

---

## Context & Research

### Relevant Code and Patterns

- Greenfield project — no existing codebase to follow
- Standard Flask single-file app pattern (`app.py` + `templates/` + `static/`)
- Jinja2 template inheritance: `base.html` → child templates

### External References

- aviationweather.gov METAR API: `https://aviationweather.gov/api/data/metar?ids=LPVL&format=json`
- aviationweather.gov TAF API: `https://aviationweather.gov/api/data/taf?ids=LPVL&format=json`
- avwx-engine docs: https://avwx.readthedocs.io
- LPVL camera source: `https://www.flyweather.net/station.php?lang=en&station_id=31`
- IPMA aeronautics page: `https://www.ipma.pt/pt/aeronautica/taf.metar/`
- IPMA briefing (auth required): `https://brief-ng.ipma.pt/`
- NOTAM viewer: `https://lflopes402.github.io/notam/`
- FPL briefing: `https://fplbriefing.nav.pt`

---

## Key Technical Decisions

- **METAR/TAF source**: aviationweather.gov free JSON API (no auth, CORS-safe via Flask proxy). IPMA brief-ng requires login and won't embed; IPMA public page is HTML only. aviationweather.gov covers LPVL.
- **External site embeds**: flyweather.net cameras and the NOTAM viewer embedded as iframes. If X-Frame-Options blocks embedding at implementation time, fall back to styled link-out button — this is an implementation-time discovery.
- **METAR parsing**: `avwx-engine` Python library decodes raw METAR/TAF strings into structured fields. If avwx proves heavy, aviationweather.gov's JSON already returns pre-decoded fields (`wdir`, `wspd`, `visib`, `ceil`, `temp`, `dewp`) — usable as a lightweight fallback.
- **Server-side cache**: 60-second in-memory dict cache on the Flask proxy routes prevents hammering aviationweather.gov.
- **No database**: `config.py` holds all LPVL defaults and API base URLs.

---

## Open Questions

### Resolved During Planning

- METAR source: aviationweather.gov (primary) + IPMA link (supplementary) — confirmed by user
- Tech stack: Python/Flask — confirmed by user
- iframe vs. native METAR: native parse via Flask proxy — confirmed by user

### Deferred to Implementation

- Whether `flyweather.net` allows iframe embedding (X-Frame-Options) — check at implementation time, fallback to link-out
- Whether `lflopes402.github.io/notam/` supports query-param pre-filtering for LPVL (e.g., `?icao=LPVL`) — inspect at implementation time
- Whether `fplbriefing.nav.pt` renders usefully inside an iframe (login wall likely) — check at implementation time

---

## Output Structure

```
myfly/
├── app.py                    ← Flask routes and API proxy
├── config.py                 ← LPVL defaults, API base URLs
├── requirements.txt
├── static/
│   ├── css/
│   │   └── style.css         ← Aviation dark theme
│   └── js/
│       └── app.js            ← UTC clock, METAR polling, flight-category color
└── templates/
    ├── base.html             ← Nav, dark theme wrapper, UTC clock
    ├── index.html            ← Dashboard
    ├── weather.html          ← Camera iframe + METAR/TAF panel
    ├── notams.html           ← NOTAM iframe viewer
    └── flightplan.html       ← FPL placeholder page
```

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Browser
  │
  ├── GET /                   → index.html  (Dashboard)
  ├── GET /weather            → weather.html
  ├── GET /notams             → notams.html
  ├── GET /flightplan         → flightplan.html
  │
  ├── GET /api/metar/<icao>   → Flask fetches aviationweather.gov → parses → returns JSON
  └── GET /api/taf/<icao>     → Flask fetches aviationweather.gov → returns raw TAF JSON

External resources (loaded directly by browser, not proxied):
  ├── flyweather.net          → iframe in weather.html
  ├── lflopes402.github.io    → iframe in notams.html
  └── fplbriefing.nav.pt      → link-out / iframe attempt in flightplan.html
```

---

## Implementation Units

### U1. Project Scaffold

**Goal:** Runnable Flask skeleton with config, requirements, dark-themed base template, and top navigation.

**Requirements:** R1, R7

**Dependencies:** None

**Files:**
- Create: `app.py`
- Create: `config.py`
- Create: `requirements.txt`
- Create: `templates/base.html`
- Create: `static/css/style.css`

**Approach:**
- `config.py`: `HOME_AERODROME = "LPVL"`, `STATION_NAME = "Vilar de Luz"`, `AVWX_METAR_URL`, `AVWX_TAF_URL` constants
- `requirements.txt`: `flask`, `requests`, `avwx-engine`
- `base.html`: dark background (`#0d1117`), amber/green accents, top nav (Dashboard · Weather · NOTAMs · Flight Plan), UTC clock in header (updated by JS)
- `style.css`: card layout, monospace font for METAR strings, flight-category color variables (VFR=green, MVFR=blue, IFR=red, LIFR=magenta)
- `app.py`: minimal Flask app, registers `/` route returning `index.html`, runs on port 5000

**Test scenarios:**
- Happy path: `python app.py` starts without error on a fresh venv with requirements installed; `http://127.0.0.1:5000` returns HTTP 200
- Happy path: nav links (Weather, NOTAMs, Flight Plan) render without 404

**Verification:** Server starts, root URL responds, base nav visible in browser.

---

### U2. METAR/TAF API Proxy

**Goal:** Flask routes that fetch METAR and TAF from aviationweather.gov server-side and return structured JSON to the frontend, with a 60-second in-memory cache.

**Requirements:** R4

**Dependencies:** U1

**Files:**
- Modify: `app.py` (add `/api/metar/<icao>` and `/api/taf/<icao>` routes)

**Approach:**
- `GET /api/metar/<icao>`: fetch `https://aviationweather.gov/api/data/metar?ids=<icao>&format=json`, parse with avwx-engine (or use pre-decoded JSON fields as fallback), return `{raw, flight_category, wind_dir, wind_speed, visibility, ceiling, temp, dewpoint, altimeter, obs_time}`
- `GET /api/taf/<icao>`: fetch `https://aviationweather.gov/api/data/taf?ids=<icao>&format=json`, return `{raw, station, time, forecast_periods}`
- Flight category logic: derive from ceiling and visibility using standard FAA thresholds (VFR: ceil>3000ft AND vis>5sm; MVFR: ceil 1000-3000 OR vis 3-5sm; IFR: ceil 500-1000 OR vis 1-3sm; LIFR: ceil<500 OR vis<1sm)
- Cache: simple `dict` keyed by ICAO + route type, with `datetime` timestamp; re-fetch if age > 60s
- Error handling: if upstream unavailable or returns empty, return `{"error": "unavailable", "raw": null}` with HTTP 200

**Test scenarios:**
- Happy path: `GET /api/metar/LPVL` returns 200 with `raw` field containing a METAR string starting with `LPVL`
- Happy path: `GET /api/taf/LPVL` returns 200 with TAF data
- Edge case: `GET /api/metar/XXXX` (unknown ICAO) returns `{"error": "unavailable"}` with HTTP 200, not 500
- Error path: when `AVWX_METAR_URL` points to an invalid host (simulated outage), route returns `{"error": "unavailable"}` gracefully
- Edge case: second request within 60s returns a cached response (verify via a `cached_at` field in the response)

**Verification:** `curl http://127.0.0.1:5000/api/metar/LPVL` returns valid JSON with LPVL weather data.

---

### U3. Dashboard Page

**Goal:** Homepage with LPVL flight-category status card (live METAR), UTC clock, and quick-nav cards to all sections.

**Requirements:** R2, R7

**Dependencies:** U1, U2

**Files:**
- Create: `templates/index.html`
- Create: `static/js/app.js`

**Approach:**
- Card grid: Weather status card (calls `/api/metar/LPVL`, shows flight category badge + wind + visibility + QNH), NOTAMs card (link), Flight Plan card (link)
- Flight category badge colors: map `flight_category` field to CSS class (`.vfr`, `.mvfr`, `.ifr`, `.lifr`)
- UTC clock: JS `setInterval` every 1000ms updating a `<span id="utc-clock">` in base.html header
- METAR auto-refresh: `setInterval` every 5 minutes re-fetches `/api/metar/LPVL` and updates the weather card
- Graceful degradation: if fetch returns `error: unavailable`, show "DATA UNAVAILABLE" badge in weather card — no broken layout

**Test scenarios:**
- Happy path: dashboard loads with LPVL METAR populated and flight category badge visible
- Happy path: UTC clock displays current time and increments each second
- Happy path: flight category color badge matches actual conditions (green for VFR, etc.)
- Error path: when `/api/metar/LPVL` returns `{"error":"unavailable"}`, weather card shows "DATA UNAVAILABLE" without breaking page layout
- Happy path: NOTAMs and Flight Plan link cards navigate to correct routes

**Verification:** Open in browser; clock ticks, METAR card populated with LPVL data, all nav links functional.

---

### U4. Weather Page

**Goal:** Dedicated page with LPVL camera iframe and full METAR/TAF display panel.

**Requirements:** R3, R4

**Dependencies:** U1, U2

**Files:**
- Create: `templates/weather.html`

**Approach:**
- Two-section layout: top = camera iframe (`https://www.flyweather.net/station.php?lang=en&station_id=31`), bottom = METAR/TAF panel
- METAR/TAF panel: raw string in monospace + decoded table (wind, visibility, cloud layers, temp/dewpoint, QNH, observation time)
- IPMA supplementary: "Open IPMA Briefing" button that opens `https://brief-ng.ipma.pt/` in new tab; "Open IPMA TAF/METAR page" button for `https://www.ipma.pt/pt/aeronautica/taf.metar/`
- Camera iframe fallback: if flyweather blocks embedding, show a styled link-out card ("View LPVL Cameras →") — detect this client-side via `iframe.onerror` or a visibility check; exact approach determined at implementation time
- Data from `/api/metar/LPVL` and `/api/taf/LPVL`

**Test scenarios:**
- Happy path: page renders without JS console errors
- Happy path: METAR panel populates from API with wind, visibility, ceiling, temp, QNH fields visible
- Happy path: TAF section shows forecast or "TAF unavailable" message — no blank space
- Integration: camera section shows either iframe content or fallback link-out card — no blank/broken section
- Happy path: "Open IPMA Briefing" button opens `brief-ng.ipma.pt` in a new tab

**Verification:** Open in browser; cameras visible (or fallback shown), METAR/TAF data rendered, IPMA links functional.

---

### U5. NOTAM Page

**Goal:** Embeds the Portuguese NOTAM viewer, pre-filtered to LPVL where possible.

**Requirements:** R5

**Dependencies:** U1

**Files:**
- Create: `templates/notams.html`

**Approach:**
- Iframe: `https://lflopes402.github.io/notam/` — inspect at implementation time whether URL supports `?icao=LPVL` or similar query param for pre-filtering
- Instructional note below iframe: "Check NOTAMs for LPVL, LPPT FIR, and any en-route aerodromes before each flight"
- Fallback: if iframe blocked by X-Frame-Options, display a styled link-out card with the URL and same instructional note

**Test scenarios:**
- Happy path: page renders without blank space — either iframe or fallback card is visible
- Happy path: if iframe loads, NOTAM content is visible (not an error page)
- Happy path: fallback link-out (if needed) opens correct URL in new tab
- Edge case: iframe load failure does not produce JS errors or broken layout

**Verification:** Open in browser; NOTAM content visible or fallback clearly displayed with working link.

---

### U6. Flight Plan Page

**Goal:** Placeholder FPL submission page with prominent nav.pt link-out, ready for future form integration.

**Requirements:** R6

**Dependencies:** U1

**Files:**
- Create: `templates/flightplan.html`

**Approach:**
- Prominent "Open FPL Briefing (nav.pt)" button linking to `https://fplbriefing.nav.pt` (new tab)
- Iframe attempt below: try embedding `https://fplbriefing.nav.pt` — will likely show login page or be blocked; still useful as a quick in-app view
- Instructional text: "Full FPL form integration — provide credentials and templates to enable pre-filled departure from LPVL"
- Layout placeholder sections for future form: Origin (LPVL pre-filled), Route, Destination, Alternate — marked as HTML comments for future development

**Test scenarios:**
- Happy path: page renders with "Open FPL Briefing" button visible and functional
- Happy path: button opens `https://fplbriefing.nav.pt` in a new tab
- Edge case: iframe attempt does not produce JS errors — handles X-Frame-Options gracefully
- Happy path: placeholder text clearly visible explaining deferred integration

**Verification:** Page opens cleanly, link-out button works, no console errors.

---

## System-Wide Impact

- **Interaction graph:** Flask proxy routes (U2) are called by both Dashboard (U3) and Weather page (U4) via frontend JS; a failure in U2 must degrade gracefully in both consumers
- **Error propagation:** All API errors return HTTP 200 with `{"error": "unavailable"}` — frontend JS handles this state explicitly in every consumer; never let a broken upstream surface as a 500 to the user
- **State lifecycle risks:** The 60s in-memory cache is process-local and resets on server restart; acceptable for a local personal tool
- **Unchanged invariants:** External sites (flyweather, NOTAM viewer, fplbriefing, IPMA) are read-only embeds — the app never modifies or authenticates against them at this stage
- **Integration coverage:** Verify that weather card on dashboard and the weather page both degrade identically when `/api/metar/LPVL` is unavailable

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| aviationweather.gov API changes format or endpoint | Use `config.py` URLs so swap is a one-line change; avwx-engine abstracts decode layer |
| flyweather.net or NOTAM viewer blocks iframe embedding | Fallback to styled link-out buttons (planned in U4, U5) |
| avwx-engine install fails or is heavy | Fall back to parsing aviationweather.gov's pre-decoded JSON fields directly (no extra parsing lib needed) |
| fplbriefing.nav.pt blocks iframe or changes auth flow | Link-out is the primary CTA; iframe is best-effort only |

---

## Documentation / Operational Notes

- Run: `pip install -r requirements.txt && python app.py`
- Opens at `http://127.0.0.1:5000`
- No environment variables or secrets needed for this iteration
- When FPL credentials are ready: update `flightplan.html` and add a `/api/fpl` proxy route

---

## Sources & References

- aviationweather.gov METAR API: https://aviationweather.gov/api/data/metar
- avwx-engine: https://avwx.readthedocs.io
- LPVL camera: https://www.flyweather.net/station.php?lang=en&station_id=31
- IPMA aeronautics: https://www.ipma.pt/pt/aeronautica/taf.metar/
- IPMA briefing: https://brief-ng.ipma.pt/
- NOTAM viewer: https://lflopes402.github.io/notam/
- FPL briefing: https://fplbriefing.nav.pt
