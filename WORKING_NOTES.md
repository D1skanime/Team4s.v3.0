# WORKING_NOTES

## Current Workflow Phase
- Phase: Public anime group-detail hardening plus migration-planning setup
- Focus today: validate a local GSD install for brownfield planning and capture the proposed normalized DB schema inside the repo without losing the current group-assets lane

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
  - Framing the normalized DB schema as a phased migration instead of a big-bang rewrite
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
  - Chose to keep GSD as a pilot planning layer for the migration rather than replacing the existing Team4s daily workflow
- Key Decisions:
  - Treat the normalized schema as a target architecture, not an immediate rewrite
  - Keep the schema draft canonical in-repo so a restart can resume from files instead of chat history
- Risks/Unknowns:
  - The migration scope touches many repositories and handlers through the current flat schema
  - GSD value for this repo is still being evaluated and may remain planning-only
- Next Steps:
  - update the OpenAPI schema
  - harden group discovery
  - draft the migration phases around the new schema
- First task tomorrow: update `shared/contracts/openapi.yaml`, then turn `docs/architecture/db-schema-v2.md` into a phased migration outline
