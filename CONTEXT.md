# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 closeout - admin UX polish
- **Completion:** ~97%

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
- CSS modularization (VersionRow, EpisodeAccordion split)

### In Progress
- Smoke-testing new sync/edit flows
- Frontend tests for Jellyfin feedback states

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit, 400-line CSS module limit
- Sync actions must stay preview-first
- Admin episode rows prioritize edit/version management, not playback

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- German user-facing feedback must be explicit and actionable
