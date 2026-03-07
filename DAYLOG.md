# DAYLOG

## 2026-03-07
- Switched public group-detail asset resolution to prefer the Jellyfin `Groups` library, with `Subgroups` retained as fallback.
- Added root hero enrichment so `banner_url` and `thumb_url` are available alongside `backdrop_url`, `primary_url`, and `poster_url`.
- Promoted episode-folder `BackdropImageTags` into `episodes[].images[]`, so episode visuals render as the intended gallery.
- Added a backend library-ID cache to reduce repeated Jellyfin `Library/MediaFolders` timeouts on the group-assets endpoint.
- Rebuilt `team4sv30-backend` and `team4sv30-frontend` and revalidated:
  - `http://localhost:8092/api/v1/anime/25/group/301/assets`
  - `http://localhost:3002/anime/25/group/301`
- Iterated the group page overlays and contrast so the root backdrop, root banner, and asset text are more visible in the live browser.

## 2026-03-06
- Added the public `GET /api/v1/anime/:animeId/group/:groupId/assets` subgroup assets contract/handler.
- Wired `/anime/[id]/group/[groupId]` to the live subgroup asset payload from Jellyfin `Subgroups`.
- Mapped subgroup root artwork to page-level hero data and `Episode N` folders to episode gallery/media sections.
- Split image semantics so:
  - root backdrop drives the page background
  - Episode 1 imagery drives the upper info panel
  - episode-folder backdrops/images stay normal gallery items
- Re-ran `go test ./...`, `npm test`, and `npm run build`.
- Rebuilt `team4sv30-backend` and `team4sv30-frontend` and validated the live route:
  - `http://localhost:8092/api/v1/anime/25/group/301/assets`
  - `http://localhost:3002/anime/25/group/301`
