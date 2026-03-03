# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 closeout completed - hardening + maintainability baseline locked
- **Completion:** ~100% (P2 scope)

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
- Further sync handler modularization completed via focused helper extraction:
  - `jellyfin_sync_flow_helpers.go`
  - `jellyfin_sync_import_helpers.go`
  - `jellyfin_episode_sync_helpers.go`
- `jellyfin_sync.go` now at 144 lines; `jellyfin_episode_sync.go` now at 114 lines
- Deterministic cropper parity coverage added via extracted crop math utility + Vitest tests
- `pg_trgm` anime search migration added (`0017_anime_search_trgm`) and applied in local dev DB
- Residual unreferenced broken cover artifacts removed from `frontend/public/covers`
- Jellyfin timeout diagnostics strengthened:
  - transport-level backend logging in `fetchJellyfinJSON` (`path`, `elapsed_ms`, `category`)
  - operator runbook added (`docs/operations/jellyfin-timeout-diagnostics.md`)
- Sync/admin review completed and documented (`docs/reviews/2026-03-03-sync-admin-hardening-review.md`)
- CI-equivalent and runtime validation rerun:
  - `go test ./...`
  - `npm test`
  - `npm run build`
  - `scripts/smoke-admin-content.ps1` (25/25)

### In Progress
- Post-closeout follow-through: timeout simulation test coverage + deployment rehearsal

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
- Phase: P2 closeout completed - hardening + maintainability baseline locked
- Accomplishments: finished `next/image` migration, clarified sync copy, completed sync handler modularization for active entrypoints, added timeout diagnostics + runbook, added/applied `pg_trgm` migration, removed unreferenced broken cover artifacts, reran full validation + admin smoke checks
- Key Decisions: keep bulk sync as default and corrective sync separate; adopt `pg_trgm` for scalable substring search; keep crop math in deterministic testable utility functions; centralize Jellyfin transport diagnostics in the shared client path
- Risks/Unknowns: intermittent Jellyfin upstream behavior remains environment-dependent; timeout diagnostics need continued observation under load
- Next Steps: add timeout simulation coverage, run deployment rehearsal using the new hardening checklist, and monitor query-plan drift snapshots weekly
- First task tomorrow: run one timeout-simulation test path for Jellyfin and capture the resulting diagnostics log sample in the runbook
