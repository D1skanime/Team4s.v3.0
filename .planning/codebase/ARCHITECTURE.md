# Architecture

## High-Level Shape
- The repo is split into backend API, frontend UI, shared API contracts, database migrations/imports, and operational scripts.
- The backend follows a layered structure:
  - config/bootstrap
  - handlers
  - middleware
  - repositories
  - services
  - models
- The frontend follows a Next.js App Router structure with route segments in `frontend/src/app/`, shared components in `frontend/src/components/`, API helpers in `frontend/src/lib/`, and domain types in `frontend/src/types/`.

## Backend Flow
- Process starts in `backend/cmd/server/main.go`.
- Startup sequence:
  - load env config from `backend/internal/config/config.go`
  - connect Postgres and Redis
  - optionally validate FFmpeg presence
  - instantiate repositories/services/handlers
  - register Gin routes and middleware
- Handler layer under `backend/internal/handlers/` owns HTTP contracts and request/response validation.
- Repository layer under `backend/internal/repository/` owns SQL access and persistence logic.
- Service layer is thinner and currently used for focused workflows like media handling in `backend/internal/services/media_service.go`.
- Middleware under `backend/internal/middleware/` handles auth and comment rate limiting.

## Frontend Flow
- App entry points are route files like:
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/anime/page.tsx`
  - `frontend/src/app/anime/[id]/page.tsx`
  - `frontend/src/app/admin/page.tsx`
- Data fetching is largely centralized in `frontend/src/lib/api.ts`.
- Frontend decides between public and internal API base URLs based on server/browser execution in `frontend/src/lib/api.ts`.
- Domain-specific UI is grouped by concern in `frontend/src/components/`.

## Domain Areas
- Anime catalog and detail
- Comments and watchlist
- Fansubs, groups, aliases, members, collaborations
- Episode playback and release/media streaming
- Admin content management
- Media upload and asset serving

## Data Boundaries
- Database schema changes are append-only SQL migrations under `database/migrations/`.
- Shared contracts under `shared/contracts/` act as a cross-layer reference between backend responses and frontend consumers.
- The repo still contains historical notes and phase docs in top-level markdown and `docs/`, so architectural truth is partially distributed between code and docs.

## Operational Pattern
- Primary dev workflow assumes Docker Compose for integrated services.
- Frontend can also be worked on with local `npm` scripts.
- Smoke tests and import/backfill scripts supplement unit tests for end-to-end confidence.
