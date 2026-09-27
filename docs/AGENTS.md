# Documentation

## Purpose

- Contains durable project documentation and planning context.
- Documentation explains intent, scope, operational notes, and historical decisions that are still useful.

## Ownership

- Owns `plans/` and any future documentation under `docs/`.
- User-facing README remains root-owned because it describes the whole project from the repository entrypoint.

## Local Contracts

- Keep documentation concise and operational.
- Distinguish current behavior from historical plan text when adding new docs.
- Do not treat old plans as current requirements when code has moved beyond them; use them as context.

## Work Guidance

- Add dated plans under `docs/plans/` when planning substantial features or deployment changes.
- Prefer updating current docs over adding narrative history unless the history informs future work.

## Verification

- Markdown-only changes normally need review for clarity and links, not app runtime tests.

## Child DOX Index

- `plans/AGENTS.md` covers dated planning documents.
