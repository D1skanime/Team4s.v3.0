# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`

## Actions

1. Add a dedicated compact style for the release-version input and reduce the height of episode/version/group controls.
2. Align row-level „Überspringen“ and „Bestätigen“ horizontally, with skip first when both are available.
3. Add focused CSS coverage, run mapping tests/typecheck/lint, review the diff, and push the atomic change.

## Acceptance criteria

- Group search, episode, and version controls use a compact 36px height.
- Row actions use one horizontal flex row on wide screens and remain responsive on narrow screens.
- „Überspringen“ appears before „Bestätigen“ in the row action order.

