# WORKING_NOTES

## Active Threads
- Security follow-through: leaked keys must still be rotated even though `.env` was removed from Git history
- Admin anime step-flow: new routes are in place; next pass is route-by-route responsive QA
- Anime edit workspace: structure is shipped; the genre dropdown still needs one live browser validation
- Playback hardening: grant flow works, abuse controls next
- Handler modularization: remaining oversized files still need a later sweep

## Quick Checks
```bash
go test ./...                    # Backend tests
npm run build                    # Frontend build
docker compose ps                # Container health
curl http://localhost:8092/health
curl "http://localhost:8092/api/v1/genres?query=act&limit=3"
```

## Parking Lot
- Replace `img` usage in new admin routes to clear `@next/next/no-img-element` warnings
- Add focused regression coverage for the new admin anime step-flow
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale
- Clean residual %??% placeholder artifacts

## Mental Unload
- Backend data access for genres now answers correctly; if the UI still looks empty, it is almost certainly a browser-side render or stale-bundle issue, not the DB query.
- The biggest closeout gap is not code generation anymore, it is disciplined live validation of the new admin routes.

## Auth Contract
- Bearer token with HMAC-SHA256
- Claims: user_id, display_name, exp, sid
- 401 for invalid/expired, 503 for Redis unavailable

## Key Paths
- Contracts: shared/contracts/openapi.yaml
- Backend handlers: backend/internal/handlers/
- Admin anime: frontend/src/app/admin/anime/
- Fansub admin: frontend/src/app/admin/fansubs/
