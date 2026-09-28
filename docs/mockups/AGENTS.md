# Standalone Mockups

## Purpose

- Contains visual prototypes that are deliberately outside the Flask/Vercel site runtime.
- The GNC 255 mockup demonstrates the manual's panel layout and functional display states without replacing or importing production simulator code.

## Ownership

- Owns standalone mockup HTML, CSS, JavaScript, and supporting notes under `docs/mockups/`.
- The production avionics simulator remains owned by `static/` and `templates/` contracts.

## Local Contracts

- Mockups must run without a build step, framework, database, credentials, or network dependency.
- Do not add links, imports, routes, or script references from the live site to these files.
- Preserve Portuguese explanatory copy and the distinction between a visual/educational mockup and certified avionics.
- Keep Garmin manual references human-readable and do not present copied manual assets as project-owned artwork.

## Work Guidance

- Use vanilla HTML, CSS, and JavaScript with deterministic sample data.
- Make each documented GNC 255 functional area reachable from the mockup's visible navigation or state gallery.
- Keep control labels close to the manual's terminology so the mockup can be compared with the reference PDF.

## Verification

- Open `gnc255/index.html` directly in a browser.
- Exercise the quick-state buttons, physical-panel keys, function-tree entries, frequency transfer, monitor, timer, and message states.
- Check that the browser console has no errors and that no live-site file is modified by the mockup.

## Child DOX Index

- No child docs.
