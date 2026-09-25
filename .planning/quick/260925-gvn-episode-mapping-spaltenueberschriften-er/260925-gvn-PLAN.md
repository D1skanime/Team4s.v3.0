# Quick Plan

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `docs/agent-guidelines-ui.md`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportEpisodeGroup.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.tsx`
- `frontend/src/app/admin/anime/[id]/episodes/import/page.module.css`

## Actions

1. Add a reusable `EpisodeImportMappingColumnHeader` beside the existing mapping row component.
2. Render it for grouped and unmapped mapping lists.
3. Flatten the row field wrapper into the existing grid with `display: contents`, so header and row columns align as Dateiname/Gruppe/Episode/Version/Aktionen.
4. Hide the desktop header at the compact responsive breakpoint while preserving field labels.
5. Add a CSS layout assertion, run typecheck/lint/tests/diff checks, document and commit.

## Acceptance criteria

- A visible header row reads „Dateiname“, „Gruppe“, „Episode“, „Version“, „Aktionen“ above mapping rows.
- Header and row columns share the same grid definition.
- The group chip/search field remains in the Gruppe column, episode number in Episode, version in Version, and action buttons in Aktionen.
- Narrow layouts remain usable without horizontal overflow.
