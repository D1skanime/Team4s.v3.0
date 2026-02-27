# WORKING_NOTES

## Active Threads
- Security follow-through: leaked keys must still be rotated even though `.env` was removed from Git history
- Handler modularization: remaining oversized files need systematic sweep
- Regression coverage: new admin routes need automated test coverage
- Next.js warnings: img tags need replacement with next/image

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
- Genre dropdown now fully working (CSS overflow fix applied)
- Playback security hardening complete (IP rate limit, replay protection, audit log)
- Admin QA pass complete, all routes verified working
- Focus shifts to code quality: handler size discipline and test coverage

## Auth Contract
- Bearer token with HMAC-SHA256
- Claims: user_id, display_name, exp, sid
- 401 for invalid/expired, 503 for Redis unavailable

## Key Paths
- Contracts: shared/contracts/openapi.yaml
- Backend handlers: backend/internal/handlers/
- Admin anime: frontend/src/app/admin/anime/
- Fansub admin: frontend/src/app/admin/fansubs/
