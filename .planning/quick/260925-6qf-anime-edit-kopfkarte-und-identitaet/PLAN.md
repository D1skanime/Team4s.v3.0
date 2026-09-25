# Quick Plan

1. Restore semantic compact identity tiles for Anime ID, AniSearch ID, Jellyfin Item ID, Quelle, and Ordnerpfad.
2. Move the edit header content into the shared editor workspace and visually combine it with the stepper.
3. Keep the public-cover link, AniSearch action, and existing edit/create workspace behavior unchanged.
4. Run focused Anime edit tests, typecheck, and diff checks.
5. Commit atomically, push to `origin main`, and restart the frontend.

## Read first

- `AGENTS.md`
- `docs/engineering/implementation-contract.md`
- `docs/frontend/ui-system.md`
- `frontend/src/app/admin/anime/components/AnimeEditPage/AnimeEditWorkspace.tsx`
- `frontend/src/app/admin/anime/components/AnimeEditPage/SharedAnimeEditorWorkspace.tsx`
- `frontend/src/app/admin/anime/create/CreatePageStepper.tsx`
- `frontend/src/app/admin/anime/create/page.module.css`

## Acceptance Criteria

- The edit header and stepper appear as one bordered, rounded card.
- Identity labels and values are separated, aligned, and wrap long IDs/paths safely.
- Source and Jellyfin Item ID remain visible.
- AniSearch and cover links remain functional.
- Create flow keeps its existing independent header and stepper behavior.
