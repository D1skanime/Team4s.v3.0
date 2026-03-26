# Stack

## Overview
- Monorepo-style app with a Go API in `backend/`, a Next.js frontend in `frontend/`, shared OpenAPI contracts in `shared/contracts/`, SQL migrations and import data in `database/`, and local-dev orchestration via `docker-compose.yml`.
- Default local runtime is Docker Compose: Postgres 16, Redis 7, Go backend, and Next.js frontend.

## Backend
- Language/runtime: Go 1.25 in `backend/go.mod`.
- HTTP framework: Gin via `github.com/gin-gonic/gin`.
- Database driver: `github.com/jackc/pgx/v5`.
- Redis client: `github.com/redis/go-redis/v9`.
- Image/media helpers: `github.com/disintegration/imaging`, `github.com/gabriel-vasile/mimetype`, `github.com/google/uuid`.
- Test library: `github.com/stretchr/testify`.
- Build/runtime container defined in `backend/Dockerfile`.

## Frontend
- Framework: Next.js 16 App Router in `frontend/package.json`.
- UI runtime: React 18.3.1 and `react-dom` 18.3.1.
- Language/tooling: TypeScript, ESLint 9, Vitest 3.
- Icon set: `lucide-react`.
- Entry app structure lives in `frontend/src/app/`.

## Data and Contracts
- Primary database migrations: `database/migrations/*.sql`.
- Additional backend-local migration assets exist under `backend/database/migrations/`.
- Shared API contracts are maintained as YAML under `shared/contracts/`, with `shared/contracts/openapi.yaml` as the umbrella contract.

## Local Dev and Build
- Docker orchestration in `docker-compose.yml`.
- Frontend local package install uses `frontend/package-lock.json`.
- Backend binaries are built from `backend/cmd/server` and `backend/cmd/migrate`.
- Frontend scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run start`
  - `npm run lint`
  - `npm run test`

## Environment Surface
- Root `.env.example` and live local `.env` define frontend/backend compose settings.
- Backend config is centralized in `backend/internal/config/config.go`.
- Notable env areas:
  - auth and token TTLs
  - Postgres and Redis connection info
  - Emby/Jellyfin proxy settings
  - media storage/public base URL
  - FFmpeg path for video processing

## Deployment Shape
- Frontend is exposed on host `3002` and proxies to backend `8092` through environment-aware base URL handling in `frontend/src/lib/api.ts`.
- Backend exposes `/health`, `/api/v1/*`, and static `/media` serving from the configured storage directory.
