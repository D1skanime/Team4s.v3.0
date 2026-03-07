# WORKING_NOTES

## Current Workflow Phase
- Phase: Public anime group-detail hardening
- Focus today: switch the group detail page to the better Jellyfin `Groups` library, expose root banner/thumb artwork, and reduce the timeout pain

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
