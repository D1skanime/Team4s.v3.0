# WORKING_NOTES

## Current Workflow Phase
- Phase: Stabilization + handoff + automation design
- Focus today: developer environment baseline and media-folder automation feasibility

## Project State
- Done:
  - VS Code settings validated for programming workflow
  - Recommended extension baseline installed
  - Jellyfin/Emby API capability check completed
  - Closeout files updated for restartability
- In Progress:
  - Define and implement one-click folder provisioning for anime/group media assets
- Blocked:
  - Direct folder creation via Jellyfin/Emby REST is not available in documented APIs

## Key Decisions and Context (Today)
- Intent and constraints:
  - Keep folder writes under project-owned logic, not media-server REST assumptions
  - Keep workstation defaults stable for CPU-only host usage
- Design/approach:
  - Add a small idempotent backend/script path for folder creation
  - Trigger library refresh after filesystem writes where needed
- Assumptions:
  - Folder naming rules can be unified now without breaking release tooling (risky)
  - Media path permissions will allow service-side directory creation (risky)
- Quality bar:
  - Idempotent folder creation
  - clear error mapping for "path exists", "permission denied", "invalid chars"
  - auditable logs of requested vs created paths

## Active Threads
- Public release-context episode detail now fetches a real `GET /api/v1/releases/:releaseId/assets` endpoint; current response is intentionally empty until release-asset persistence exists
- Full Jellyfin sync remains bulk-default and single-episode sync remains corrective; keep behavior stable while extending tests
- Jellyfin timeout diagnostics are now centralized in transport logs; next step is timeout simulation coverage + trend review
- Sync/admin hardening review is documented; follow-ups are now focused on rehearsal and observability hygiene
- CI-equivalent regression validation is green after refactor and diagnostics updates
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
curl http://localhost:8092/api/v1/releases/311/assets
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
```

## Parking Lot
- Add persisted release assets so the live public assets route stops returning an empty list
- Capture and retain query-plan snapshots as anime dataset grows post-`pg_trgm`
- Add explicit timeout simulation fixture for Jellyfin admin flows
- Run deployment hardening checklist as a timed rehearsal

### Day 2026-03-06
- Phase: Public release-context stabilization
- Accomplishments:
  - Added live public contract + route for `GET /api/v1/releases/:releaseId/assets`
  - Fixed the new handler/tests and rebuilt the local backend/frontend stack
  - Wired `MediaAssetsSection` to the real API and removed the last dependency on mock release assets
  - Revalidated live:
    - `GET /api/v1/releases/311/assets` -> `200` with empty assets
    - `/episodes/106?releaseId=311&animeId=25&groupId=75`
- Key Decisions:
  - Empty asset responses are acceptable for now; fake client assets are not
  - Keep `/episodes/[id]` episode-canonical and treat `releaseId` as supplemental context only
- Risks/Unknowns:
  - No persisted release-asset data means EPIC 4/5 still look incomplete in real content
- Next Steps:
  - Design and implement the first persisted release-asset slice
  - Add real asset counters back into group releases once storage exists
- First task tomorrow: sketch the storage shape for persisted release assets tied to `release_id`

### Day 2026-03-03
- Phase: P2 closeout completed (hardening + maintainability baseline locked)
- Accomplishments:
  - Migrated remaining frontend `img` usage to `next/image`
  - Clarified sync UI copy (bulk season sync vs corrective single-episode sync)
  - Extracted `SyncEpisodeFromJellyfin` to `jellyfin_episode_sync.go`
  - Completed next modularization split:
    - `jellyfin_sync.go` -> 144 lines
    - `jellyfin_episode_sync.go` -> 114 lines
    - Added focused sync helper files for flow/import/episode lanes
  - Added deterministic crop math utility + Vitest parity tests
  - Added/applied `0017_anime_search_trgm` migration after benchmark pass
  - Added `pg_trgm` query-plan tracking doc + baseline snapshot commands/results
  - Added deployment hardening checklist and Jellyfin timeout diagnostics runbook
  - Added transport-level Jellyfin diagnostics logging (`path`, `elapsed_ms`, `category`)
  - Removed 10 unreferenced broken cover artifacts from `frontend/public/covers`
  - Reran full validation:
    - `go test ./...`
    - `npm test`
    - `npm run build`
    - `scripts/smoke-admin-content.ps1` (25/25)
- Key Decisions:
  - `pg_trgm` is now the chosen scaling path for substring anime search
  - Crop math belongs in testable pure utilities, not inline UI logic
  - Broken public assets are deleted only after DB reference validation
  - Jellyfin timeout diagnostics should be centralized at the shared client transport path
- Risks/Unknowns:
  - Jellyfin upstream timeout behavior remains intermittent and environment-dependent
  - Diagnostics need trend validation under repeated load
- Next Steps:
  - Add timeout simulation test coverage for Jellyfin transport failure paths
  - Run one deployment rehearsal with the hardening checklist
  - Capture weekly query-plan drift snapshots
- First task tomorrow: run a `%nar%` query-plan snapshot and store it as the first weekly baseline check

### Day 2026-03-05
- Phase: Stabilization + operational automation planning
- Accomplishments:
  - Verified VS Code user settings and terminal behavior for programming
  - Installed recommended extension baseline (EditorConfig, Prettier, ESLint, GitLens, Spell Checker, Jupyter, Ruff)
  - Confirmed Jellyfin and Emby REST APIs do not provide a normal endpoint for filesystem folder creation in media roots
  - Completed full day-closeout documentation sweep across handoff files
- Key Decisions:
  - Keep `terminal.integrated.gpuAcceleration` disabled in current CPU-only setup
  - Build project-owned folder provisioning flow instead of relying on media-server REST
- Risks/Unknowns:
  - Folder schema and permissions model are not finalized
  - Implementation path (backend endpoint vs script vs plugin) not finalized
- Next Steps:
  - Decide canonical folder schema for anime/group assets
  - Implement minimal idempotent server-side folder creation action
  - Add post-create library refresh/sync action
- First task tomorrow: define and document the exact folder path template and validation rules in one markdown spec.

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
