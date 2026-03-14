# Team4s.v3.0

Modernized Team4s stack with Go backend, Next.js frontend, PostgreSQL, and Redis.

## Start

```bash
docker compose up -d
```

Services:
- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:8092`
- Postgres: `localhost:5433` (override via `POSTGRES_PORT`)
- Redis: internal compose service (`team4sv30-redis:6379`)

Optional local auth token for comments/watchlist UI:
- Set `AUTH_TOKEN_SECRET` in your shell or `.env` before `docker compose up -d`.
- Runtime profile guard for auth issue fallback:
  - `RUNTIME_PROFILE` (default: `local`)
  - `AUTH_ISSUE_DEV_MODE` is allowed only for local/dev/test profiles; startup fails for non-dev profiles.
  - Frontend consumes `NEXT_PUBLIC_RUNTIME_PROFILE` and `NEXT_PUBLIC_AUTH_ISSUE_DEV_MODE` to show only allowed `/auth` issue flows.
- Admin content-management authorization:
  - Admin write endpoints require a valid bearer token.
  - Authorization source is DB roles (`user_roles` + `roles`) with role name `AUTH_ADMIN_ROLE_NAME` (default `admin`).
  - Optional startup bootstrap for local/dev:
    - `AUTH_ADMIN_BOOTSTRAP_USER_IDS` assigns the admin role during server startup (for example `1,2`).
  - Override role name via `AUTH_ADMIN_ROLE_NAME` (default: `admin`).
- Optional token TTL overrides:
  - `AUTH_ACCESS_TOKEN_TTL_SECONDS` (default: `900`)
  - `AUTH_REFRESH_TOKEN_TTL_SECONDS` (default: `604800`)
- Optional Emby playback proxy:
  - `EMBY_API_KEY` (required for `/api/v1/episodes/:id/play`)
  - `EMBY_ALLOWED_ANIME_IDS` (optional allowlist, e.g. `22`)
  - `EMBY_STREAM_BASE_URL` (optional override, defaults to host of stored episode stream link)
  - `EMBY_STREAM_PATH_TEMPLATE` (default: `/Videos/%s/stream`)
  - `EPISODE_PLAYBACK_RATE_LIMIT` (default: `30`, requests per window per user principal and action)
  - `EPISODE_PLAYBACK_RATE_WINDOW_SECONDS` (default: `60`)
  - `EPISODE_PLAYBACK_MAX_CONCURRENT_STREAMS` (default: `12`)
- Optional provider proxy settings for fansub release/image endpoints:
  - `JELLYFIN_API_KEY` (required for provider `jellyfin` on `/api/v1/releases/:id/stream` and `/api/v1/media/image`)
  - `JELLYFIN_BASE_URL` (for example `http://192.168.235.100:8098`)
  - `JELLYFIN_STREAM_PATH_TEMPLATE` (default: `/Videos/%s/stream`)
  - `RELEASE_STREAM_GRANT_SECRET` (optional; defaults to `AUTH_TOKEN_SECRET`)
  - `RELEASE_STREAM_GRANT_TTL_SECONDS` (default: `120`)
- Optional trusted dev fallback for `POST /api/v1/auth/issue`:
  - `AUTH_ISSUE_DEV_MODE` (default: `false`)
  - `AUTH_ISSUE_DEV_USER_ID` (default: `1`)
  - `AUTH_ISSUE_DEV_DISPLAY_NAME` (default: `Nico`)
  - `AUTH_ISSUE_DEV_KEY` (optional, requires header `X-Auth-Issue-Key`)
- You can now issue/refresh/revoke tokens via API (`/api/v1/auth/*`) or UI (`/auth` page).
- Legacy static frontend token mode still works with `NEXT_PUBLIC_AUTH_TOKEN` and optional `NEXT_PUBLIC_AUTH_DISPLAY_NAME`.
- If you change `NEXT_PUBLIC_*` values, rebuild frontend image:
  - `docker compose up -d --build frontend`
- Optional Redis overrides for backend limiter:
  - `REDIS_ADDR` (default in Docker: `team4sv30-redis:6379`)
  - `REDIS_DB` (default: `0`)
