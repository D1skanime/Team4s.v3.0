# WORKING_NOTES

## Active Threads
- Handler modularization: fansub_validation.go done, continue with fansub_admin.go
- Playback hardening: grant flow works, abuse controls next
- Alias coverage: B-SH needs mapping for anime 25

## Quick Checks
```bash
go test ./...                    # Backend tests
npm run build                    # Frontend build
docker compose ps                # Container health
curl http://localhost:8092/health
```

## Parking Lot
- Add UI regression tests for admin anime workflow
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale
- Clean residual %??% placeholder artifacts

## Auth Contract
- Bearer token with HMAC-SHA256
- Claims: user_id, display_name, exp, sid
- 401 for invalid/expired, 503 for Redis unavailable

## Key Paths
- Contracts: shared/contracts/openapi.yaml
- Backend handlers: backend/internal/handlers/
- Admin anime: frontend/src/app/admin/anime/
- Fansub admin: frontend/src/app/admin/fansubs/
