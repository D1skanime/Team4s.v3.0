# WORKING_NOTES

## Current Workflow Phase
- Phase 20 is verified complete.
- The active thread has shifted from "prove the seam" to "choose the next narrow follow-up from the verified baseline".

## Useful Facts To Keep
- Frontend mapping logic now allows parallel releases for the same canonical episode.
- Anime create now persists both providers cleanly:
  - `anime.source` stays the authoritative Jellyfin runtime link when explicitly selected
  - `anime_source_links` stores both Jellyfin and AniSearch tags
- Phase 20 live replay used `3x3 Eyes` (`anime_id=6`) and proved:
  - canonical episodes in `episodes`
  - multilingual titles in `episode_titles`
  - release-native versions/variants/coverage rows
  - Jellyfin stream linkage in `release_streams` + `stream_sources`
- The post-apply workbench still looks actionable after an idempotent success. That is real UX follow-up territory, not a persistence failure.
- The current Phase-20 closure evidence lives in `.planning/phases/20-release-native-episode-import-schema/20-UAT.md`.

## Verification Memory
- `cd backend && go test ./internal/handlers ./internal/repository -count=1` passed on 2026-04-23.
- `cd frontend && npm.cmd test -- src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` passed on 2026-04-23.
- `cd frontend && npm.cmd run build` passed on 2026-04-23.
- Docker backend/frontend are currently up and both main routes returned `200`.

## Mental Unload
- We crossed the annoying line today: this is no longer "probably done", it is actually verified.
- Tomorrow should not reopen Phase 20 by inertia. Start from the follow-up choice, not from replay anxiety.
