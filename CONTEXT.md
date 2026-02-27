# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 hardening closeout + backend handler maintainability
- **Completion:** ~92%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Admin Anime page rebuild (episode/version editing, Jellyfin sync, group assignment)
- Admin Episode-Versionen UI redesign (modern card layout, stronger hierarchy, clearer actions)
- RBAC (DB-based roles, bootstrap)
- Handler modularization sweep (major monoliths split)

### In Progress
- Manual QA and component split for the redesigned Episode-Versionen route
- Continue handler modularization (remaining files >150 lines)
- Playback abuse-control hardening
- Alias coverage for imported release tags

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit (active rule)
- DB-first sync (existing values not overwritten)
- Collaboration groups for multi-group releases
- Backend-owned media lifecycle

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- OpenAPI lint must pass
- German error messages for user-facing responses
