# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 closeout - hardening + maintainability pass
- **Completion:** ~99%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Playback abuse-control hardening
- Jellyfin sync wizard with structured error handling
- Episodes overview with accordion, version counts, fansub badges
- Admin episodes UX overhaul: Edit replaces Play, stream_url visible
- Single-episode sync endpoint + UI with loading/error states
- Season-wide Jellyfin sync confirmed to upsert all accepted episodes and now persist Jellyfin `stream_url` links for synced versions
- Single-episode sync live-smoke-tested against the local runtime (`POST /api/v1/admin/anime/25/episodes/1/sync` -> `200`)
- Real follow-up validation confirmed the admin episodes UI no longer needs manual Jellyfin link entry after sync
- Frontend regression tests now cover Jellyfin feedback mapping and sync-dialog gating rules
- Backend route conflict for nested single-episode sync fixed (`:id` prefix reused to satisfy Gin router rules)
- CSS modularization (VersionRow, EpisodeAccordion split)
- Episode edit and episode-version edit routes UX design review completed
- Public anime detail reworked: one active fansub group at a time with localStorage persistence
- ActiveFansubStory component extracted for single-group history/description rendering
- FansubVersionBrowser refactored: horizontal scroll on mobile, explicit "no versions" state, localStorage-based filter sync
- Backend API confirmed to return all public versions: frontend now filters client-side by active fansub group
- Remaining frontend `img` usage migrated to `next/image` (admin + public routes/components)
- Sync workflow copy clarified in admin UI: season-wide bulk sync vs corrective single-episode sync
- `SyncEpisodeFromJellyfin` extracted to dedicated handler file `jellyfin_episode_sync.go`
- Deterministic cropper parity coverage added via extracted crop math utility + Vitest tests
- `pg_trgm` anime search migration added (`0017_anime_search_trgm`) and applied in local dev DB
- Residual unreferenced broken cover artifacts removed from `frontend/public/covers`

### In Progress
- Continue handler modularization toward the 150-line file rule (`jellyfin_sync.go`, `jellyfin_episode_sync.go`)

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit, 400-line CSS module limit
- Sync actions must stay preview-first
- Admin episode rows prioritize edit/version management, not playback
- Full anime Jellyfin sync remains the bulk season-wide path; single-episode sync is corrective only
- Public anime pages must show exactly one active fansub group at a time: one history/description, one filtered version list
- Active fansub group persists in localStorage per-anime to maintain user context across sessions
- `pg_trgm` indexes are the chosen path for scalable substring anime search (`ILIKE %...%`) once data volume grows

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- `npm test` must pass for frontend logic changes
- German user-facing feedback must be explicit and actionable
- Public anime detail must maintain exactly one active fansub context: single group history, single filtered version list
- Active fansub group state must persist across page reloads using localStorage

## Session History

### Day 2026-03-03
- Phase: P2 closeout - hardening + maintainability pass
- Accomplishments: finished `next/image` migration, clarified sync copy, extracted `SyncEpisodeFromJellyfin`, added crop math utility/tests, added/applied `pg_trgm` migration, removed unreferenced broken cover artifacts
- Key Decisions: keep bulk sync as default and corrective sync separate; adopt `pg_trgm` for scalable substring search; keep crop math in deterministic testable utility functions
- Risks/Unknowns: remaining Jellyfin handler modularization; intermittent Jellyfin timeout behavior; CI parity not yet re-run after all changes
- Next Steps: continue handler decomposition, run CI-equivalent regression pass, add timeout diagnostics for Jellyfin operations
- First task tomorrow: identify and extract the next oversized block in `jellyfin_sync.go` into a focused helper/handler file
