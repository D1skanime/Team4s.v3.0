# WORKING_NOTES

## Current Workflow Phase
- Phase: Public anime group-detail hardening plus post-brief migration pilot handoff
- Focus today: push the GSD pilot from setup into an executed migration brief plus a restartable migration-lane handoff

## Project State
- Done:
  - Public group-assets endpoint exists and is live
  - Group detail route consumes the real group-assets payload
  - Root backdrop drives the full-page background
  - Root banner drives the info-panel background
  - Episode folder backdrops/images stay normal gallery items
  - Group library lookup is cached to reduce repeated Jellyfin `Library/MediaFolders` timeouts
  - Local frontend/backend stack rebuilt and reachable
- In Progress:
  - Contract/documentation cleanup around the new payload
  - Hardening group discovery and operational error handling
  - Final visual tuning on the group-detail page
  - Choosing the first concrete migration execution slice after the completed brief
- Blocked:
  - No hard blocker for local work; remaining issues are correctness and scaling follow-ups

## Key Decisions and Context (Today)
- Intent and constraints:
  - Keep Jellyfin group assets presentation-driven, not playback-driven by default
  - Treat root folder artwork and episode-folder images differently
  - Preserve the existing page routes instead of introducing a parallel asset-only route
- Design/approach:
  - Prefer `Groups`, fall back to `Subgroups`
  - Root folder artwork drives page-level presentation
  - `Episode N` folders define the episode sections
  - Episode folder backdrops and photos stay gallery/lightbox items
  - Episode media files become media asset cards with stream links where applicable
- Assumptions:
  - Current group folder naming remains stable enough for matching (`<animeId>_<title>_<group-slug>`) (risky)
  - Root `banner` is the right info-panel source when present (risky if editorial practice drifts)
- Quality bar:
  - Live endpoint returns meaningful group data
  - Group page renders from that data without breaking other public routes
  - Root backdrop/banner never gets confused with episode gallery images

## Active Threads
- Public group detail now depends on Jellyfin `Groups` first and `Subgroups` second instead of placeholder-only content
- Root backdrop, root banner, and episode image behavior is now explicitly separated
- Release-assets persistence is still a separate unfinished lane for episode detail pages
- OpenAPI/docs are lagging behind the shipped group-assets payload
- GSD has been installed locally under `.codex/` and successfully generated `.planning/codebase/*.md` as a pilot for the upcoming schema-migration planning work
- GSD planning and execution artifacts now carry the migration lane baseline and handoff, while Team4s repo docs remain the daily operating truth

## Required Contracts / UX Notes
- Public group assets endpoint: `GET /api/v1/anime/{animeId}/group/{groupId}/assets`
- Current payload shape includes:
  - `folder_name`
  - `hero.backdrop_url`
  - `hero.primary_url`
  - `hero.poster_url`
  - `hero.thumb_url`
  - `hero.banner_url`
  - `episodes[].images[]`
  - `episodes[].media_assets[]`
- UX binding:
  - root backdrop = whole page background
  - root banner = info-panel background
  - episode backdrops/images = normal clickable gallery images

## Quick Checks
```bash
go test ./...
npm run build
docker compose ps
curl http://localhost:8092/health
curl http://localhost:8092/api/v1/anime/25/group/301/assets
curl -I http://localhost:3002/anime/25/group/301
```

## Parking Lot
- Add pagination to group library discovery
- Clarify config/auth failures in the group-assets handler
- Revisit episode-link lookup so it is not tied to the current release list size
- Return to persisted release assets for `/api/v1/releases/:releaseId/assets`
- Turn `docs/architecture/db-schema-v2.md` into a milestone with explicit compatibility phases
- Add or insert the first concrete migration execution phase after the brief

### Day 2026-03-07
- Phase: Public anime group-detail hardening
- Accomplishments:
  - Switched group-detail library preference to Jellyfin `Groups`
  - Exposed root `thumb_url` and `banner_url` in the group-assets hero payload
  - Mapped episode folder `BackdropImageTags` into normal gallery images
  - Added a library-ID cache to avoid repeated `Library/MediaFolders` timeout pain
  - Iterated the group page visual layers so root backdrop, root banner, and asset text are more visible
  - Rebuilt the stack and revalidated `/anime/25/group/301`
- Key Decisions:
  - `Groups` is the preferred source for group-detail presentation assets; `Subgroups` is fallback
  - Root banner is the correct info-panel background source
  - Episode-folder backdrops are not hero assets; they stay ordinary gallery images
- Risks/Unknowns:
  - OpenAPI contract drift
  - group library discovery pagination limit
  - config failures are not yet clearly distinguished
  - visual tuning may still want one more pass
- Next Steps:
  - update the OpenAPI schema
  - harden group discovery
  - improve operator-facing Jellyfin error states
- First task tomorrow: update `shared/contracts/openapi.yaml` to match the live group-assets payload including `thumb_url` and `banner_url`

### Day 2026-03-13
- Phase: Brownfield planning setup for schema migration
- Accomplishments:
  - Installed GSD for Codex locally under workspace `.codex/`
  - Ran a successful GSD-style codebase map that generated `.planning/codebase/STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`
  - Captured the proposed normalized DB target model in `docs/architecture/db-schema-v2.md`
  - Executed GSD Phase 3 so the target model became a phased migration brief with blocker audit, impact map, rollout slices, and validation gates
  - Executed GSD Phase 4 so the migration lane now has ownership rules, pilot baseline, and a clear handoff / next-action guide
  - Chose to keep GSD as the migration planning/execution layer while retaining Team4s repo-local docs as the canonical daily workflow
- Key Decisions:
  - Treat the normalized schema as a target architecture, not an immediate rewrite
  - Keep the schema draft canonical in-repo so a restart can resume from files instead of chat history
  - Keep Team4s repo docs canonical for daily state and `.planning/` canonical for migration-lane continuation
- Risks/Unknowns:
  - The migration scope touches many repositories and handlers through the current flat schema
  - The pilot still needs its first concrete post-brief execution slice to prove value beyond planning
- Next Steps:
  - update the OpenAPI schema
  - harden group discovery
  - add and plan the first migration execution slice after the completed brief
- First task tomorrow: update `shared/contracts/openapi.yaml`, then decide whether to use `gsd-add-phase` or `gsd-insert-phase` for the first migration execution slice
