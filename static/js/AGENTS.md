# JavaScript

## Purpose

- Implements browser behavior for the MyFlyApp SPA.
- `app.js` owns primary-tab routing, Plano de voo and nested Navegações/E6B subtab routing, Treino and its Instrumentos/Avionics Simulator subtab routing (including legacy navigation/mass-balance/E6B/instrument hashes), lazy loading of the external E6BX calculator, UTC clock, METAR/TAF fetch/rendering, dashboard maps, flight-plan helper, chart/NOTAM modals, and frequency board.
- `navigation.js` owns Leaflet route planning, route builder, alternate/reference markers, i18n strings, E6B helpers, navigation simulation, and navigation PDF export.
- `hsi.js`, `rmi.js`, and `vor-indicator.js` expose reusable Canvas instrument classes used by the navigation simulator and `teste.html`.
- `instrument-lab.js` binds manual HSI/RMI/VOR inputs to independent instrument instances in the Navegações study panel.
- `vor-trainer.js` owns the Treino > Instrumentos subtab: PRT/VIS tuning, draggable aircraft map, magnetic radial/bearing approximation, CDI and TO/FROM guidance, and live HSI/VOR rendering.
- `avionics-simulator.js` owns the Treino > Avionics Simulator subtab: browser-local Setup 1 paired G5 PFD/HSI and GNS 430/430W flows, Setup 2 GI-106A VOR/LOC and GNC 255 flows, COM/NAV tuning, CDI/OBS and TO/FROM training, five guided Setup 1 levels including the GNS 430 Map Page, four guided Setup 2 levels, the shared nine-level execution checklist, scenarios, and manual links.
- `massbalance.js` owns aircraft mass/balance data, POH assumptions, CG envelope validation, and SVG chart rendering.

## Ownership

- Owns all files in `static/js/`.
- API endpoints and response schemas are owned by root `app.py`; DOM structure is owned by `templates/`.

## Local Contracts

- Keep scripts vanilla JS; do not introduce a build step without a project-level decision.
- Guard browser APIs and third-party globals (`window.L`, `localStorage`) where availability may vary.
- Keep Navegações and Massa & Balanceamento as Plano de voo subtabs while preserving their `navigation` and `massbalance` DOM IDs and legacy hash entry points.
- Keep E6B as a nested Navegações subtab; preserve `e6b` and `e6b-frame`, load its external source only when selected, and keep the legacy `#e6b` hash routed through Plano de voo.
- Keep Instrumentos and Avionics Simulator as Treino subtabs; preserve their `instruments` and `avionics` IDs, lazy initialization hooks, and legacy hash entry points.
- Preserve global integration points currently used across scripts: `window.HOME_ICAO`, `window.AERODROMES`, `window.MyFlyNavigation`, `window.MyFlyI18n`, and `myflyapp:language`.
- Keep METAR/TAF failures graceful; upstream outages should render unavailable states, not break the page.
- Keep fplbriefing tokens in-memory/request-scoped only.
- Treat `massbalance.js` source assumptions as safety-relevant; update comments when POH data, limits, or units change.
- Keep VOR station frequencies, coordinates, and published declination traceable to NAV Portugal eAIP ENR 4.1; do not imply geometric map distance is certified DME.

## Work Guidance

