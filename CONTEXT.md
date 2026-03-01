# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 hardening closeout + provider sync reliability + admin episode visibility
- **Completion:** ~95%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Admin Anime IA refactor (selection, edit, episodes, episode edit, versions)
- Playback abuse-control hardening (rate limiting, grant replay protection, audit logging)
- Focused regression test coverage (145 tests)
- Grouped episodes endpoint now supports `includeVersions` and `includeFansubs`
- Jellyfin sync wizard now surfaces explicit loading, empty, success, and error states
- Jellyfin backend failures now return structured `message`, `code`, and `details`
- Local runtime validation confirmed both failure-path handling and live Jellyfin search connectivity

### In Progress
- Real preview/sync validation on representative anime with duplicate-candidate disambiguation
- Frontend episodes overview integration (accordion, version counts, fansub badges)
- Handler modularization (remaining files >150 lines)

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit
- Sync actions must stay preview-first
- `ErrorResponse` may carry optional `code` and `details` for operator diagnostics
- Sync must stop when the active preview yields zero accepted episodes

## Intent & Constraints
- Optimize for operator trust, diagnosability, and safe admin writes
- Keep live provider calls behind the Go API only
- Keep local `.env` untracked; never commit live secrets

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- German user-facing feedback must be explicit and actionable

### Day 2026-03-01
- Phase: Provider sync hardening + episode visibility groundwork
- Accomplishments: structured Jellyfin error handling, live runtime validation, conditional grouped episode reads, episodes overview component scaffolding
- Key Decisions: optional `code/details` in the standard error envelope; hard-stop sync on zero accepted episodes
- Risks/Unknowns: duplicate Jellyfin title matches still need operator-safe disambiguation; episodes overview is not wired yet
- Next Steps: validate preview on a real anime, then integrate the new episodes overview into the admin route
- First task tomorrow: run Jellyfin search + preview on one real anime and compare duplicate candidates before syncing
