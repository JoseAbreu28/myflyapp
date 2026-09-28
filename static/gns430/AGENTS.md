# GNS display references and map geography

## Purpose
- Own the GNS 430/430W design/source references and the offline geographic backdrop for the live Setup 1 display.

## Ownership
- `430.json` and `430w.json` index the reference pages, views, source PDF pages and matching model images.
- `images/` contains WebP display extracts from Garmin 190-00140-00 Rev. P and 190-00356-00 Rev. K.
- `portugal.json` contains simplified Natural Earth 1:10m country outlines for mainland Portugal and neighbouring land.

## Local Contracts
- Keep reference examples historical and clearly distinguished from live simulator values. Do not relabel 430 images as 430W.
- Historical screenshots and partial crops are design references only; the simulator renders live SVG values through `static/js/gns430-display.js`.
- Geographic outlines are a visual backdrop, not terrain, airspace or an official navigation database. Do not package Garmin Trainer executables or binary databases.
- Retain local catalogues, source metadata and images for design traceability; they are not runtime simulator displays.

## Work Guidance
- Preserve source URLs and document/PDF page metadata in each catalogue.
- Geography source: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/ (public domain).

## Verification
- Check every catalogue image exists and decodes, and every reference belongs to its selected model.
- Browser-check the live map against aircraft movement, orientation and RNG changes; keep a graceful geographic-data failure state.

## Child DOX Index
- No child docs.
