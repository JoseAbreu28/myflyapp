# API Adapter

## Purpose

- Exposes the Flask app to Vercel's Python runtime.
- Keeps serverless hosting concerns outside the main Flask application.

## Ownership

- Owns `index.py`.
- Root `app.py`, `config.py`, `vercel.json`, `requirements.txt`, and `runtime.txt` remain root-owned because they define app behavior and deployment.

## Local Contracts

- Keep this layer thin: import and expose the Flask app, avoid route logic here.
- Preserve root path insertion so imports resolve when Vercel executes from the `api/` directory.
- Export both `app` and `handler` unless the deployment target is intentionally changed.

## Work Guidance

- If deployment behavior changes, update `vercel.json` and this file together.
- Do not duplicate constants from `config.py`.

## Verification

- `python -c "import api.index; print(api.index.app)"`.
- When Vercel tooling is available, verify `/` and `/api/metar/LPPR` through `vercel dev`.

## Child DOX Index

- No child docs.
