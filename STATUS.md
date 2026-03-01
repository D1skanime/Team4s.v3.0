# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin Anime step flow:
  - `/admin/anime` selection-only browser
  - `/admin/anime/[id]/edit` for general anime context
  - `/admin/anime/[id]/episodes`
  - `/admin/anime/[id]/episodes/[episodeId]/edit`
  - `/admin/anime/[id]/episodes/[episodeId]/versions`
- Anime edit route: sectioned cards, sticky save UX, advanced developer panel, Jellyfin provider sync, genre dropdown working
- Genre suggestion backend path: `GET /api/v1/genres?query=...` returns DB-backed suggestions
- Playback security: IP-based rate limiting, grant token replay protection, audit logging
- Auth lifecycle (issue/refresh/revoke with signed tokens)
- Fansub profiles, version browser, admin CRUD
- Jellyfin sync with path filtering + mismatch guard
- Media proxy (streams, images, video, backdrops, banners)
- Release/episode grant flow for playback

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d
docker compose exec -T team4sv30-backend ./migrate status
curl http://localhost:8092/health
curl "http://localhost:8092/api/v1/genres?query=act&limit=3"
curl http://localhost:3002/admin/anime/25/edit
cd backend && go test ./...
cd ../frontend && npm run build
```

## Next (Top 3)
1. Repair the provider/Jellyfin sync workflow with explicit search, preview, confirmation, and sync stages
2. Fix JellySync folder discovery, diagnostics, and frontend result rendering
3. Refactor the episodes overview to show versions and fansub groups, then run a full backend/frontend/UX review

## Known Risks
- Docker daemon availability can block runtime verification
- Direct stream endpoint usage can fail without fresh grant
- Provider sync currently lacks visible diagnostics and safe preview gating
- Jellyfin folder discovery issues are hard to diagnose without structured error output
- Episode version and fansub context are still too hidden in the current overview flow
