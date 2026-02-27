# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin Anime page: episode/version editing, Jellyfin sync matching, group assignment
- Admin Episode-Versionen page: modernized card layout, stronger hierarchy, clearer create/list/edit separation
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
curl http://localhost:3002/admin/anime/25/versions
cd backend && go test ./...
cd ../frontend && npm run build
```

## Next (Top 3)
1. Manual QA + responsive polish for `/admin/anime/[id]/versions`
2. Split `/admin/anime/[id]/versions/page.tsx` into smaller components
3. Playback abuse-control for /api/v1/episodes/:id/play

## Known Risks
- Docker daemon availability can block runtime verification
- Oversized admin route files still slow down frontend iteration
- Direct stream endpoint usage can fail without fresh grant
