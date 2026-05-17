---
title: "feat: Deploy Flask app to Vercel"
type: feat
status: active
date: 2026-05-17
---

# feat: Deploy Flask app to Vercel

## Summary

Deploy the existing Flask/Python app to Vercel as a Python serverless app, accessible at `https://myflyapp.vercel.app` (or chosen project name). Vercel serves both the Flask API routes and static files. All functionality is preserved: METAR/TAF proxy, fplbriefing.nav.pt proxy, camera timestamp fetch, Windy embed, NOTAMs. An optional redirect page in the existing `joseabreu28.github.io` repo routes `https://joseabreu28.github.io/myflyapp` → Vercel URL.

---

## Problem Frame

GitHub Pages (static only) cannot run Python. Vercel supports Python serverless functions and is the best free option that preserves full Flask functionality including server-side proxying for METAR/TAF and fplbriefing.nav.pt.

---

## Requirements

- R1. App accessible at `https://myflyapp.vercel.app` (or chosen Vercel project name) with all routes functional
- R2. All API routes work in production: `/api/metar/<icao>`, `/api/taf/<icao>`, `/api/fplbriefing/narrow-pib`, `/api/fplbriefing/route-map`
- R3. Static files (`/static/css/style.css`, `/static/js/app.js`) served correctly
- R4. Templates rendered server-side (Jinja2) as before
- R5. Python 3.12 used on Vercel (3.13 not yet supported on Vercel — local dev continues on 3.13)
- R6. `joseabreu28.github.io/myflyapp` redirects to Vercel URL (optional but desired)

---

## Scope Boundaries

- No change to Flask app logic, routes, or templates
- No new features — deployment only
- No custom domain beyond `vercel.app` subdomain (custom domain is deferred)
- In-memory cache resets per cold start (acceptable for personal use — no persistent state solution in scope)
- The GitHub Pages redirect (R6) targets the existing `joseabreu28/joseabreu28.github.io` repo — a separate repo from Myfly

### Deferred to Follow-Up Work

- Custom domain (e.g., `myflyapp.pt`) via Vercel domain settings
- Environment variable secrets management (currently no secrets needed)
- CI/CD auto-deploy via GitHub Actions (Vercel GitHub integration handles this automatically)
- Persistent cache across serverless invocations (Redis, Vercel KV)

---

## Key Technical Decisions

- **Vercel Python runtime**: `@vercel/python` — wraps Flask via WSGI. Entry point at `api/index.py` imports the Flask `app` object and Vercel calls it as `handler`. All routing passes through Flask.
- **Python version**: Specify `3.12` in `runtime.txt` — Vercel does not yet support 3.13 (as of 2026-05). Local venv stays on 3.13; no 3.13-specific syntax used in the codebase.
- **Static file routing**: `vercel.json` routes `/static/(.*)` directly to the `static/` directory before Flask; Flask's `url_for('static', ...)` continues to generate `/static/...` URLs unchanged.
- **Templates**: Vercel bundles `templates/` alongside the serverless function automatically when they are in the project root — Flask's `render_template` will find them.
- **No secrets needed now**: `app.py` takes no API keys for METAR/TAF (public endpoint). fplbriefing token is caller-supplied in the request body. No `.env` needed for this deployment.
- **GitHub Pages redirect**: A single static HTML file in the `joseabreu28/joseabreu28.github.io` repo at `myflyapp/index.html` using JS `window.location.replace` + meta-refresh fallback. Minimal — no framework needed.

---

## Output Structure

```
myfly/ (this repo)
├── api/
│   └── index.py          ← NEW: Vercel entry point (imports Flask app)
├── app.py                ← unchanged
├── config.py             ← unchanged
├── requirements.txt      ← add gunicorn (Vercel needs it for WSGI)
├── runtime.txt           ← NEW: "python3.12"
├── vercel.json           ← NEW: routing + build config
├── templates/            ← unchanged
└── static/               ← unchanged

joseabreu28.github.io repo (separate):
└── myflyapp/
    └── index.html        ← NEW: redirect to Vercel URL
```

---

## Implementation Units

### U1. Vercel config files

**Goal:** Add `vercel.json` and `runtime.txt` to configure Vercel build and routing.

**Requirements:** R1, R3, R5

**Dependencies:** None

**Files:**
- Create: `vercel.json`
- Create: `runtime.txt`

**Approach:**

`runtime.txt` — single line: `python3.12`

`vercel.json` — two routing rules:
1. `/static/(.*)` → served directly from `static/$1` (bypasses Flask, avoids an extra function invocation per asset)
2. `/(.**)` → forwarded to `api/index.py` (Flask handles all other routes)

Build entry: `api/index.py` using `@vercel/python`.

**Test scenarios:**
- Happy path: `vercel dev` starts locally and `GET /` returns 200
- Happy path: `GET /static/css/style.css` returns the stylesheet (not a 404 or Flask error)
- Happy path: `GET /static/js/app.js` returns the JS file

**Verification:** `vercel dev` runs without build errors; root URL and static assets load.

---

### U2. Vercel entry point adapter

**Goal:** Create `api/index.py` that imports the Flask app and exports it as `handler` for Vercel's Python runtime.

