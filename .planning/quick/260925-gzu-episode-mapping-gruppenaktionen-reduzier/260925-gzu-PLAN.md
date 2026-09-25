# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`

## Actions

1. Remove the visible „Leeren“ control and its local clear handler.
2. Remove the visible „Episode“ scope control.
3. Keep „Ab hier“ and „Ab hier entfernen“ and preserve direct chip removal.
4. Retain optional legacy callback props for existing direct component tests/consumers.
5. Run typecheck, focused ESLint/tests and diff checks, then commit.

## Acceptance criteria

- „Leeren“ and „Episode“ are not rendered in the group field.
- Existing chip removal and range actions still render.
- Typecheck and relevant import tests pass.
