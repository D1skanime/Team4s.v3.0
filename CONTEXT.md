# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 hardening closeout + provider sync reliability + admin episode visibility
- **Completion:** ~93%

## Current State

### Done
- Core v3 baseline (anime, episodes, comments, watchlist, auth)
- Fansub domain (groups, members, aliases, versions, media)
- Provider proxy (Jellyfin/Emby streams, images, video)
- Admin Studio (anime, episodes, fansubs, media upload)
- Security cleanup for leaked env file:
  - `.env` removed from tracked history
  - `.env.example` established as the safe template
- Admin Anime IA refactor:
  - selection route
  - anime edit route
  - episodes overview
  - episode edit
  - episode versions route
- Anime bearbeiten UX refactor:
  - unified header + summary row
  - sectioned cards
  - sticky save bar
  - advanced developer panel
  - Jellyfin sync restored inside provider section
  - Genre dropdown CSS overflow fix
- Genre suggestion backend path available at `/api/v1/genres`
- Playback abuse-control hardening:
  - IP-based rate limiting
  - Grant token replay protection
  - Audit logging for episode playback
- Admin QA pass completed (all routes working, no legacy links)
- RBAC (DB-based roles, bootstrap)
- Handler modularization sweep (major monoliths split)
- Focused regression test coverage for admin anime step-flow (145 tests)

### In Progress
- Repair the provider/Jellyfin search-preview-sync workflow
- Fix JellySync search diagnostics and candidate folder discovery
- Refactor the episodes overview to expose versions and fansub groups
- Continue handler modularization (remaining files >150 lines)

### Blocked
- None

## Key Decisions
- Contract-first API design
- 150-line handler file limit (active rule)
- Tracked local secrets never stay in Git; use `.env.example` and rewrite history if exposure happens
- Route-level task separation is preferred over multi-responsibility admin layouts
- DB-first sync (existing values not overwritten)
- Collaboration groups for multi-group releases
- Backend-owned media lifecycle
- Sync actions must be preview-first; no direct sync without visible search results and explicit confirmation
- Provider/Jellyfin search and sync actions should remain separate endpoints for clearer diagnostics and UX

## Intent and Constraints
- Prioritize v3.0 maintainability and operator clarity over legacy parity cosmetics
- Keep UX refactors structural; avoid accidental business-feature expansion
- Keep editor-facing UI clean and move technical diagnostics into collapsed/developer-only surfaces
- Make provider automation observable: errors, empty states, and preview data must be explicit before mutating anything

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- OpenAPI lint must pass
- German error messages for user-facing responses
- Sync and search endpoints should return structured, operator-readable success/error payloads

### Day 2026-02-27
- Phase: P2 hardening closeout + admin anime IA/UX stabilization
- Accomplishments: fixed genre dropdown CSS overflow clipping, implemented playback abuse-control hardening (IP rate limiting, grant token replay protection, audit logging), completed comprehensive admin QA pass
- Key Decisions: all security measures implemented at handler level, audit logs for playback tracking
- Risks/Unknowns: none identified
- Next Steps: continue handler modularization for remaining oversized files
- First task tomorrow: identify handlers >150 lines and begin modularization sweep

### Day 2026-03-01
- Phase: P2 hardening closeout + provider sync reliability + admin episode visibility
- Accomplishments: added focused regression coverage for admin anime step-flow (97 frontend tests, 48 backend tests), all tests passing; captured the next provider-sync and episodes visibility work bundle for follow-up
- Key Decisions: make sync preview-first and separate search from sync before further provider automation
- Risks/Unknowns: provider sync is too opaque, Jellyfin search diagnostics are weak, and episode version/fansub context is underexposed
- Next Steps: repair the provider/Jellyfin sync workflow, fix JellySync search output, refactor the episodes overview, then run a full code/UX audit
- First task tomorrow: inspect the current Jellyfin/provider search button wiring and endpoint flow
