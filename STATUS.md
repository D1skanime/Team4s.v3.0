# STATUS

## What Works Now
- Anime list/detail, episode detail, comments, watchlist
- Admin Anime step flow:
  - `/admin/anime` selection-only browser
  - `/admin/anime/[id]/edit` for general anime context
  - `/admin/anime/[id]/episodes`
  - `/admin/anime/[id]/episodes/[episodeId]/edit`
  - `/admin/anime/[id]/episodes/[episodeId]/versions`
- Anime edit route: sectioned cards, sticky save UX, advanced developer panel, Jellyfin sync, genre dropdown
- Jellyfin sync wizard:
  - explicit search -> preview -> confirm -> sync flow
  - visible loading, empty, success, and error feedback
  - sync guard when preview has zero importable episodes
- Jellyfin admin search now works against the configured live remote instance
- Grouped episodes API supports lightweight reads via `includeVersions` / `includeFansubs`
- Playback security: IP-based rate limiting, grant token replay protection, audit logging
- Auth lifecycle (issue/refresh/revoke with signed tokens)
- Fansub profiles, version browser, admin CRUD
- Media proxy (streams, images, video, backdrops, banners)
- Release/episode grant flow for playback

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d
docker compose exec -T team4sv30-backend ./migrate status
curl http://localhost:8092/health
curl "http://localhost:8092/api/v1/genres?query=act&limit=3"
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
curl http://localhost:3002/admin/anime/1/edit
cd backend && go test ./...
cd ../frontend && npm run build
```

## Next (Top 3)
1. Validate a full real Jellyfin preview on a representative anime and document the correct candidate path before first sync
2. Integrate the new episodes overview accordion into `/admin/anime/{id}/episodes`
3. Add focused UI tests for Jellyfin error, empty, and confirm-state regressions

## Known Risks
- Duplicate Jellyfin title matches can still lead to the wrong candidate being chosen manually
- A successful preview+sync path for a representative anime still needs to be documented
- Episode version and fansub context are still not visible in the admin episodes route until the new component is integrated