**Requirements:** R1, R2, R4

**Dependencies:** U1

**Files:**
- Create: `api/index.py`

**Approach:**
- Insert the project root into `sys.path` so `import app` and `import config` resolve correctly from inside `api/`
- Import `app` from `app.py` and expose it as `handler` — Vercel's `@vercel/python` runtime looks for a `handler` attribute (or `app` depending on version; the plan notes both and implementation should verify the correct attribute name from Vercel docs at execution time)
- No other logic in this file — keep it a thin adapter

**Test scenarios:**
- Happy path: `GET /` via `vercel dev` renders `index.html` with station data
- Happy path: `GET /api/metar/LPPR` returns valid METAR JSON with `station == "LPPR"`
- Happy path: `GET /api/taf/LPPR` returns TAF data
- Integration: `POST /api/fplbriefing/narrow-pib` with valid token + payload returns `{error: null, pib_uid: ...}` (same as verified locally)
- Error path: `GET /api/metar/XXXX` returns `{error: "unavailable"}` not a 500

**Verification:** All routes respond correctly via `vercel dev`; same responses as local `python app.py`.

---

### U3. Requirements update for Vercel

**Goal:** Ensure `requirements.txt` includes all packages Vercel needs to build and run the app.

**Requirements:** R1, R2

**Dependencies:** U1

**Files:**
- Modify: `requirements.txt`

**Approach:**
- Verify current packages: `flask`, `requests`, `avwx-engine`
- Remove `avwx-engine` if it was already removed from the actual `app.py` (check — `app.py` currently does not import `avwx` directly; parsing is done via raw JSON + regex). If unused, removing it reduces cold start time.
- Pin major versions for reproducibility: `flask>=3.0,<4`, `requests>=2.32,<3` — avoids surprise upgrades on Vercel rebuilds
- No need for `gunicorn` — Vercel's `@vercel/python` uses its own WSGI wrapper

**Test scenarios:**
- Happy path: `pip install -r requirements.txt` on a clean Python 3.12 venv succeeds without errors
- Happy path: import of `app` succeeds after install (`python -c "from app import app"`)

**Verification:** Clean install succeeds on Python 3.12.

---

### U4. GitHub Pages redirect

**Goal:** Add `myflyapp/index.html` to the existing `joseabreu28.github.io` repo so `https://joseabreu28.github.io/myflyapp` redirects to the Vercel URL.

**Requirements:** R6

**Dependencies:** U1, U2 (Vercel URL must be known first)

**Files:**
- Create: `myflyapp/index.html` — in the `joseabreu28/joseabreu28.github.io` repo (separate from Myfly repo)

**Approach:**
- Static HTML with `<meta http-equiv="refresh" content="0;url=https://myflyapp.vercel.app/">` plus `window.location.replace(...)` in a `<script>` block for instant JS redirect
- Brief "Redirecting to MyflyApp..." message as visible fallback
- No dependencies, no build step — push to the GH Pages repo and it goes live within minutes

**Test scenarios:**
- Happy path: visiting `https://joseabreu28.github.io/myflyapp` redirects to `https://myflyapp.vercel.app/` within 1 second
- Edge case: JS disabled — meta refresh still redirects within 1 second

**Verification:** Open `https://joseabreu28.github.io/myflyapp` in browser; lands on Vercel app.

---

## System-Wide Impact

- **In-memory cache**: Vercel serverless functions are stateless — each cold start begins with an empty `_cache` dict. Warm invocations within the same function instance reuse the cache normally. For a personal tool with low traffic, this is acceptable (worst case: slightly more upstream requests during cold starts).
- **`_flyweather_cam_ts_cache`**: Same stateless caveat — the 10-minute camera timestamp cache resets on cold start. Functionally fine.
- **No persistent state introduced**: No database, no file writes, no session state — the app is already stateless by design.
- **CORS**: All proxied requests originate server-side from the Vercel function, not the browser. CORS is not a concern for the API routes.
- **`app.py` unchanged**: Zero risk of regression in existing functionality.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Vercel Python runtime attribute name (`handler` vs `app`) varies by `@vercel/python` version | Check Vercel docs at implementation time; try `handler` first, fall back to `app` |
| `avwx-engine` fails to install on Python 3.12 or adds excessive build time | Verify it is actually imported in `app.py`; if unused, remove from `requirements.txt` |
| `templates/` not bundled with the serverless function | Vercel bundles files adjacent to the project root by default; if missing, add `"includeFiles": "templates/**"` to the build config in `vercel.json` |
| Cold start latency on Vercel Hobby plan | Acceptable for personal use; not a correctness issue |
| fplbriefing token JWT expiry (short-lived ~111 min) | Caller provides token at request time — no server-side token storage needed |

---

## Operational Notes

- **Deploy**: `vercel --prod` from project root (after `npm i -g vercel` + `vercel login`)
- **Local dev**: `vercel dev` uses the same routing config as production
- **Logs**: `vercel logs myflyapp` for runtime errors
- **Project name**: set to `myflyapp` during `vercel` init → URL becomes `myflyapp.vercel.app`
- **GitHub integration**: link the Vercel project to the GitHub repo during init → every push to `main` auto-deploys
