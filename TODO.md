# TODO

## Immediate (Next Session)
- [ ] Task 1: Repair the Jellyfin / provider sync workflow
  - Frontend search button must show a loading state and stay disabled during the request
  - Frontend must surface explicit errors: `Server nicht erreichbar`, `Keine Ordner gefunden`, `Jellyfin Token ungültig`
  - Backend endpoint split must be explicit: `GET /api/provider/search?animeId=xxx`, `GET /api/jellyfin/search?animeId=xxx`, `POST /api/provider/sync`, `POST /api/jellyfin/sync`
  - Separate search and sync endpoints for provider and Jellyfin
  - Enforce search -> preview -> user confirmation -> sync
  - Add loading, disabled, empty, auth, and unreachable-server states in the frontend
  - Search results must show path, folder ID, and episode count; optional title filtering should be possible
- [ ] Task 2: Repair the JellySync search logic
  - Validate the Jellyfin `/Items?IncludeItemTypes=Series` call
  - Add fallback logging and structured error JSON responses
  - Preserve a response shape like `{ "success": false, "error": "Jellyfin unreachable", "details": "timeout" }`
  - Render candidate folders as cards with title, path, episode count, and `Preview Sync`
- [ ] Task 4 + 5: Refactor the episodes overview and show fansub groups per version
  - Extend `GET /api/anime/{id}/episodes?includeVersions=true&includeFansubs=true`
  - Join episodes, episode versions, version-fansub assignments, and fansub groups
  - Show version counts, expandable version rows, and fansub badges in `/admin/anime/{id}/episodes`
  - Preserve the DTO direction: `EpisodeVersionDTO` should carry nested `FansubGroups []FansubGroupDTO`

## Short Term (This Week)
- [ ] Task 3: Run a full code + architecture + UX review across the sync/admin surfaces
  - Check backend separation for Anime, Episode, EpisodeVersion, and FansubGroup concerns
  - Verify DTO consistency, status codes, structured logging, and sync idempotency
  - Check frontend responsiveness, state handling, loading consistency, and visible error handling
  - Review button styling, preview vs sync clarity, overlap issues, and ensure dangerous actions are visually marked in red
- [ ] Bonus: Add audit logs for sync execution, version edits, and fansub additions
- [ ] Resume handler modularization sweep for files >150 lines
- [ ] Replace remaining `img` tags with `next/image`
- [ ] Verify the 145-test regression suite runs correctly in CI
- [ ] Add integration tests for the complete admin anime workflow
- [ ] Review and rotate any leaked secrets from `.env` exposure

## Medium Term (This Sprint)
- [ ] Complete P2 hardening closeout
- [ ] Add deterministic test for cropper output parity
- [ ] Consider pg_trgm index for anime search at scale
- [ ] Clean residual %??% placeholder artifacts

## Long Term (Future Sprints)
- [ ] Performance optimization pass
- [ ] Documentation review and update
- [ ] Production deployment preparation
- [ ] Monitoring and observability improvements

## On Hold / Parking Lot
- Legacy parity cosmetics (deprioritized in favor of maintainability)
- Advanced search features (waiting for scale requirements)
