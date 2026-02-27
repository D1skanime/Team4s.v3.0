# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** P2 hardening closeout + admin anime IA/UX stabilization
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
- Genre suggestion backend path available at `/api/v1/genres`
- RBAC (DB-based roles, bootstrap)
- Handler modularization sweep (major monoliths split)

### In Progress
- Live browser validation of the genre dropdown on `/admin/anime/[id]/edit`
- Manual responsive QA across the new admin anime routes
- Playback abuse-control hardening
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

## Intent and Constraints
- Prioritize v3.0 maintainability and operator clarity over legacy parity cosmetics
- Keep UX refactors structural; avoid accidental business-feature expansion
- Keep editor-facing UI clean and move technical diagnostics into collapsed/developer-only surfaces

## Quality Bar
- `go test ./...` must pass
- `npm run build` must pass
- OpenAPI lint must pass
- German error messages for user-facing responses

### Day 2026-02-27
- Phase: P2 hardening closeout + admin anime IA/UX stabilization
- Accomplishments: removed leaked `.env` from history, shipped the admin anime step-flow refactor, rebuilt the anime edit workspace, and rewired genre suggestions to a public DB-backed read endpoint
- Key Decisions: template-only env policy, route-level admin separation, advanced developer controls collapsed out of the main edit form
- Risks/Unknowns: browser-side genre dropdown still needs one live confirmation pass; playback abuse controls remain the main backend hardening gap
- Next Steps: validate the genre field in-browser, run a responsive pass across the new routes, then resume playback hardening
- First task tomorrow: open `/admin/anime/25/edit`, hard refresh, type into the genre field, and inspect the request/response plus dropdown visibility
