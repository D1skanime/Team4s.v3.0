# WORKING_NOTES

## Active Threads
- Security follow-through: leaked keys must still be rotated even though `.env` was removed from Git history
- Handler modularization: remaining oversized files need systematic sweep
- Next.js warnings: img tags need replacement with next/image
- Test coverage: 145 new tests added for admin anime step-flow (COMPLETE)

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
- Add deterministic test for cropper output parity
- Consider pg_trgm index for anime search at scale
- Clean residual %??% placeholder artifacts
- Verify new tests run correctly in CI pipeline

## Mental Unload (2026-03-01 EOD)
- Test coverage milestone COMPLETE: 145 new tests for admin anime step-flow
- Frontend tests cover all five admin routes (selection, edit, episodes, episode edit, versions)
- Backend tests verify validation boundaries and error messages
- Handler modularization and img tag cleanup remain as next priorities
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