- Search templates before changing DOM IDs or `data-*` attributes.
- Keep Portuguese and English i18n keys aligned when adding visible text that participates in language switching.
- For navigation changes, preserve route/alternate/reference state updates together with map rendering and summary tables.
- Keep simulator guidance modes distinct: `breakpoints` targets each active route point, while `destination` retains the final route point as the instrument reference.
- Keep the simulator aircraft draggable only along the planned route; dragging pauses playback and synchronizes distance, elapsed time, and all instrument indications.
- Keep manual study inputs route-independent, seed every fresh page load with a valid random example, and update their instrument/readout immediately on input.
- Keep the VOR trainer route-independent and lazy-initialized when its tab becomes visible; invalid frequencies must show NAV/OFF, and position/heading/OBS changes must update the map, instruments, and explanation together.
- Treat instrument indications and route playback as simplified educational aids, not certified avionics or flight-training substitutes.
- Keep avionics control names and basic flows traceable to the linked Garmin manuals; configure the simulation through the instrument controls rather than external flight-state inputs. Setup 1 uses the G5 PFD/HSI knobs as primary heading/course controls with horizontal drag for adjustment plus click for synchronization/selection, and keeps the GNS CRSR knob pressable for cursor mode and horizontally draggable for page-group/Direct-to selection. Setup 2 exposes GI-106A course/TO-FROM controls and GNC 255 NAV/COM tuning with the manual-style C/N target selection, FLIP/FLOP transfer, CDI mode, and TO/FROM controls. The GNC 255 display renders only the selected mode, active/standby frequency pair, and concise identification. Do not imply database currency, certification, or one-to-one parity with Garmin's official trainer.
- Keep the optional Avionics Helper enabled by an explicit toggle; it must describe instrument buttons on pointer hover and keyboard focus without changing their actions or requiring persistence.
- Evaluate each guided avionics step on every instrument render: only matching rows get a green check, and rows revert when their criteria no longer hold. Power, active frequency (not standby), CDI source, course, selected heading bug, GNS page/range, and relevant TO/FROM/CDI or confirmed Direct-to criteria must follow each instruction. Pure reading tips are informational, not automatically passed. Overall success uses all actionable steps and the exercise position; the browser-local nine-level checklist only enables confirmation after the selected objective passes; free mode has no completion state. Reload/reset evaluates only the current setup/exercise configuration.
- Keep tutorial station coordinates and example geometry explicitly approximate/educational; do not imply the map supplies certified DME, navigation data, or current operational information.
- Keep the tutorial free-flight controls browser-local: the dedicated free mode and its radial/distance inputs position the aircraft, GO advances it at the displayed 90 KTS, and arrow/turn controls change the simulated heading while re-rendering the instruments. Map click/drag must remain a supported way to place the aircraft, and free mode must not run guided-exercise verification.
- Setup 1 tutorial left/right keys turn the aircraft both paused and flying, including when the map has focus; capture them before Leaflet pans. Ignore keys outside the active avionics setup, in editable fields, instrument controls, dialogs, and tab lists. Rotate the map aircraft to match heading, and restore map focus after positioning it.
- The G5 HSI is heading-up: rotate its compass card by minus the same aircraft heading used by the map/PFD, keep a fixed top heading reference and upright labels, and render the course/CDI in a separate course-minus-heading frame (never apply heading twice). Heading bug and course selections do not steer the aircraft; relocating it updates navigation geometry without changing heading.
- Per Garmin G5 guide 190-01112-12 Rev. F §§2.2.2 and 2.3.5, the HSI knob defaults to heading-bug adjustment. Press opens its working menu; turn/press selects Heading or Course (VLOC) / OBS (GPS OBS enabled). Course editing changes only course; press confirms and returns to HDG. Hold in HDG synchronizes the bug to aircraft heading. The mode, Helper text, and selected bug must be visible; power-off prevents adjustment. Keep PT/EN tutorial instructions and completion checks aligned with this control flow.
- Keep the four Setup 2 VFR tutorial levels independent from Setup 1 state. Validate the GI-106A/GNC 255 controls against the selected station and map position; reset only the selected Setup 2 level. Keep Setup 1's Map Page level independent and validate NAV/MAP page, range, GPS/waypoint, and heading-bug criteria through the GNS controls.
- Keep avionics state in memory only; do not persist aviation credentials, tokens, or user data for the trainer.
- For PDF export changes, keep server payload generation in sync with `/api/navigation/pdf`.

## Verification

- Run the app and check browser console for errors.
- Exercise affected tabs: Dashboard, Plano de voo (including Pré-voo, Criar plano, Navegações, nested E6B, and Massa & Balanceamento), and Treino (Instrumentos and Avionics Simulator).
- For simulator changes, verify route gating, play/pause/reset, both guidance modes, forward/backward aircraft dragging, the moving map marker, and all three instrument canvases.
- For manual instrument-study changes, verify random initial values vary across reloads, every numeric input remains valid, VOR TO/FROM/OFF selection works, and readouts/canvases update live.
- For VOR trainer changes, verify PRT 114.10 and VIS 113.10 tuning, invalid-frequency NAV/OFF, map click/aircraft drag, heading/OBS changes, Centrar TO/FROM, responsive layout, and PT/EN switching.
- For avionics changes, verify Setup 1's powered G5 PFD/HSI displays, heading/course controls, GNS NAV/WPT/AUX/NRST pages, COM/VLOC flip-flop, CDI/OBS, Direct-to/ENT, scenarios, reset, and Setup 2's GI-106A course/TO-FROM controls plus GNC 255 NAV/COM tuning, flip-flop, CDI mode, and TO/FROM; then verify tab switching, responsive layout, reset, and PT/EN switching.
- For avionics tutorial changes, verify all five Setup 1 levels including CRSR-to-MAP and RNG range changes, all four Setup 2 levels, map position and CDI updates, useful failure feedback, per-level checklist confirmation, reset/next actions, and that each setup keeps its own exercise state.
- For G5 knob changes, exercise real pointer drag in HDG and Course/OBS, menu selection/confirmation, hold-to-sync, power-off, and live tutorial completion. Heading-bug adjustment must preserve aircraft heading/course; course adjustment must preserve the heading bug.
- For API-consuming code, verify happy path and unavailable/error states when practical.

## Child DOX Index

- No child docs.
