# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 hardening closeout + provider sync reliability + admin episode visibility
- **Completion:** ~94%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Admin Anime IA refactor (selection, edit, episodes, episode edit, versions)
- Playback abuse-control hardening (rate limiting, grant replay protection, audit logging)
- Focused regression test coverage (145 tests)
- **Episodes endpoint Query-Params** (`includeVersions`, `includeFansubs`) for conditional joins
- **JellyfinSyncPanel UI** improvements (styles, component refactor)

### In Progress
- Frontend Episodes Overview with Accordion/Fansub-Badges (backend ready)
- Provider/Jellyfin structured error responses
- Handler modularization (remaining files >150 lines)

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit
- Sync actions must be preview-first
- Episodes endpoint returns all data by default (backward compatible)

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- German error messages for user-facing responses
