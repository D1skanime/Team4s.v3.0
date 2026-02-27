# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Auth lifecycle (issue/refresh/revoke with signed tokens)
- Fansub profiles, version browser, admin CRUD
- Jellyfin sync with path filtering + mismatch guard
- Media proxy (streams, images, video, backdrops, banners)
- Admin Studio with 3-column layout
- Release/episode grant flow for playback

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d
docker compose exec -T team4sv30-backend ./migrate status
curl http://localhost:8092/health
cd backend && go test ./...
cd ../frontend && npm run build
```

## Next (Top 3)
1. Finish handler modularization sweep
2. Playback abuse-control for /api/v1/episodes/:id/play
3. Alias backfill for imported release tags

## Known Risks
- Docker daemon availability can block runtime verification
- Remaining oversized handler files slow down changes
- Direct stream endpoint usage can fail without fresh grant
