# 2026-03-07 - Day Summary

## Scope
- Project: Team4s.v3.0
- Milestone: public anime group-detail experience backed by live Jellyfin group-library assets
- Focus: harden and enrich the new group-detail slice so the right root artwork, episode backdrops, and live UX all come from Jellyfin cleanly

## Goals Intended vs Achieved
- Intended: make `/anime/:animeId/group/:groupId` use the richer Jellyfin library metadata and stop fighting repeated upstream timeouts while refining the visual hierarchy.
- Achieved:
  - Switched group-detail asset resolution to prefer Jellyfin `Groups` over `Subgroups`.
  - Exposed root `banner_url` and `thumb_url` in the public hero payload.
  - Parsed episode-folder `BackdropImageTags` into normal gallery images.
  - Added a library-ID cache to stop repeatedly calling Jellyfin `Library/MediaFolders` on every request.
  - Iterated the group page overlays so backdrop/banner visibility and asset readability improved materially.
  - Rebuilt and revalidated the local stack on `http://localhost:3002` and `http://localhost:8092`.

## Structural Decisions
- Jellyfin `Groups` is now the preferred source for anime-group presentation assets; `Subgroups` remains fallback.
- Page-level background comes from the root backdrop.
- The upper info panel uses the root banner.
- Episode-folder backdrops remain ordinary gallery images and do not become hero assets.
- Repeated library-ID lookups are cached in-process to reduce transient Jellyfin timeouts.

## Implementation Changes
- Backend:
  - Updated: `backend/internal/models/group_assets.go`
  - Updated: `backend/internal/handlers/group_assets_handler.go`
  - Updated: `backend/internal/handlers/group_assets_jellyfin.go`
  - Updated: `backend/internal/handlers/group_assets_jellyfin_test.go`
- Frontend:
  - Updated: `frontend/src/app/anime/[id]/group/[groupId]/page.tsx`
  - Updated: `frontend/src/app/anime/[id]/group/[groupId]/page.module.css`
  - Updated: `frontend/src/components/groups/GroupAssetsExperience.module.css`
  - Updated: `frontend/src/types/groupAsset.ts`
- Contracts/Docs:
  - OpenAPI still needs update to match the now-shipped payload

## Problems Solved
- The group-detail page now reads richer root artwork from the better Jellyfin library.
- Episode gallery images now appear even when Jellyfin stored them as folder backdrops instead of `Photo` items.
- The repeated Jellyfin library lookup timeout pain was reduced by caching the resolved library ID.
- Root-vs-episode image behavior is explicit: root backdrop + root banner + episode backdrops each have their own role.

## Problems Found But Not Fully Solved
- `shared/contracts/openapi.yaml` does not yet match the shipped group-assets payload exactly.
- Group library discovery currently scans only the first 500 Jellyfin root folders.
- Missing/invalid `JELLYFIN_*` configuration is still too easy to misread as a missing folder problem.
- Group-detail episode links still depend on the currently loaded release list.
- Hero/banner contrast still benefits from one more quick browser pass if the user wants further visual tuning.

## Evidence / References
- Validation run today:
  - `go test ./...` passed
  - `npm run build` passed
  - `docker compose up -d --build` passed
  - `GET /health` -> `200`
  - `GET /api/v1/anime/25/group/301/assets` -> `200`
  - `GET /anime/25/group/301` -> `200`

## Tradeoffs / Open Questions
- The UI now assumes root banner is the correct info-panel treatment when present; this is better than the Episode 1 fallback, but still depends on editorial consistency in Jellyfin.
- Release-assets persistence is still a separate unfinished track for episode detail routes and should not be confused with the group-library presentation lane.

## Next Steps
1. Align `shared/contracts/openapi.yaml` with the real group-assets contract including `thumb_url` and `banner_url`.
2. Add pagination/iteration to root-folder discovery.
3. Improve group-assets handler error mapping for config/auth/connectivity failures.

## First Task Tomorrow
- Update the OpenAPI schema for `GET /api/v1/anime/:animeId/group/:groupId/assets` to match the live payload exactly, including `thumb_url` and `banner_url`.
