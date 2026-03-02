# WORKING_NOTES

## Active Threads
- Full Jellyfin sync is confirmed as the bulk path: it upserts every accepted episode/version in the selected season; single-episode sync is only for corrective re-runs
- Public anime detail now needs a focused fansub-group selector so one group stays active at a time
- Public episode versions must follow the active public fansub group only; never render every group's versions together
- Episode edit + episode-version edit need a dedicated UX/design review pass via the `team4s-design` agent
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
- Full sync endpoint remains `POST /api/v1/admin/anime/{id}/jellyfin/sync` and processes all accepted episodes for the selected season/path
- Corrective single-episode sync endpoint remains `POST /api/v1/admin/anime/{id}/episodes/{episodeId}/sync`
- Episodes overview target route stays `/admin/anime/{id}/episodes`, backed by `GET /api/v1/anime/{id}/episodes?includeVersions=true&includeFansubs=true`
- Episode management rows should show path order / sequence and the current stream link
- The primary episode-row action should be edit/version management, not playback
- The episode edit action should land on the existing versions route when version management is the goal
- Public anime detail should keep exactly one active fansub-group context visible at a time
- Switching the active fansub group must swap both the visible history/description and the episode-version list
- Only public versions for the active fansub group should appear in the public episode list

## Quick Checks
```bash
go test ./internal/handlers
npm test
npm run build
docker compose ps
curl http://localhost:8092/health
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
```

## Parking Lot
- Resume handler modularization after the sync and episode-visibility slices are locked
- Add explicit UX copy that distinguishes bulk sync from corrective single-episode sync
- Replace `img` usage in older admin routes to clear `@next/next/no-img-element` warnings
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale

### Day 2026-03-01
- Phase: Sync hardening + episodes overview groundwork
- Accomplishments: structured Jellyfin errors, live local deployment checks, conditional grouped episode reads, new overview components
- Key Decisions: optional `code/details` in error responses; block sync on zero accepted episodes
- Risks/Unknowns: duplicate Jellyfin candidates still need manual comparison; the current admin episodes UX still hides the versions flow behind the wrong action
- Next Steps: align with UX on the episode-management layout, replace the play action with edit/version access, then add single-episode sync
- First task tomorrow: inspect `/admin/anime/{id}/episodes`, identify the misplaced play button, and map the exact versions route that the replacement edit action should open

## Mental Unload (2026-03-02 EOD)
- The route panic was a real runtime issue, not a test-only edge case; Gin requires the nested admin anime route to reuse `:id`
- The local stack now proves the corrective single-episode sync path end-to-end, and the bulk sync path already remains season-wide
- The next real UX risk has shifted to the public anime page: too many fansub contexts are visible at once
- Tomorrow should start with the public anime detail flow and a design pass, not more sync plumbing
- Do not commit local `.env`; keep secrets local and rotate when needed

### Day 2026-03-02
- Phase: Sync validation + public anime UX scoping
- Accomplishments: fixed the backend route conflict, live-smoke-tested single-episode sync, added frontend regression tests for Jellyfin feedback/dialog state
- Key Decisions: keep bulk Jellyfin sync season-wide; treat public anime detail as a single active fansub-group experience
- Risks/Unknowns: random default group selection needs a stable implementation; the public episode list still needs group-scoped filtering
- Next Steps: run the design agent on episode edit/version edit, then rework the public anime page to one active fansub group
- First task tomorrow: inspect `frontend/src/app/anime/[id]/page.tsx` and map where the active fansub-group state should control both history and episode versions
