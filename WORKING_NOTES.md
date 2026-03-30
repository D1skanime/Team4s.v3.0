# WORKING_NOTES

## Current Workflow Phase
- Phase: Anime v2 cutover
- Focus: keep the running anime vertical on `team4s_v2` and pull remaining write paths off the legacy flat schema

## Project State
- Done:
  - fresh `database/migrations_v2` bootstrap for normalized anime/media foundation
  - local dev backend switched to `team4s_v2`
  - v2 anime create path with titles/genres/media/external linkage
  - v2 anime list/detail/media-lookup/backdrops
  - v2 anime delete with audit retention and unreferenced media cleanup
  - admin anime create/overview UI simplification
  - public Jellyfin cover/logo/banner rendering fix
  - Jellyfin UTF-8 normalization fix in backend client
- In progress:
  - admin anime update/edit migration to v2
  - identifying remaining anime routes that still expect flat legacy columns
  - keeping compatibility layers only where they still materially help the cutover
- Blocked:
  - no product blocker
  - some broader route families are still untouched by the v2 migration

## Key Decisions & Context
- New anime work targets v2 first; legacy flat anime writes are now technical debt, not the direction.
- `team4s_v2` is the local runtime source of truth for anime.
- Keep route migration incremental and live-verified.
- Public media proxy URLs from the backend should bypass Next image optimization when they come from `/api/v1/media/...`.
- Delete must preserve audit and clean up unreferenced local cover media.

## Assumptions
- Existing untracked repository files are intentional user/worktree state and must not be cleaned up implicitly.
- The backend groundwork already present in untracked files was meant to be integrated, not discarded.
- The user wants the old anime DB treated as disposable local history while the v2 path becomes the real active runtime.

## Parking Lot
- full admin edit/update parity on v2 after the first write migration lands
- later domain migrations beyond anime: episodes/releases/fansub/media admin surfaces
- eventual legacy compatibility cleanup once the anime vertical is fully on v2
