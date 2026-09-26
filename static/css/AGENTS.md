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
- Keep the Avionics Simulator subtabs and both instrument layouts legible and non-overlapping at desktop, tablet, and narrow mobile widths: Setup 1 has stacked square G5 PFD/HSI displays and the horizontal GNS 430/430W face; Setup 2 has a compact black cockpit-rack treatment with a round GI-106A VOR/LOC using a numbered radial scale, central CDI/course pointer, and TO/VOR annunciators, plus a short, wide GNC 255 front panel aligned to the official manual's control zones, including metal bezels, monochrome LCD-style display, minimal ACT/STB frequency pair, two left volume knobs, bezel keys, and a concentric right tuning knob. Preserve the physical G5 heading/course knobs without auxiliary +/- controls, the GNS COM/VLOC volume deck, PUSH C/V control, draggable CRSR knob, GI course/TO-FROM controls, and GNC NAV/COM controls.
- Keep the instrument-first avionics rack, read-only status strip, tutorial map, exercise brief, readouts, and action controls readable on desktop and stacked on narrow screens.
- Keep the tutorial flight-control strip readable and usable on desktop and narrow screens, including the radial slider, distance field, GO/PAUSE state, speed/heading/time readouts, and left/right turn buttons.
- Mark individual correct tutorial steps with a subtle green background and accessible check; pending rows and reading tips stay neutral. Overall success colors the brief, objective and status only when the actionable criteria are met. Free-mode instructions stay neutral.
- Keep the GNS Map Page data-field strip legible and keep the shared nine-level challenge checklist readable, keyboard-accessible, and responsive; ready and confirmed states must remain visually distinct from merely active rows.
- Keep the Setup 1 and Setup 2 tutorial maps and brief panels usable independently at desktop and narrow widths.
- The Setup 1 tutorial aircraft symbol points along its heading; rotate the inner symbol only, preserving Leaflet marker positioning and its draggable target.
- Keep the Helper toggle and hover/focus popover readable above the instrument panels and usable on narrow screens.
- Keep the G5 HSI selector menu inside its display with a visible selected item, disabled unavailable Course/OBS option, and legible guidance. Its selected heading readout must clear the bezel controls.
- Preserve `body.printing-navigation` styles used by navigation PDF/print fallback.
- Keep badge classes compatible with JS: `.vfr`, `.mvfr`, `.ifr`, `.lifr`, `.unknown`, `.mb-ok`, `.mb-bad`.

## Work Guidance

- Check mobile breakpoints when changing grids, maps, toolbars, or side panels.
- Avoid changes that make aviation warnings visually weaker than surrounding notes.
- Keep print styles readable on white backgrounds.

## Verification

- Browser-check desktop and narrow viewport after layout changes.
- For avionics layout edits, verify both subtabs: Setup 1's G5 PFD/HSI canvases, controls, and GNS key matrix, plus Setup 2's GI-106A and GNC 255 controls, at desktop and narrow widths.
- For print-related edits, trigger navigation print/PDF fallback and inspect the print view.

## Child DOX Index

- No child docs.
