# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Phase 5 - Reference and Metadata Groundwork (normalized v2 schema migration)
- **Milestone:** Phase 5 planning complete, Package 2 (Backend Implementation) ready for execution
- **Completion:** ~70%

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
- Create Package 2 execution artifacts (05-02-CONTEXT.md, 05-02-PLAN.md, 05-02-orchestrator-handoff.md)
- Begin team4s-go lane implementation (tables, repositories, services with shadow mode)
- Refine verification gates and backfill strategy for reference data migration
- Execute Package 2, then prepare Package 1 (TypeScript SDK) for execution

## Key Decisions

### Phase 5 (Reference and Metadata Groundwork) - 2026-03-13
- Phase 5 is backend foundation only: new tables, repositories, services without public API changes
- Contract freeze set for Phase 5: NO CHANGES NEEDED for all Public APIs
- Package execution order: Backend (Package 2) before SDK (Package 1) to avoid premature generation
- Shadow mode pattern enables validation before foreign key enforcement
- Handler consumption deferred to Phase 6 to maintain contract stability
- Phase 5 planning complete with handoff artifacts ready for execution agents

### Previous Decisions (Group Assets & Migration Planning)
- Jellyfin `Groups` is the preferred source for anime/group presentation assets on `/anime/:animeId/group/:groupId`, with `Subgroups` as fallback
- The root group folder artwork controls page-level presentation (backdrop, banner, poster, thumb)
- Episode folders are the source of content blocks (images, media files)
- Episode-folder backdrops remain ordinary images in the gallery and must not override page-level hero treatment
- The checked-in OpenAPI contract stays aligned with shipped payload before more consumer work continues
- Group root discovery iterates across Jellyfin pages instead of assuming first 500 root folders are sufficient
- GSD installed locally under `.codex/` as pilot planning layer for DB schema migration
- Canonical normalized schema draft lives in `docs/architecture/db-schema-v2.md`
- Migration brief is phased with blocker resolutions, impact surfaces, rollout slices, validation gates
- Team4s repo-local docs remain canonical for daily project state, `.planning/` serves migration planning/execution layer

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- Local stack must answer `/health`, group-assets API smoke checks, and the live group-detail route before closeout
- Any schema-migration planning must keep backward-compatible rollout steps explicit before implementation begins
