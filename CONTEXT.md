# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 closeout - provider sync + admin UX
- **Completion:** ~96%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Admin Anime IA refactor complete
- Playback abuse-control hardening
- Jellyfin sync wizard with structured error handling
- Episodes overview with accordion, version counts, fansub badges
- Jellyfin validation tests (helper functions, mismatch guard)

### In Progress
- Real preview/sync validation on representative anime
- Handler modularization (remaining files >150 lines)

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit
- Sync actions must stay preview-first
- Mismatch guard blocks sync when episode count exceeds bounds

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- German user-facing feedback must be explicit and actionable
