# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Phase:** Public Group/Release Experience stabilization
- **Milestone:** EPIC 0-6 implemented, hardening and data-completion ongoing
- **Completion:** ~45%

## Current State

### Done (2026-03-06)
- Fixed the public group releases -> episode detail flow so release cards navigate with canonical `episode_id` plus release context.
- Added `episode_id` to public group release payloads while keeping release identity for screenshots and release-scoped sections.
- Repaired release-context screenshot requests so they resolve against the backend API host instead of the frontend origin.
- Removed the broken mock media-assets playback path from the live public release-context route.
- Added the public `GET /api/v1/releases/:releaseId/assets` contract and backend handler.
- Wired the public episode detail page to fetch release assets from the real API instead of local mock data.
- Added Media Assets empty/error handling while keeping empty responses hidden.
- Added screenshot count/thumbnail enrichment plus numeric search support to the group releases feed.
- Rebuilt the local stack and revalidated the live release-context flow against running services.

### Previously Completed (2026-03-03)
- EPIC 0: Group routes, breadcrumbs, group edge navigation
- EPIC 1: Anime detail CTA to group pages
- EPIC 2: Group story page
- EPIC 3: Releases page base feed/filter UX
- EPIC 4: Episode Media Assets section shell
- EPIC 5: Public playback modal + stream proxy
- EPIC 6: Screenshot gallery + lightbox + pagination

### Pending
- EPIC 4/5 still need persisted release-asset data before Media Assets/player can render non-empty public content.
- EPIC 7-10: Comments, additional public APIs, UX polish, permissions groundwork
- EPIC 11-15: Admin group/release curation flows

## Key Decisions
- `/episodes/[id]` remains episode-canonical; `releaseId` stays supplemental context only.
- The public release-assets API ships now as a stable empty contract instead of continuing with mock assets.
- Empty asset responses are acceptable; fake client-side asset data is not.
- Screenshot data remains database-backed, not provider-proxied.

## Quality Bar
- `go test ./...` must pass
- `npm test` must pass
- `npm run build` must pass
- Live route/API smoke checks must pass on the local stack before merge
