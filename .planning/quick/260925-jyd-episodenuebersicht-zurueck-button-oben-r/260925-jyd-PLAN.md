# Quick Plan

## Read first

- `AGENTS.md`
- `frontend/src/app/admin/anime/[id]/episodes/page.tsx`
- `frontend/src/app/admin/anime/AdminStudio.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/page.test.tsx`

## Actions

1. Add „Zurück zum Anime“ to a dedicated top row aligned to the right.
2. Keep „Import & Mapping“ and „Neue Episode“ below the title.
3. Add the focused assertion, run checks, document and push.

## Acceptance criteria

- Navigation is visible at the upper right of the overview header.
- Work actions remain below „Episoden-Übersicht“.
- Mobile layout stacks the top row safely.
