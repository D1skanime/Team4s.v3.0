# WORKING_NOTES

## Active Threads
- Full Jellyfin sync remains bulk-default and single-episode sync remains corrective; continue handler modularization without changing behavior
- Intermittent Jellyfin timeout reports (`server nicht erreichbar`) need tighter diagnostics and repeatable triage steps
- Full code/architecture/UX review is still needed across sync/admin slices after today's refactors
- CI-equivalent regression validation still needs a fresh pass after crop utility extraction and migration work
- Security follow-through: `.env` stays local-only and untracked; secret rotation discipline still matters

## Required Contracts / UX Notes
- Current admin search endpoint: `GET /api/v1/admin/jellyfin/series?q=...&limit=...`
- Current admin preview endpoint: `POST /api/v1/admin/anime/{id}/jellyfin/preview`
- Current admin sync endpoint: `POST /api/v1/admin/anime/{id}/jellyfin/sync`
- Standard error shape may now include `error.code` and `error.details`
- Search/preview/sync states must keep surfacing:
  - `server nicht erreichbar`
  - `jellyfin token ungueltig`
  - `jellyfin ist nicht konfiguriert`
  - `keine importierbaren episoden gefunden`
- Full sync endpoint remains `POST /api/v1/admin/anime/{id}/jellyfin/sync` and processes all accepted episodes for the selected season/path
- Corrective single-episode sync endpoint remains `POST /api/v1/admin/anime/{id}/episodes/{episodeId}/sync`
- Episodes overview target route stays `/admin/anime/{id}/episodes`, backed by `GET /api/v1/anime/{id}/episodes?includeVersions=true&includeFansubs=true`
- Episode management rows should show path order / sequence and the current stream link
- The primary episode-row action should be edit/version management, not playback
- The episode edit action should land on the existing versions route when version management is the goal
- Public anime detail should keep exactly one active fansub-group context visible at a time
- Switching the active fansub group must swap both the visible history/description and the episode-version list
- Only public versions for the active fansub group should appear in the public episode list

## Quick Checks
```bash
go test ./internal/handlers
npm test
npm run build
docker compose ps
curl http://localhost:8092/health
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
```

## Parking Lot
- Resume handler modularization after the sync and episode-visibility slices are locked
- Add lightweight timeout telemetry around Jellyfin sync/admin operations
- Capture and retain query-plan snapshots as anime dataset grows post-`pg_trgm`

### Day 2026-03-03
- Phase: P2 closeout hardening + maintainability pass
- Accomplishments:
  - Migrated remaining frontend `img` usage to `next/image`
  - Clarified sync UI copy (bulk season sync vs corrective single-episode sync)
  - Extracted `SyncEpisodeFromJellyfin` to `jellyfin_episode_sync.go`
  - Added deterministic crop math utility + Vitest parity tests
  - Added/applied `0017_anime_search_trgm` migration after benchmark pass
  - Removed 10 unreferenced broken cover artifacts from `frontend/public/covers`
- Key Decisions:
  - `pg_trgm` is now the chosen scaling path for substring anime search
  - Crop math belongs in testable pure utilities, not inline UI logic
  - Broken public assets are deleted only after DB reference validation
- Risks/Unknowns:
  - Remaining Jellyfin handlers still need additional modularization
  - Jellyfin upstream timeout behavior remains intermittent
  - CI parity has not yet been re-run after all new changes
- Next Steps:
  - Continue handler decomposition with behavior-preserving tests
  - Run CI-equivalent full regression and resolve any drift
  - Add timeout-focused diagnostics for Jellyfin operations
- First task tomorrow: map the next oversized function block in `jellyfin_sync.go` and extract it into a focused helper file

### Day 2026-03-01
- Phase: Sync hardening + episodes overview groundwork
- Accomplishments: structured Jellyfin errors, live local deployment checks, conditional grouped episode reads, new overview components
- Key Decisions: optional `code/details` in error responses; block sync on zero accepted episodes
- Risks/Unknowns: duplicate Jellyfin candidates still need manual comparison; the current admin episodes UX still hides the versions flow behind the wrong action
- Next Steps: align with UX on the episode-management layout, replace the play action with edit/version access, then add single-episode sync
- First task tomorrow: inspect `/admin/anime/{id}/episodes`, identify the misplaced play button, and map the exact versions route that the replacement edit action should open

## Mental Unload (2026-03-02 EOD - Final)
- The public anime single-fansub-group refactor is complete: ActiveFansubStory renders one group's history/description, FansubVersionBrowser filters versions client-side by active group
- localStorage now persists the active fansub group per anime, so users keep their context across sessions and tabs
- The "Alle Versionen" option was removed: only one fansub group is active at a time, preventing version-list confusion
- Horizontal scroll for mobile fansub group pills is now working properly with proper touch interaction
- Design review for episode edit routes was completed: no immediate changes needed, routes are clear and functional
- Backend API returns all public versions: frontend filters client-side, so no backend changes were needed
- Build validated successfully: `npm run build` passes without errors
- Tomorrow can focus on handler modularization (extract `SyncEpisodeFromJellyfin`) and UX copy improvements

### Day 2026-03-02
- Phase: Public anime UX refactor + fansub-group filtering
- Accomplishments:
  - Completed design review of episode edit routes (no changes needed)
  - Confirmed backend API returns all public versions (frontend filters client-side)
  - Implemented single active fansub group logic for public anime detail
  - Created ActiveFansubStory component for focused group history/description rendering
  - Refactored FansubVersionBrowser: removed "Alle Versionen", added localStorage sync, horizontal scroll for mobile
  - Added explicit "Keine Versionen" state when active group has no public releases
  - Validated build success: `npm run build` passes
- Key Decisions:
  - Public anime shows exactly one active fansub group at a time
  - localStorage persists active group per-anime for stable user experience
  - Frontend filters versions client-side, no backend API changes needed
  - Primary fansub relation determines initial active group, with fallback to first available
- Risks/Unknowns: `jellyfin_sync.go` still exceeds 150-line limit
- Next Steps: extract `SyncEpisodeFromJellyfin` to separate file, add explicit sync UI copy
- First task tomorrow: identify `SyncEpisodeFromJellyfin` function boundaries in `jellyfin_sync.go` for extraction
