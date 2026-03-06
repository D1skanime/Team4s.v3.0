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
- Sync UI copy now explicitly separates season-wide bulk sync from corrective single-episode sync
- Jellyfin sync handler entrypoints are modularized below target:
  - `backend/internal/handlers/jellyfin_sync.go` (144 lines)
  - `backend/internal/handlers/jellyfin_episode_sync.go` (114 lines)
- Jellyfin transport diagnostics now log failure path + latency + category in the shared client path
- Frontend image rendering uses `next/image` across admin and public surfaces
- Cropper math now has deterministic parity coverage in Vitest
- Anime search has `pg_trgm` migration available (`0017_anime_search_trgm`) for scalable substring queries
- Playback security: IP-based rate limiting, grant token replay protection, audit logging
- Auth lifecycle (issue/refresh/revoke with signed tokens)
- Fansub profiles, version browser, admin CRUD
- Media proxy (streams, images, video, backdrops, banners)
- Release/episode grant flow for playback
- Public release-assets contract is live at `GET /api/v1/releases/:releaseId/assets`; episode detail now consumes the real endpoint and cleanly hides empty asset responses

## How To Verify
```bash
cd Team4s.v3.0
docker compose up -d
docker compose exec -T team4sv30-backend ./migrate status
curl http://localhost:8092/health
curl http://localhost:8092/api/v1/releases/311/assets
curl "http://localhost:8092/api/v1/genres?query=act&limit=3"
curl -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/jellyfin/series?q=Naruto&limit=3"
curl -X POST -H "Authorization: Bearer <admin-token>" "http://localhost:8092/api/v1/admin/anime/25/jellyfin/sync"
curl http://localhost:3002/admin/anime/25/episodes
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-admin-content.ps1 -AuthTokenSecret <auth-token-secret>
cd backend && go test ./...
cd ../frontend && npm test
cd ../frontend && npm run build
```

## Next (Top 3)
1. Add persisted release-asset storage and seed real OP/ED/Kara/Insert data behind `GET /api/v1/releases/:releaseId/assets`
2. Add real asset counters/filter semantics to group releases once release-asset persistence exists
3. Implement EPIC 7 public release notes and contributions flow

## Known Risks
- Jellyfin upstream can intermittently timeout (`server nicht erreichbar`) despite valid configuration
- Timeout diagnostics are now available but still need trend monitoring under load
