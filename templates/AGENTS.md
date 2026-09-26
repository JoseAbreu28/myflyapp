# Templates

## Purpose

- Holds Jinja templates for the single-page MyFlyApp interface.
- `base.html` provides the document shell, Leaflet CSS/JS includes, header, language selector, tab navigation, and script blocks.
- `index.html` contains all primary tab sections, the Plano de voo subtabs (Pré-voo, Criar plano, Navegações, and Massa & Balanceamento), the nested Navegações subtabs (Navegações and E6B), the Treino subtabs (Instrumentos and Avionics Simulator), the external E6BX flight-computer embed, the navigation simulator, the independent Porto/Viseu VOR trainer, the local Avionics Simulator subtabs (dual-G5/GNS 430/430W and GI-106A/GNC 255), manual instrument-study panels, and server-rendered data injection.

## Ownership

- Owns `base.html` and `index.html`.
- Backend route context is owned by root `app.py`; browser behavior for template IDs/classes is owned by `static/js/`.

## Local Contracts

- Preserve stable IDs and `data-*` attributes used by `static/js/*.js`.
- Keep tab sections in one page; Flask currently serves only `/` plus API routes.
- Keep Navegações and Massa & Balanceamento accessible as Plano de voo subtabs; preserve their `navigation` and `massbalance` IDs and support legacy hashes through the client router.
- Keep E6B accessible as a nested Navegações subtab; preserve the `e6b`, `e6b-frame`, and `data-e6b-src` hooks and load the external iframe lazily.
- Keep Instrumentos and Avionics Simulator accessible as Treino subtabs; preserve their `instruments` and `avionics` IDs and route legacy hashes through the client router.
- Preserve Jinja-provided globals: `station`, `windy_embed_url`, `notam_viewer_url`, `fpl_briefing_url`, `flyweather_sources`, and `aerodromes`.
- Maintain visible aviation disclaimers for navigation and mass/balance tools.
- Keep the navigation simulator unavailable until a route with at least two points exists.
- Keep the manual HSI/RMI/VOR study panel independent of route state, visible within the Navegações submodule, and initially populated with a complete example.
- Keep the Treino > Instrumentos subtab and its VOR trainer independent of route state; preserve its frequency, aircraft-position, heading, OBS, TO/FROM, CDI, source, and educational-warning hooks.
- Keep the Avionics Simulator as a local educational aid with two accessible subtabs: Setup 1 for paired G5 PFD/HSI canvases plus the horizontal GNS 430/430W front panel, and Setup 2 for the GI-106A VOR/LOC and GNC 255. Setup 2 should read visually as a compact black cockpit rack, with the round GI-106A on the left and a short, wide GNC 255 front panel on the right that follows the manual's left-volume/display/bezel-key/right-tuning arrangement. Its display should stay minimal and instrument-like: selected mode, active/standby frequency pair, and concise identification only. Preserve stable IDs for the instrument controls, including the GNS COM/VLOC volume deck, PUSH C/V selector, pressable/draggable CRSR knob, GI course/TO-FROM controls, and GNC NAV/COM tuning, C/N selection, FLIP/FLOP, CDI mode, and TO/FROM controls; do not reintroduce external flight-state configuration controls.
- Keep the Avionics Simulator Helper toggle and official manual library visible in the tab: the Helper describes controls inside the instrument layouts, and the manual links cover the G5, GNS 430/430W, GI-106A, and GNC 255 references.
- The G5 HSI knob starts in HDG. Preserve the in-display Heading/Course/OBS menu hooks, native option buttons, and expanded-state/control relationships; menu items must be operable with the simulated knob and keyboard as well as direct selection.
- Keep both avionics tutorials educational and local to the browser: Setup 1 covers G5/GNS VOR and GPS flows plus a fifth GNS 430 Map Page level; Setup 2 has four progressive VFR levels for NAV identification, TO, FROM, and another VOR. Preserve each setup's map, aircraft marker, bearing/radial readouts, steps, instrument verification hooks, and the main tutorial's radial/distance/90 KTS GO flight controls with left/right turn inputs. Keep the shared nine-level execution checklist visible, browser-local, and tied to automatic objective validation. The main tutorial must also expose a distinct free mode where the aircraft can be placed by map click/drag and flown without an exercise objective.
- Preserve the avionics disclaimer and make clear that the implementation is independent from Garmin's certified PC Trainer and official navigation database.
- External embeds must have link-out or fallback behavior where possible.

## Work Guidance

- User-facing text should remain Portuguese unless adding/updating matching i18n entries in JS.
- Before renaming IDs/classes, search `static/js` and `static/css` for dependencies.
- Use template inheritance rather than duplicating document chrome.

## Verification

- `python -c "import app; print('import OK')"`.
- Run the app and check `/` renders with no Jinja errors.
- Browser-check tab switching after structural changes, including lazy initialization of the Instrumentos map and the Avionics Simulator render.

## Child DOX Index

- No child docs.