- Token format is signed payload with claims:
  - `user_id` (int64, required)
  - `display_name` (string, required)
  - `exp` (unix timestamp seconds, required)

Generate a local dev token (PowerShell):

```powershell
$env:AUTH_TOKEN_SECRET='team4s-local-dev-secret'
$payload = @{ user_id = 1; display_name = 'Nico'; exp = [DateTimeOffset]::UtcNow.AddDays(7).ToUnixTimeSeconds() } | ConvertTo-Json -Compress
$payloadB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($payload)).TrimEnd('=').Replace('+','-').Replace('/','_')
$sigBytes = [Text.Encoding]::UTF8.GetBytes($env:AUTH_TOKEN_SECRET)
$hmac = [System.Security.Cryptography.HMACSHA256]::new($sigBytes)
$signature = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($payloadB64))
$sigB64 = [Convert]::ToBase64String($signature).TrimEnd('=').Replace('+','-').Replace('/','_')
$env:NEXT_PUBLIC_AUTH_TOKEN = "$payloadB64.$sigB64"
$env:NEXT_PUBLIC_AUTH_DISPLAY_NAME = 'Nico'
```

## Health Check

```bash
curl http://localhost:8092/health
curl "http://localhost:8092/api/v1/anime?page=1&per_page=24"
curl "http://localhost:8092/api/v1/anime/1"
curl "http://localhost:8092/api/v1/episodes/1"
curl -X POST "http://localhost:8092/api/v1/episodes/75/play/grant" -H "Authorization: Bearer <access-token>"
curl -X POST "http://localhost:8092/api/v1/releases/1/grant" -H "Authorization: Bearer <access-token>"
curl -I "http://localhost:8092/api/v1/episodes/75/play?grant=<stream-grant-token>"
```

## Targeted Smoke Checks

Run focused integration smoke checks for hardened paths (auth lifecycle, watchlist CRUD, comments throttling, comments degraded header):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-auth-comments-watchlist.ps1
```

Run focused fansub/versioning smoke checks (fansub CRUD, members, anime relation, episode versions, release stream auth):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-fansubs.ps1
```

Run focused episode playback smoke checks (grant issue + stream via grant/bearer):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-episode-playback.ps1
```

Run focused anime media smoke checks (theme video proxy + backdrop proxy + logo presence):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-anime-media.ps1
```

Backfill legacy anime descriptions + fansub groups/histories + anime-fansub links:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\import-legacy-fansubs.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\import-legacy-fansubs.ps1 -Apply
```

Options:
- `-ApiBaseUrl` override API base URL (default: `http://localhost:8092`)
- `-AuthTokenSecret` provide auth secret directly (otherwise reads container/env value)
- `-CommentLimit` expected limiter threshold per window (default: `5`)
- `-SkipDegradedMode` skip the Redis key poisoning degraded-mode check

## Degraded Observability Signals

Backend emits structured log signals for Redis degraded/unavailable paths:
- `event=redis_auth_state_unavailable` with `component=comment_auth|auth_issue`, `check=...`, and running `total=<n>`
- `event=redis_comment_rate_limit_degraded` with `component=comment_rate_limit` and running `total=<n>`

Example:

```bash
docker compose logs backend | grep redis_auth_state_unavailable
docker compose logs backend | grep redis_comment_rate_limit_degraded
```

Alert threshold check (non-zero exit on warn):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\redis-observability-alerts.ps1
```

Default thresholds (5-minute window):
- `redis_auth_state_unavailable >= 1` -> WARN
- `redis_comment_rate_limit_degraded >= 3` -> WARN

Options:
- `-WindowMinutes 10`
- `-AuthStateUnavailableWarnThreshold 2`
- `-CommentRateLimitDegradedWarnThreshold 5`
- `-NoFailOnWarn` (prints WARN but exits `0`)

## API Contract

- Source of truth OpenAPI baseline: `shared/contracts/openapi.yaml`
- Feature-level contracts:
  - `shared/contracts/anime-list.yaml`
  - `shared/contracts/anime-detail.yaml`
  - `shared/contracts/episodes.yaml`
  - `shared/contracts/comments.yaml`
  - `shared/contracts/watchlist.yaml`
  - `shared/contracts/auth.yaml`
  - `shared/contracts/admin-content.yaml`

## Auth Lifecycle

Endpoints:
- `POST /api/v1/auth/issue`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/revoke`

