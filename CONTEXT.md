# CONTEXT

## Project
- **Name:** Team4s.v3.0
- **Current workflow:** anime v2 schema cutover on a fresh DB/runtime path
- **Current slice:** normalized anime create/read/delete plus public Jellyfin asset rendering on `team4s_v2`

## Current State

### What Finished Recently
- Admin anime create page was reduced from multiple duplicate workflow cards to a simpler functional form.
- Admin anime overview was reduced to one create CTA plus the actual anime list and got a working delete action.
- Delete audit retention was fixed so anime delete audits survive the anime row removal.
- A new fresh DB bootstrap exists under `database/migrations_v2`.
- Backend runtime now points to `team4s_v2` instead of the older local anime DB.
- Live anime create works on v2, including normalized titles/genres plus Jellyfin-backed cover media linkage.
- Public anime list/detail/backdrops now read from v2.
- Public Jellyfin covers render again after frontend media-proxy image handling was corrected.

### What Is Working
- `team4sv30-backend` runs against `team4s_v2`.
- `POST /api/v1/admin/anime` works against v2.
- `GET /api/v1/anime`
- `GET /api/v1/anime/:id`
- `GET /api/v1/anime/:id/backdrops`
- `DELETE /api/v1/admin/anime/:id`
- v2 delete removes normalized anime links and unreferenced cover media assets.
- Public detail pages can display Jellyfin-backed poster/logo/banner again.
- Jellyfin client decoding is tolerant of non-UTF-8 metadata payloads.

### What Is In Progress
- Pulling the remaining anime admin write paths onto v2, especially update/edit.
- Keeping the public/admin surface coherent while legacy compatibility code still exists.
- Replacing legacy flat anime-column assumptions route by route instead of by unsafe big-bang rewrite.

### What Is Still Pending
- `UpdateAnime` / edit save path on v2.
- More admin/public routes that still expect legacy anime columns.
- Later domain slices like episodes/releases/media management beyond the current anime vertical.

## Active Planning Context
- Current focus: `Phase 04 - Provenance, Assets, And Safe Resync`
- Most active sub-slice: `04-03 Asset Provenance And Protected Slot Actions`
- Core rules in force:
  - manual persisted assets remain authoritative
  - provider-owned assets refresh only on explicit apply/resync
  - persisted anime assets beat Jellyfin fallback at runtime
  - background/theme videos stay provider-only

## Key Decisions In Force
- Phase 3 is closed as verified complete.
- Anime image assets are DB-backed, not loose provider URLs.
- `cover`, `banner`, and `backgrounds` belong to the same ownership-aware persistence model.
- `cover_image` remains as a compatibility mirror while the slot model becomes authoritative.
- Background/theme videos are not part of local persistence in this phase.

## Quality Bar
- Do not claim Phase 4 complete until planning files reflect the actually verified slice.
- Runtime precedence must stay deterministic: persisted first, Jellyfin fallback second.
- Migration changes must remain reversible and runnable in Docker.
- Handoff files should point tomorrow-you at the next planning/verification action, not at already-finished cover work.
