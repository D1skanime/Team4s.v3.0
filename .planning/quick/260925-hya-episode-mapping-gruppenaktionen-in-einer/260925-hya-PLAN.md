# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRowGroupField.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts`

## Actions

1. Move „Ab hier“ and „Ab hier entfernen“ into the existing `groupInputRow` beside search and „Als Chip“.
2. Change the group control row to a four-column grid with a flexible search field and intrinsic-width buttons.
3. Reduce mapping/header column gap from 20px to 12px.
4. Add focused CSS assertions, run checks, document and commit.

## Acceptance criteria

- Group column visually sits closer to filename column.
- Search, „Als Chip“, „Ab hier“ and „Ab hier entfernen“ share one desktop row.
- Responsive stacking remains available on narrow screens.