Example:

```bash
# Preferred: trusted bearer identity
curl -X POST "http://localhost:8092/api/v1/auth/issue" \
  -H "Authorization: Bearer <signed-access-token>"

# Optional local dev fallback (only when AUTH_ISSUE_DEV_MODE=true)
curl -X POST "http://localhost:8092/api/v1/auth/issue" \
  -H "X-Auth-Issue-Key: <AUTH_ISSUE_DEV_KEY>"
```

## Admin Content Management (P2 Baseline)

Backend endpoints:
- `POST /api/v1/admin/anime`
- `PATCH /api/v1/admin/anime/:id`
- `POST /api/v1/admin/episodes`
- `PATCH /api/v1/admin/episodes/:id`

Frontend pages:
- `/admin`
- `/admin/anime`
- `/admin/episodes`

Notes:
- Endpoints require valid bearer token identity.
- Additional admin gate uses DB roles (`roles` + `user_roles`) via `AUTH_ADMIN_ROLE_NAME`.
- Non-admin requests return `403` with `keine berechtigung`.

## Database Migrations

Migration files are in `database/migrations`.

Current baseline:
- `0001_init_anime.up.sql`
- `0001_init_anime.down.sql`
- `0002_init_episodes.up.sql`
- `0002_init_episodes.down.sql`
- `0003_expand_anime_columns.up.sql`
- `0003_expand_anime_columns.down.sql`
- `0004_init_comments.up.sql`
- `0004_init_comments.down.sql`
- `0005_init_watchlist.up.sql`
- `0005_init_watchlist.down.sql`
- `0006_watchlist_user_id.up.sql`
- `0006_watchlist_user_id.down.sql`
- `0007_watchlist_cleanup.up.sql`
- `0007_watchlist_cleanup.down.sql`
- `0008_expand_anime_episode_columns.up.sql`
- `0008_expand_anime_episode_columns.down.sql`
- `0009_fansub_groups.up.sql`
- `0009_fansub_groups.down.sql`
- `0010_fansub_members.up.sql`
- `0010_fansub_members.down.sql`
- `0011_anime_fansub_groups.up.sql`
- `0011_anime_fansub_groups.down.sql`
- `0012_episode_versions.up.sql`
- `0012_episode_versions.down.sql`
- `0013_init_roles.up.sql`
- `0013_init_roles.down.sql`
- `0014_fansub_group_aliases.up.sql`
- `0014_fansub_group_aliases.down.sql`

Migration runner command:

```bash
cd backend
export DATABASE_URL="postgres://team4s:team4s_dev_password@localhost:5433/team4s_v2dump?sslmode=disable"
go run ./cmd/migrate status
go run ./cmd/migrate up
go run ./cmd/migrate down -steps 1
go run ./cmd/migrate backfill-phase-a-metadata
```

PowerShell:

```powershell
cd backend
$env:DATABASE_URL='postgres://team4s:team4s_dev_password@localhost:5433/team4s_v2dump?sslmode=disable'
go run ./cmd/migrate status
go run ./cmd/migrate up
go run ./cmd/migrate down -steps 1
go run ./cmd/migrate backfill-phase-a-metadata
```

Notes:
- `up` applies all pending migrations and records them in `schema_migrations`.
- `down` rolls back the most recent migration by default (`-steps` controls count).
- `backfill-phase-a-metadata` populates normalized anime titles and genres from the legacy anime columns.
- If needed, pass a custom directory: `-dir ../database/migrations`.

### Database Migrations (Docker)

```bash
docker compose exec team4sv30-backend ./migrate status
docker compose exec team4sv30-backend ./migrate up
docker compose exec team4sv30-backend ./migrate down -steps 1
```


