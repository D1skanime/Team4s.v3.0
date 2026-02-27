# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin Anime step flow:
  - `/admin/anime` selection-only browser
  - `/admin/anime/[id]/edit` for general anime context
  - `/admin/anime/[id]/episodes`
  - `/admin/anime/[id]/episodes/[episodeId]/edit`
  - `/admin/anime/[id]/episodes/[episodeId]/versions`
- Anime edit route: sectioned cards, sticky save UX, advanced developer panel, Jellyfin provider sync
- Genre suggestion backend path: `GET /api/v1/genres?query=...` returns DB-backed suggestions
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
1. Live browser validation and final fix for the genre dropdown on `/admin/anime/[id]/edit`
2. Responsive/manual QA across the new admin anime step-flow routes and cleanup of remaining legacy links
3. Playback abuse-control for `/api/v1/episodes/:id/play`

## Known Risks
- Docker daemon availability can block runtime verification
- The genre API now returns data, but the browser dropdown may still fail to render until the final client-side validation is done
- New admin routes shipped quickly and still have limited focused regression coverage
- Direct stream endpoint usage can fail without fresh grant
