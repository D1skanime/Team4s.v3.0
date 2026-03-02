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
  - explicit search -> preview -> confirm -> sync flow for season-wide imports
  - visible loading, empty, success, and error feedback
  - sync guard when preview has zero importable episodes
  - full sync upserts all accepted episodes and now persists Jellyfin `stream_url` links for synced versions
- Single-episode sync is available for corrective re-syncs and is live-validated against the local stack
- Jellyfin admin search now works against the configured live remote instance
- Grouped episodes API supports lightweight reads via `includeVersions` / `includeFansubs`
- Frontend regression helpers/tests cover Jellyfin error feedback and confirm-dialog gating
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
curl -X POST -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/anime/25/jellyfin/sync"
curl http://localhost:3002/admin/anime/25/episodes
cd backend && go test ./...
cd ../frontend && npm test
cd ../frontend && npm run build
```

## Next (Top 3)
1. Extract `jellyfin_sync.go` handler: move `SyncEpisodeFromJellyfin` to separate file to meet 150-line limit
2. Add explicit UI copy distinguishing bulk Jellyfin sync from corrective single-episode sync
3. Resume full code/architecture/UX review pass across sync and admin surfaces

## Known Risks
- `jellyfin_sync.go` exceeds 150-line handler limit and needs modularization
- No explicit UI copy yet to distinguish bulk sync from corrective single-episode sync
- Some older admin routes still use `img` tags instead of Next.js Image component
