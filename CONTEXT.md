# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Public anime group experience backed by live Jellyfin subgroup assets
- **Milestone:** EPIC 0-6 delivered at route level; group detail has moved from placeholder copy to real subgroup-backed presentation
- **Completion:** ~55%

## Current State

### Done (2026-03-06)
- Added a public subgroup assets endpoint at `GET /api/v1/anime/:animeId/group/:groupId/assets`.
- Matched anime/group pages against Jellyfin `Subgroups` folders such as `25_11 eyes_strawhat-subs`.
- Shipped backend parsing for:
  - root folder artwork -> group page hero data
  - `Episode N` folders -> episode-level gallery images + media assets
- Wired `/anime/[id]/group/[groupId]` to the live subgroup assets payload.
- Updated the group detail layout so:
  - the subgroup root backdrop drives the full-page background
  - Episode 1 imagery drives the info-panel background
  - episode-folder images stay normal gallery items instead of becoming implicit backdrops
- Rebuilt the local stack and validated:
  - `GET /api/v1/anime/25/group/301/assets`
  - `http://localhost:3002/anime/25/group/301`

### Previously Completed
- EPIC 0: Group routes, breadcrumbs, group edge navigation
- EPIC 1: Anime detail CTA to group pages
- EPIC 2: Group story page
- EPIC 3: Releases page base feed/filter UX
- EPIC 4: Episode Media Assets section shell
- EPIC 5: Public playback modal + stream proxy
- EPIC 6: Screenshot gallery + lightbox + pagination
- Release-context episode detail consumes the real public `GET /api/v1/releases/:releaseId/assets` endpoint

### Pending
- Align the OpenAPI contract with the shipped subgroup assets response
- Paginate subgroup-library discovery beyond the first 500 Jellyfin root items
- Improve configuration error handling for missing/invalid `JELLYFIN_*`
- Decide whether episode detail lookups on the group page should resolve outside the currently loaded release feed

## Key Decisions
- Jellyfin `Subgroups` is the source for anime/group presentation assets on `/anime/:animeId/group/:groupId`.
- The subgroup root folder artwork controls page-level presentation:
  - root backdrop -> full-page background
  - root primary/poster -> hero poster fallbacks
- Episode folders are the source of content blocks:
  - episode images -> gallery/lightbox content
  - episode media files -> OP/ED/Kara/Insert tiles
- Episode-folder backdrops remain ordinary images in the gallery and must not override page-level hero treatment.

## Quality Bar
- `go test ./...` must pass
- `npm test` must pass
- `npm run build` must pass
- Local stack must answer `/health`, subgroup asset API smoke checks, and the live group-detail route before closeout
