# CSS

## Purpose

- Defines the dark aviation UI theme, responsive layout, tab visibility, the responsive external E6BX embed, map containers, modals, navigation/simulator layouts, manual instrument-study panels, VOR trainer, G5/GNS avionics trainer, mass/balance visuals, and print styles.

## Ownership

- Owns `style.css`.
- Markup hooks are owned by `templates/`; behavior that toggles classes is owned by `static/js/`.

## Local Contracts

- Preserve `.tab-section` hidden/active behavior for SPA routing.
- Keep the four Plano de voo subtabs readable and wrapping cleanly on narrow screens; Navegações and Massa & Balanceamento open as separated submodule cards below the subtab bar.
- Keep the nested Navegações/E6B subtab bar readable and keep the E6B embed contained within its active submodule.
- Keep the Treino subtab bar and its Instrumentos/Avionics Simulator submodule cards readable, separated, and responsive at desktop and narrow widths.
- Preserve Leaflet map container dimensions for dashboard, flight plan, and navigation maps.
- Keep the navigation simulator usable at desktop and mobile breakpoints, with its map and instrument canvases remaining visible without overlap.
- Keep the draggable simulator aircraft visibly interactive with grab/grabbing cursor feedback and a touch-safe target.
- Keep the three manual instrument panels aligned as peers on desktop and stacked on narrow screens.
- Keep the VOR trainer map, control blocks, instrument canvases, and guidance readable on desktop and stacked without overflow on narrow screens.
- Keep both avionics racks legible without overlap at desktop, tablet and narrow mobile widths. Setup 1 has stacked 4:3 G5 screens and horizontal GNS 430/430W. Setup 2 has a round GI-106A with rotating numbered OBS card, fixed index, vertical CDI and TO/VOR annunciators, plus a short, wide GNC 255 with metal bezels, monochrome LCD, ACT/STB frequencies, left volume knobs, bezel keys and right concentric tuning knob. Preserve instrument controls and read-only automatic GI TO/FROM; the normal layout has no auxiliary +/- buttons.
- Keep the instrument-first avionics rack with the tutorial map directly below the GNS/GNC navigation instrument on desktop for direct comparison, with the read-only status strip, exercise brief, readouts, and action controls readable; stack the full rack on narrow screens.
- Keep the Setup 1 flight start/pause button readable beside the exercise actions at desktop and narrow widths; the normal layout has no separate flight-control strip.
- Scope supplementary touch layout rules to `#avionics-trainer.av-mobile-mode`, never enable them automatically by viewport or pointer type. Hidden rotary wrappers use `display: contents` to preserve the normal bezel; in mobile mode separate concentric knobs, show −/+ and aircraft controls, and give keys at least 44px targets. Retain instrument display proportions and keep both racks within 320px phone widths. Rotary targets prevent touch scrolling during horizontal drag; ordinary buttons retain page scrolling.
- Mark individual correct tutorial steps with a subtle green background and accessible check; pending rows and reading tips stay neutral. Overall success colors the brief, objective and status only when the actionable criteria are met. Free-mode instructions stay neutral.
- Keep the GNS Map Page data fields legible and keep the guided exercise brief, steps, readouts, and status readable and responsive.
- Keep the live manual-style GNS display at its 240:128 aspect ratio, with COM/VLOC cells on the left, navigation/menu content on the right and page indicators below. Native input overlays must align with the SVG cells, stay legible and retain focus during GO. Keep both concentric knob rings reachable. At narrow widths the display spans the bezel above the physical controls; the only external selector is the instrument model.
- Keep the Setup 1 and Setup 2 tutorial maps and brief panels usable independently at desktop and narrow widths.
- Honor `.av-tutorial-layout[hidden]` over its grid/block layout rules: Nível 0 shows the introduction guide and hides the previous exercise's brief, objective, steps and readouts in both setups, including Modo mobile.
- Keep the shared `.av-tofrom-guide` readable in both setup contexts, with TO/FROM cards, reading checklist, setup-specific readouts, example values, and responsive stacking at narrow widths.
- Setup 2's GNC OBS/CDI or bearing/radial detail must remain legible inside its LCD without widening the rack; its flight button uses the existing start/pause styling.
- Keep each map's collapsible `.av-navaid-catalog` readable; its station table may scroll horizontally inside `.av-navaid-table` without widening the rack at narrow viewports.
- The Setup 1 tutorial aircraft symbol points along its heading; rotate the inner symbol only, preserving Leaflet marker positioning and its draggable target.
- Keep the Helper toggle and hover/focus popover readable above the instrument panels and usable on narrow screens.
- Keep the G5 HSI selector menu inside its display with a visible selected item, disabled unavailable Course/OBS option, and legible guidance. Its selected heading readout must clear the bezel controls.
- Render the G5 main menu as a four-item knob-navigated viewport; keep HSI in the first PFD row. Setup and bearing-source submenus are opaque vertical lists with a visible title and selection highlight; preserve readability and focus indication at narrow widths.
- Keep G5 menus inside the display and opened through the physical knob interaction; no separate G5 MENU key should be introduced, and hidden page-specific choices must not occupy layout space.
- Match the approved G5 mockup bezel and 4:3 display proportions without stretching the compass. Menus occupy the bottom of the display, with neutral gradient cells, cyan selection outlines and separate cyan values; power symbols use CSS geometry rather than platform-dependent glyphs.
- G5 canvases are read-only displays, with no pointer cursor or focusable page-toggle styling. Page changes use the knob-selected HSI/PFD menu item; retain legible labels and menu focus indication.
- Preserve `body.printing-navigation` styles used by navigation PDF/print fallback.
- Keep the navigation flight-log metadata and TOC/TOD boxes readable beside the route panel; per-leg wind inputs may overflow horizontally inside the existing table wrapper without widening the page.
- Keep the route-scoped aerodrome chart cards compact, readable, and wrapping at narrow widths; chart actions must remain usable without widening the navigation panel.
- Keep TOC/TOD map markers visually distinct and legible over Leaflet tiles at desktop and narrow widths.
- Keep the navigation map's 5 NM tick marks visible over Leaflet tiles without obscuring route points; hover distance labels must remain compact and readable.
- Keep the alternate-route panel and its final-landing context readable beside the route builder; the separate dashed alternate line and origin/intermediate/destination markers must remain distinguishable over Leaflet tiles and wrap at narrow widths.
- Keep the alternate breaking-point mode visibly distinct from ordinary route Breaking point and Alternate modes, including its disabled state before an alternate route exists.
- Keep badge classes compatible with JS: `.vfr`, `.mvfr`, `.ifr`, `.lifr`, `.unknown`, `.mb-ok`, `.mb-bad`.

## Work Guidance

- Check mobile breakpoints when changing grids, maps, toolbars, or side panels.
- Avoid changes that make aviation warnings visually weaker than surrounding notes.
- Keep print styles readable on white backgrounds.

## Verification

- Browser-check desktop and narrow viewport after layout changes.
- For avionics layout edits, verify both subtabs: Setup 1's G5 PFD/HSI canvases, controls, and GNS key matrix, plus Setup 2's GI-106A and GNC 255 controls, at desktop and narrow widths.
- For introduction visibility, verify Nível 0 hides the exercise block, other levels/free mode restore it, and setup/language/mobile-mode switching preserves the selected presentation.
- For print-related edits, trigger navigation print/PDF fallback and inspect the print view.
- For navigation layout edits, check route tables with MAG TRACK, wind inputs, phase boxes and TOC/TOD markers at desktop and narrow widths.

## Child DOX Index

- No child docs.
