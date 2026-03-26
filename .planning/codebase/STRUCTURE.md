# Structure

## Top-Level Layout
- `backend/` - Go API, repositories, handlers, middleware, services, backend-local docs and migration helpers.
- `frontend/` - Next.js App Router app, components, styles, TS types, package metadata.
- `shared/contracts/` - OpenAPI and feature-level YAML contracts.
- `database/` - SQL migrations and legacy/import TSV data.
- `scripts/` - PowerShell and Python helpers for smoke tests, imports, alerts, remediation.
- `docs/` - architecture, operations, performance, and review artifacts.
- `.planning/` - planning outputs; now also contains `codebase/`.

## Backend Layout
- `backend/cmd/server/main.go` - API bootstrap and route wiring.
- `backend/cmd/migrate/main.go` - migration runner entrypoint.
- `backend/cmd/migrate-covers/` - cover migration utility.
- `backend/internal/config/` - env config parsing.
- `backend/internal/database/` - Postgres and Redis connection setup.
- `backend/internal/handlers/` - HTTP endpoints and request validation.
- `backend/internal/middleware/` - auth and limiter middleware.
- `backend/internal/models/` - domain DTOs and structs.
- `backend/internal/repository/` - persistence and query logic.
- `backend/internal/services/` - focused domain services.
- `backend/internal/migrations/` - migration test helpers and runner support.

## Frontend Layout
- `frontend/src/app/` - route segments and route handlers.
- `frontend/src/components/` - reusable UI grouped by domain (`admin`, `anime`, `comments`, `episodes`, `fansubs`, `groups`, `navigation`, `watchlist`).
- `frontend/src/lib/` - API client, helpers, and server-aware URL logic.
- `frontend/src/styles/` - global CSS.
- `frontend/src/types/` - typed payload/domain interfaces.
- `frontend/public/` - static images and legacy/public media assets.

## Naming Patterns
- Backend files are strongly feature-oriented: `anime.go`, `auth_handler.go`, `episode_playback_rate_limit.go`, `fansub_merge.go`.
- Frontend route naming follows App Router conventions with dynamic segments like `[id]`, `[slug]`, `[versionId]`, and catch-all `[...path]`.
- Tests are colocated with code:
  - Go: `*_test.go`
  - Frontend: `*.test.ts` and `*.test.tsx`

## Planning and Operational Artifacts
- Top-level files like `STATUS.md`, `TODO.md`, `RISKS.md`, `DAYLOG.md`, and `WORKING_NOTES.md` are active project memory, not just archival docs.
- Review snapshots live in `docs/reviews/`.
- Architecture handoff/spec docs live in `docs/architecture/`.
