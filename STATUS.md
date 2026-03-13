# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin Anime step flow:
  - `/admin/anime` selection-only browser
  - `/admin/anime/[id]/edit` for general anime context
  - `/admin/anime/[id]/episodes`
  - `/admin/anime/[id]/episodes/[episodeId]/edit`
  - `/admin/anime/[id]/episodes/[episodeId]/versions`
- Anime edit route: sectioned cards, sticky save UX, advanced developer panel, Jellyfin sync, genre dropdown
- Jellyfin sync wizard:
  - explicit search -> preview -> confirm -> sync flow for season-wide imports
  - visible loading, empty, success, and error feedback
  - sync guard when preview has zero importable episodes
  - full sync upserts all accepted episodes and persists Jellyfin `stream_url` links for synced versions
- Single-episode sync is available for corrective re-syncs and is live-validated against the local stack
- Jellyfin admin search works against the configured live remote instance
- Grouped episodes API supports lightweight reads via `includeVersions` / `includeFansubs`
- Playback security: IP-based rate limiting, grant token replay protection, audit logging
- Auth lifecycle (issue/refresh/revoke with signed tokens)
- Fansub profiles, version browser, admin CRUD
- Media proxy (streams, images, video, backdrops, banners)
- Release/episode grant flow for playback
- Public release-assets contract is live at `GET /api/v1/releases/:releaseId/assets`; episode detail consumes the real endpoint and hides empty asset responses cleanly
- Public anime group detail now loads live Jellyfin group assets at `GET /api/v1/anime/:animeId/group/:groupId/assets`
- Group detail prefers the Jellyfin `Groups` library, falls back to `Subgroups`, and exposes root `backdrop`, `primary`, `poster`, `thumb`, and `banner` hero artwork
- Group detail uses the root backdrop as the page background, the root banner as the info-panel background, and episode-folder backdrops as gallery images
- Group-library lookup is cached in-process to reduce repeated Jellyfin `Library/MediaFolders` timeout failures
- The OpenAPI contract now matches the shipped group-assets payload, including root `poster`, `thumb`, `banner`, top-level `folder_name`, and episode image/media fields
- Group root discovery now paginates across Jellyfin root-folder pages instead of stopping at the first 500 entries
- Local stack is deployed and responding on:
  - Frontend: `http://localhost:3002`
  - Backend: `http://localhost:8092`
- GSD for Codex is installed locally in the workspace and successfully produced a brownfield codebase map in `.planning/codebase/`
- The normalized schema draft has been upgraded into a phased migration brief in `docs/architecture/db-schema-v2.md`
- The DB migration lane now has GSD ownership rules, pilot baseline, and a restartable handoff in `.planning/phases/04-gsd-migration-planning-pilot/`
- Phase 5 (Reference and Metadata Groundwork) planning is complete with full GSD artifacts in `.planning/phases/05-reference-and-metadata-groundwork/`
- Contract impact analysis confirms NO CHANGES NEEDED for all Public APIs during Phase 5
- Package 2 (Backend Implementation) execution in progress:
  - Tasks 1-4 Complete: Database migrations for reference data, metadata references, normalized metadata, junction tables
  - Tasks 5-11 Pending: Repository layer, service layer, and comprehensive tests
- Database migrations 0019-0022 created and ready for local execution

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d --build
curl http://localhost:8092/health
curl http://localhost:8092/api/v1/anime/25/group/301/assets
curl http://localhost:8092/api/v1/releases/311/assets
curl -I http://localhost:3002/anime/25/group/301
cd backend && go test ./...
cd ../frontend && npm run build
```

## Next (Top 3)
1. Implement repository layer for reference and metadata tables (Tasks 5-6)
2. Implement service layer with backfill logic and validation (Task 7)
3. Implement comprehensive tests for migrations, repositories, services, and integration (Tasks 8-11)

## Known Risks
- Reference data migration complexity: Large existing dataset needs safe backfill with verification
- Foreign key dependencies: New tables must align with existing schema during shadow mode
- Shadow mode validation duration: Metrics/duration thresholds need refinement during execution
- Package 2 critical path: SDK generation blocked until backend tables exist
- Phase 5 scope expansion: Any unexpected contract needs require phase re-planning
