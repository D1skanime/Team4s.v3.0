# WORKING_NOTES

## Current Workflow Phase
- Phase: Public anime group-detail hardening
- Focus today: wire the group detail page to live Jellyfin `Subgroups` assets and lock the root-vs-episode image rules

## Project State
- Done:
  - Public subgroup assets endpoint exists and is live
  - Group detail route consumes the real subgroup asset payload
  - Root subgroup backdrop drives the full-page background
  - Episode 1 imagery drives the info-panel background
  - Episode-folder images stay normal gallery items
  - Local frontend/backend stack rebuilt and reachable
- In Progress:
  - Contract/documentation cleanup around the new payload
  - Hardening subgroup discovery and operational error handling
- Blocked:
  - No hard blocker for local work; remaining issues are correctness and scaling follow-ups

## Key Decisions and Context (Today)
- Intent and constraints:
  - Keep Jellyfin subgroup assets presentation-driven, not playback-driven by default
  - Treat root folder artwork and episode-folder images differently
  - Preserve the existing page routes instead of introducing a parallel asset-only route
- Design/approach:
  - Root subgroup folder artwork drives page-level presentation
  - `Episode N` folders define the episode sections
  - Episode images stay gallery/lightbox items
  - Episode media files become media asset cards with stream links where applicable
- Assumptions:
  - Current subgroup folder naming remains stable enough for matching (`<animeId>_<title>_<group-slug>`) (risky)
  - Episode 1 is the right fallback source for the info-panel image when no better explicit mapping exists (risky)
- Quality bar:
  - Live endpoint returns meaningful subgroup data
  - Group page renders from that data without breaking other public routes
  - Root backdrop never gets confused with episode gallery images

## Active Threads
- Public group detail now depends on Jellyfin `Subgroups` instead of placeholder-only content
- Root backdrop and episode image behavior is now explicitly separated
- Release-assets persistence is still a separate unfinished lane for episode detail pages
- OpenAPI/docs are lagging behind the shipped subgroup payload

## Required Contracts / UX Notes
- New public subgroup assets endpoint: `GET /api/v1/anime/{animeId}/group/{groupId}/assets`
- Current payload shape includes:
  - `folder_name`
  - `hero.backdrop_url`
  - `hero.primary_url`
  - `hero.poster_url`
  - `episodes[].images[]`
  - `episodes[].media_assets[]`
- UX binding:
  - root backdrop = whole page background
  - Episode 1 landscape-like image = info-panel background
  - episode backdrops/images = normal clickable gallery images

## Quick Checks
```bash
go test ./...
npm test
npm run build
docker compose ps
curl http://localhost:8092/health
curl http://localhost:8092/api/v1/anime/25/group/301/assets
curl -I http://localhost:3002/anime/25/group/301
```

## Parking Lot
- Add pagination to subgroup library discovery
- Clarify config/auth failures in the subgroup asset handler
- Revisit episode-link lookup so it is not tied to the current release list size
- Return to persisted release assets for `/api/v1/releases/:releaseId/assets`

### Day 2026-03-06
- Phase: Public anime group-detail hardening
- Accomplishments:
  - Added live subgroup assets support for `/anime/:animeId/group/:groupId`
  - Mapped Jellyfin subgroup root artwork to group-detail hero data
  - Mapped `Episode N` folders to episode galleries and media assets
  - Split the presentation rules so root backdrop stays page-level while episode images stay gallery-level
  - Rebuilt the stack and revalidated `/anime/25/group/301`
- Key Decisions:
  - Jellyfin `Subgroups` is now the source for group-detail presentation assets
  - Episode-folder backdrops are not hero assets; they stay ordinary gallery images
  - Episode 1 imagery is the current info-panel background source
- Risks/Unknowns:
  - OpenAPI contract drift
  - subgroup discovery pagination limit
  - config failures are not yet clearly distinguished
- Next Steps:
  - update the OpenAPI schema
  - harden subgroup discovery
  - improve operator-facing Jellyfin error states
- First task tomorrow: update `shared/contracts/openapi.yaml` to match the live subgroup assets payload
