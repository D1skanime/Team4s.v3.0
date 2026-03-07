# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Public anime group experience backed by live Jellyfin group-library assets
- **Milestone:** EPIC 0-6 delivered at route level; group detail now renders real Jellyfin-backed presentation instead of placeholder-only content
- **Completion:** ~60%

## Current State

### Done (2026-03-07)
- Added a public group assets endpoint at `GET /api/v1/anime/:animeId/group/:groupId/assets`.
- Switched library preference from Jellyfin `Subgroups` to `Groups`, with `Subgroups` retained as fallback.
- Shipped backend parsing for:
  - root folder artwork -> group page hero data (`backdrop`, `primary`, `poster`, `thumb`, `banner`)
  - `Episode N` folders -> episode-level gallery images + media assets
  - episode folder `BackdropImageTags` -> normal gallery images
- Wired `/anime/[id]/group/[groupId]` to the live group-assets payload.
- Updated the group detail layout so:
  - the root backdrop drives the full-page background
  - the root banner drives the info-panel background
  - episode-folder backdrops/images stay normal gallery items instead of becoming implicit backdrops
- Added a Jellyfin library-ID cache so repeated group-asset requests do not repeatedly hit `Library/MediaFolders`.
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
- Align the OpenAPI contract with the shipped group-assets response
- Paginate group-library discovery beyond the first 500 Jellyfin root items
- Improve configuration error handling for missing/invalid `JELLYFIN_*`
- Decide whether episode detail lookups on the group page should resolve outside the currently loaded release feed

## Key Decisions
- Jellyfin `Groups` is now the preferred source for anime/group presentation assets on `/anime/:animeId/group/:groupId`, with `Subgroups` as fallback.
- The root group folder artwork controls page-level presentation:
  - root backdrop -> full-page background
  - root primary/poster -> hero poster fallbacks
  - root banner -> info-panel background
  - root thumb -> extra hero artwork metadata
- Episode folders are the source of content blocks:
  - episode images/backdrops -> gallery/lightbox content
  - episode media files -> OP/ED/Kara/Insert tiles
- Episode-folder backdrops remain ordinary images in the gallery and must not override page-level hero treatment.

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- Local stack must answer `/health`, group-assets API smoke checks, and the live group-detail route before closeout
