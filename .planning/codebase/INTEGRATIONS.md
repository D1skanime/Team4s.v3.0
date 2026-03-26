# Integrations

## Core Services
- PostgreSQL 16 via `docker-compose.yml` service `team4sv30-db`.
- Redis 7 via `docker-compose.yml` service `team4sv30-redis`.
- Backend database bootstrap uses `backend/internal/database/postgres.go`.
- Redis initialization uses `backend/internal/database/redis.go`.

## Media and Streaming Providers
- Emby integration is configured through env vars consumed in `backend/internal/config/config.go` and wired in `backend/cmd/server/main.go`.
- Jellyfin integration is configured the same way and used by handlers in:
  - `backend/internal/handlers/jellyfin_client.go`
  - `backend/internal/handlers/jellyfin_sync.go`
  - `backend/internal/handlers/group_assets_jellyfin.go`
  - `backend/internal/handlers/jellyfin_search.go`
- Episode/release playback and stream grant logic are wired in:
  - `backend/internal/handlers/episode_playback_handler.go`
  - `backend/internal/handlers/release_assets_handler.go`
  - `backend/internal/auth/release_grant.go`

## Auth and Session Flow
- Signed token issue/refresh/revoke endpoints are exposed from `backend/cmd/server/main.go`.
- Auth persistence and revocation state use Redis through `backend/internal/repository/auth.go`.
- Frontend token/cookie handling is centralized in `frontend/src/lib/api.ts`.
- Dev-only auth issue fallback is gated by `AUTH_ISSUE_DEV_MODE` and related env vars in `backend/internal/config/config.go`.

## File and Media Storage
- Backend serves uploaded media from the configured filesystem directory using `router.Static("/media", cfg.MediaStorageDir)` in `backend/cmd/server/main.go`.
- Media upload pipeline uses:
  - `backend/internal/handlers/media_upload.go`
  - `backend/internal/repository/media_upload.go`
  - `backend/internal/services/media_service.go`
- Frontend media passthrough routes exist at:
  - `frontend/src/app/media/[...path]/route.ts`
  - `frontend/src/app/covers/[file]/route.ts`

## Contracts and Internal Consumers
- OpenAPI source of truth is `shared/contracts/openapi.yaml`.
- Feature-specific contracts are split into files like:
  - `shared/contracts/auth.yaml`
  - `shared/contracts/comments.yaml`
  - `shared/contracts/fansubs.yaml`
  - `shared/contracts/admin-content.yaml`
- Frontend types and API bindings mirror these contracts from:
  - `frontend/src/types/*.ts`
  - `frontend/src/lib/api.ts`

## Tooling and Ops Integrations
- Smoke-test scripts for core flows live in `scripts/`, for example:
  - `scripts/smoke-auth-comments-watchlist.ps1`
  - `scripts/smoke-fansubs.ps1`
  - `scripts/smoke-episode-playback.ps1`
  - `scripts/smoke-anime-media.ps1`
- Redis observability alerting helper is `scripts/redis-observability-alerts.ps1`.
- FFmpeg is an external runtime dependency checked at startup in `backend/cmd/server/main.go`.
