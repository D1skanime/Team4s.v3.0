# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.layout.test.ts`

## Actions

1. Recompose `.episodeGroupHeader` and `.episodeGroupMeta` as explicit grids.
2. Align title and language controls in one stable title row.
3. Give episode actions their own compact right-side region.
4. Tighten mapping column proportions so Gruppe begins closer to Dateiname.
5. Preserve responsive stacking, add CSS assertions, run checks, document and commit.

## Acceptance criteria

- `#1`, title/language and actions have clear spacing and hierarchy.
- Group column begins closer to the filename column.
- Narrow layouts still stack without horizontal overflow.
