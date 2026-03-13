# DAYLOG

## 2026-03-13
- Installed GSD locally for Codex under workspace `.codex/` as a planning pilot rather than a repo-wide workflow replacement.
- Ran the brownfield mapping flow and generated `.planning/codebase/STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, and `CONCERNS.md`.
- Reviewed the proposed normalized DB schema against the current production tables and confirmed it should be treated as a phased target architecture instead of a big-bang migration.
- Stored the schema draft canonically in `Team4s.v3.0/docs/architecture/db-schema-v2.md` so future restarts can resume from files, not chat history.

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
