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
- Keep the Avionics Simulator as a local educational aid with two accessible subtabs: Setup 1 for paired G5 PFD/HSI canvases plus the horizontal GNS 430/430W front panel, and Setup 2 for the GI-106A VOR/LOC and GNC 255. Setup 2 is a compact black cockpit rack with the round GI-106A on the left and short, wide GNC 255 on the right, following the manual's volume/display/bezel-key/tuning arrangement. Its minimal display contains mode, active/standby frequencies, identifier and optional OBS/CDI or bearing/radial detail. Preserve stable IDs for the GNS volume deck, PUSH C/V, navigation knobs and CRSR centre, GI OBS/automatic flag, and GNC NAV/COM tuning, C/N, FLIP/FLOP, OBS and T/F. Keep flight configuration on the map and instruments.
- Keep the GNC 255 display hierarchy close to the manual: top annunciators, split ACT/STB frequency cells, identifier/detail row, COM volume rail, and the complementary COM/NAV reference frequency. Keep these display fields browser-rendered from Setup 2 state and preserve their stable IDs.
- Keep the Avionics Simulator Helper toggle and official manual library visible in the tab: the Helper describes controls inside the instrument layouts, and the manual links cover the G5, GNS 430/430W, GI-106A, and GNC 255 references.
- Keep the small `av-mobile-toggle` beside Helper. The normal instrument layout remains the default at every width; `.av-touch-hint`, JS-created rotary −/+ controls and each map's `data-av-touch-flight` toolbar appear only in Modo mobile. Preserve the original physical knob IDs and per-setup flight buttons; touch turn and start/pause controls operate the same aircraft state.
- Setup 1 contains one live GNS display in the manual-style bezel, a 430/430W model selector, left MHz/kHz and right group/page concentric knobs, and native frequency/identifier/menu inputs inside the display. Keep model manual links distinct and load `gns430-display.js` before `avionics-simulator.js`. Historical reference images are design materials, not simulator values; do not reintroduce a screenshot mode.
- Keep each Avionics setup's tutorial map below its main navigation instrument on desktop so position and instrument differences can be compared at a glance; allow the full rack to stack at narrow widths.
- Keep the shared TO/FROM quick-reading guide inside the active setup's Tutorial prático panel, below its exercise selector, hidden by default; show it only when that selector is on `Nível 0 · Introdução VOR`. In Nível 0 hide the exercise brief, objective, steps and readouts; restore that block for guided levels and free mode. Preserve the CDI-centred OBS/CRS rule, reciprocal bearing/radial example, instrument-specific reading order, and heading/course distinction.
- Keep both tutorial selectors ordered as Modo livre, Nível 0 and then the guided levels; entering the Avionics Simulator starts both setups in Modo livre. Setup 1 continues through Nível 5; Setup 2 has its available guided levels through Nível 4.
- Setup 2's GI-106A has a rotating OBS compass card, fixed top index, stationary CDI dots and a vertical moving needle; TO/FROM is a read-only automatic indication. Preserve the GNC OBS/CDI and T/F bearing/radial display hooks. Its tutorial offers free mode, four guided levels and an independent 90 KTS start/pause button.
- Each avionics map has a collapsible station catalogue with station/type, identifier, published frequency/channel and a NAV Portugal ENR 4.1 source link. Preserve `data-av-navaids` and `data-av-navaid` hooks; name buttons locate stations without tuning the instruments. Explain that Arouca/Marão are DME-only map references.
- The G5 HSI knob starts in HDG. Preserve the in-display Heading/Course/OBS menu hooks, native option buttons, and expanded-state/control relationships; menu items must be operable with the simulated knob and keyboard as well as direct selection.
- Both G5 menus include HSI/PFD, Setup, BP1/BP2 and None/GPS/VLOC source hooks. The PFD's first four choices must be Back/Heading/Altitude/HSI. Render setup/source submenus as labeled in-display rows, not a separate external control panel.
- Both physical G5 units must contain every page-specific menu hook, including HSI and PFD; JavaScript controls visibility and source-dependent order.
- Do not add a separate G5 MENU bezel key: each local G5 knob opens its own in-display menu when pressed, rotates through that unit's options, and confirms the highlighted option when pressed again.
- G5 canvases are read-only role=img elements, without tabindex or click/keyboard page switching. Change pages only through the local knob's HSI/PFD menu choices and synchronize dynamic titles, labels and accessibility text.
- Keep both avionics tutorials educational and local to the browser: Setup 1 covers G5/GNS VOR and GPS flows plus a fifth GNS 430 Map Page level; Setup 2 has four progressive VFR levels for NAV identification, TO, FROM, and another VOR. Preserve each setup's map, aircraft marker, bearing/radial readouts, steps, and instrument verification hooks. Setup 1 exposes a flight start/pause button beside the exercise actions, labeled with its 90 KTS speed; omit external radial/distance inputs and keep additional flight readouts/turn controls hidden outside Modo mobile. Preserve free mode with map click/drag positioning and keyboard turns.
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
