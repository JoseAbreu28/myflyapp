# Flight-log PDF Assets

## Purpose

- Holds the fixed Aero Club do Porto flight-log form used as the background for navigation PDF export.

## Ownership

- Owns `flightlogAcporto-template.pdf` and its visual/form geometry.
- The overlay data and API behavior are owned by root `app.py`; route payload fields are owned by `static/js/navigation.js`.

## Local Contracts

- Preserve the A4 landscape page, two-sheet arrangement, printed labels, table cells, and field positions of `flightlogAcporto-template.pdf`.
- Do not replace the form with a generic report layout or alter the source PDF when adding overlay values.

## Work Guidance

- Add only data overlays that have a corresponding field in the supplied form; leave unavailable values blank. Phase labels belong in the primary checkpoint table and alternate route labels belong in the printed alternate table.

## Verification

- Render the generated PDF and compare its page size and primary-sheet geometry with the template before release.

## Child DOX Index

- No child docs.
