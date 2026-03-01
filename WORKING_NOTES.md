# WORKING_NOTES

## Active Threads
- Jellyfin sync lane is now preview-first with explicit step feedback; the next step is validating a real preview on a representative anime
- Duplicate Jellyfin title matches are now the main operator-risk area, not silent failures
- Episodes overview needs to consume the new `includeVersions` / `includeFansubs` backend support and wire in the new accordion component
- Full code/architecture/UX review is still needed once the sync and episodes slices settle
- Security follow-through: `.env` stays local-only and untracked; secret rotation discipline still matters

## Required Contracts / UX Notes
- Current admin search endpoint: `GET /api/v1/admin/jellyfin/series?q=...&limit=...`
- Current admin preview endpoint: `POST /api/v1/admin/anime/{id}/jellyfin/preview`
- Current admin sync endpoint: `POST /api/v1/admin/anime/{id}/jellyfin/sync`
- Standard error shape may now include `error.code` and `error.details`
- Search/preview/sync states must keep surfacing:
  - `server nicht erreichbar`
  - `jellyfin token ungueltig`
  - `jellyfin ist nicht konfiguriert`
  - `keine importierbaren episoden gefunden`
- Episodes overview target route stays `/admin/anime/{id}/episodes`, backed by `GET /api/v1/anime/{id}/episodes?includeVersions=true&includeFansubs=true`

## Quick Checks
```bash
go test ./internal/handlers
npm run build
docker compose ps
curl http://localhost:8092/health
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
```

## Parking Lot
- Add focused frontend tests for Jellyfin feedback states and confirm-dialog behavior
- Resume handler modularization after the sync and episode-visibility slices are locked
- Replace `img` usage in older admin routes to clear `@next/next/no-img-element` warnings
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale

## Mental Unload (2026-03-01 EOD)
- The highest-risk admin workflow is now diagnosable instead of opaque
- Runtime validation covered not-configured, unreachable, and live-connected Jellyfin states
- Live Jellyfin search works; the real remaining question is safe candidate selection when titles collide
- Episodes overview scaffolding exists, but the route integration is the next real product step
- Do not commit local `.env`; keep secrets local and rotate when needed

### Day 2026-03-01
- Phase: Sync hardening + episodes overview groundwork
- Accomplishments: structured Jellyfin errors, live local deployment checks, conditional grouped episode reads, new overview components
- Key Decisions: optional `code/details` in error responses; block sync on zero accepted episodes
- Risks/Unknowns: duplicate Jellyfin candidates still need manual comparison; overview UI is not wired yet
- Next Steps: validate a real preview on one anime, then integrate the overview UI into the admin route
- First task tomorrow: run Jellyfin search for one real anime title and compare preview output across duplicate candidates
