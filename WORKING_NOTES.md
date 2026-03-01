# WORKING_NOTES

## Active Threads
- Provider/Jellyfin sync flow needs to become preview-first: search -> preview -> confirm -> sync
- JellySync search is failing silently and needs explicit diagnostics plus candidate folder results
- Episodes overview needs version counts, expandable version details, and visible fansub groups
- Full code/architecture/UX review is needed across the sync and admin surfaces
- Security follow-through: leaked keys must still be rotated even though `.env` was removed from Git history
- Test coverage: 145 new tests added for admin anime step-flow (COMPLETE)

## Required Contracts / UX Notes
- Planned search endpoints: `GET /api/provider/search?animeId=xxx` and `GET /api/jellyfin/search?animeId=xxx`
- Planned sync endpoints: `POST /api/provider/sync` and `POST /api/jellyfin/sync`
- Search button must show loading, disable during request, and surface `Server nicht erreichbar`, `Keine Ordner gefunden`, or `Jellyfin Token ungültig` when applicable
- JellySync failures should return structured JSON such as `{ "success": false, "error": "Jellyfin unreachable", "details": "timeout" }`
- Episodes overview target route stays `/admin/anime/{id}/episodes`, backed by `GET /api/anime/{id}/episodes?includeVersions=true&includeFansubs=true`

## Quick Checks
```bash
go test ./...                    # Backend tests
npm run build                    # Frontend build
docker compose ps                # Container health
curl http://localhost:8092/health
curl "http://localhost:8092/api/v1/genres?query=act&limit=3"
curl "http://localhost:8092/api/provider/search?animeId=<id>"
curl "http://localhost:8092/api/jellyfin/search?animeId=<id>"
```

## Parking Lot
- Add audit logs for sync execution, version edits, and fansub assignments
- Resume handler modularization after the sync and episode-visibility tasks
- Replace `img` usage in new admin routes to clear `@next/next/no-img-element` warnings
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale
- Clean residual %??% placeholder artifacts
- Verify new tests run correctly in CI pipeline

## Mental Unload (2026-03-01 EOD)
- Test coverage milestone COMPLETE: 145 new tests for admin anime step-flow
- Frontend tests cover all five admin routes (selection, edit, episodes, episode edit, versions)
- Backend tests verify validation boundaries and error messages
- New follow-up bundle captured: provider sync reliability, JellySync search diagnostics, and episodes visibility refactor
- Handler modularization and img tag cleanup are still pending, but now sit behind the sync/episodes priority bundle
- System is stable and well-tested, ready for continued refactoring work
- Day closed clean: all tests passing, no uncommitted changes, documentation synchronized

## Auth Contract
- Bearer token with HMAC-SHA256
- Claims: user_id, display_name, exp, sid
- 401 for invalid/expired, 503 for Redis unavailable

## Key Paths
- Contracts: shared/contracts/openapi.yaml
- Backend handlers: backend/internal/handlers/
- Admin anime: frontend/src/app/admin/anime/
- Fansub admin: frontend/src/app/admin/fansubs/
