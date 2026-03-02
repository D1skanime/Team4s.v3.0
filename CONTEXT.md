# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 closeout - sync validation + public anime UX pass
- **Completion:** ~98%

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

### In Progress
- UX/design review for episode edit and episode-version edit surfaces
- Public anime detail simplification: one active fansub group at a time
- Public episode version visibility should follow the active public fansub group only

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit, 400-line CSS module limit
- Sync actions must stay preview-first
- Admin episode rows prioritize edit/version management, not playback
- Full anime Jellyfin sync remains the bulk season-wide path; single-episode sync is corrective only
- Public anime pages should never show every fansub description/history/version set at once

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- `npm test` must pass for frontend logic changes
- German user-facing feedback must be explicit and actionable
- Public anime detail must keep one clear active fansub context instead of rendering every group simultaneously
