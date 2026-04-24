# WORKING_NOTES

## Current Workflow Phase
- Phase 21 is complete.
- Phase 22 is the active thread: make anime edit genuinely use the create-flow foundation and cut the last legacy/admin clutter.

## Useful Facts To Keep
- Anime edit now uses the shared create-style workspace and simpler Jellyfin selection flow.
- The edit asset area must merge manual persisted assets with Jellyfin fallback assets; singular replacement logic was the wrong model for backgrounds and background videos.
- Dismissing individual Jellyfin assets in edit is now supported at draft level without dropping overall Jellyfin linkage.
- Episode version delete used to fail because `EpisodeVersionRepository.Delete` was still a Phase-20 deferred placeholder; that backend path is now implemented.
- Fansub collaboration records are still persisted for release wiring, but the default `/admin/fansubs` list should only show real groups.

## Verification Memory
- `cd backend && go test ./internal/repository ./internal/handlers -count=1` passed on 2026-04-24.
- `cd frontend && npm.cmd test -- src/app/admin/anime/[id]/edit/page.test.tsx` passed on 2026-04-24.
- `cd frontend && npm.cmd run build` passed on 2026-04-24.
- Docker backend/frontend are up and the anime edit, anime episodes, and fansub admin routes all returned `200`.

## Mental Unload
- Today was a lot of UI subtraction, which was the right call.
- Tomorrow should not drift back into legacy edit behavior or broad polish; either close Phase 22 or name the one remaining gap cleanly.
