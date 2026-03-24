<!-- GSD:project-start source:PROJECT.md -->
## Project

**Team4s Admin Anime Intake**

Team4s is an existing anime platform with a Go backend, Next.js frontend, and an expanding admin area for managing anime content, media, and release data. The current focus is to improve the admin workflow for creating and editing anime so admins can either enter anime manually or bootstrap them from Jellyfin while keeping manual control over the final stored data.

**Core Value:** Admins can reliably create and maintain correct anime records without losing control to automatic imports.

### Constraints

- **Brownfield**: Existing backend/frontend/admin code must be improved rather than replaced - preserves momentum and working surfaces
- **Compatibility**: Existing Team4s stack, routes, and database evolution model should remain intact - avoids destabilizing adjacent work
- **Data ownership**: Manual edits must remain authoritative over Jellyfin imports - admins need trust and control
- **Workflow**: Jellyfin import must always pass through an editable form before save - prevents opaque automatic record creation
- **Audience**: V1 is admin-only - the workflow can optimize for informed internal operators first
- **Observability**: Admin actions need audit attribution by user ID, while operational errors must be visible immediately in the UI - supports debugging without requiring durable error retention
- **Relations**: V1 relation editing is intentionally limited to four approved labels even though the database can support more - keeps the first admin relation surface understandable
- **Modularity**: Production code files should stay at or below 450 lines; larger implementations must be split before they become monolithic
- **UX quality**: Admin workflow changes should get explicit UX attention, not just backend correctness - the flow must stay understandable for internal operators
- **Scope**: Only cover upload is currently productionized - other anime media upload surfaces need planning and follow-up work
- **Infrastructure**: Jellyfin access depends on `.env` configuration and API connectivity - feature design must account for that operational dependency
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

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
## Environment Surface
- Root `.env.example` and live local `.env` define frontend/backend compose settings.
- Backend config is centralized in `backend/internal/config/config.go`.
- Notable env areas:
## Deployment Shape
- Frontend is exposed on host `3002` and proxies to backend `8092` through environment-aware base URL handling in `frontend/src/lib/api.ts`.
- Backend exposes `/health`, `/api/v1/*`, and static `/media` serving from the configured storage directory.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Backend Conventions
- Config is read once at startup through `backend/internal/config/config.go`.
- Handler construction is explicit and centralized in `backend/cmd/server/main.go`; dependencies are passed manually rather than through a DI container.
- Repositories are split by domain and instantiated with shared DB pool handles.
- Env validation is defensive and mostly fail-fast in `backend/cmd/server/main.go`.
- Feature files are narrow and descriptive, especially in larger areas like `backend/internal/handlers/`.
## Frontend Conventions
- Shared API calls are funneled through `frontend/src/lib/api.ts` instead of scattering raw `fetch` calls across route files.
- Domain types are kept in `frontend/src/types/`.
- Route-specific styling often uses colocated CSS modules such as:
- App Router route handlers are used for file/media proxying under `frontend/src/app/api/`, `frontend/src/app/covers/`, and `frontend/src/app/media/`.
## Code Style Signals
- Go code favors small packages with explicit constructors and plain structs.
- TypeScript code uses path alias `@` configured in `frontend/vitest.config.ts`.
- Naming is descriptive rather than abstract; files map closely to behavior.
- Error handling appears explicit rather than exception-heavy:
## Documentation and Planning Discipline
- The repo keeps substantial working memory in markdown: `CONTEXT.md`, `DECISIONS.md`, `STATUS.md`, `TODO.md`, `RISKS.md`, and day summaries.
- Contracts are tracked alongside code in `shared/contracts/`.
- Operational scripts are named around their direct purpose, for example `smoke-*`, `import-*`, `report-*`, `remediate-*`.
## Observed Tradeoffs
- Some truth is duplicated across code, contracts, and planning docs, which helps onboarding but raises drift risk.
- The backend handler package is large and highly feature-dense, so conventions rely on naming discipline more than strict subpackage isolation.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## High-Level Shape
- The repo is split into backend API, frontend UI, shared API contracts, database migrations/imports, and operational scripts.
- The backend follows a layered structure:
- The frontend follows a Next.js App Router structure with route segments in `frontend/src/app/`, shared components in `frontend/src/components/`, API helpers in `frontend/src/lib/`, and domain types in `frontend/src/types/`.
## Backend Flow
- Process starts in `backend/cmd/server/main.go`.
- Startup sequence:
- Handler layer under `backend/internal/handlers/` owns HTTP contracts and request/response validation.
- Repository layer under `backend/internal/repository/` owns SQL access and persistence logic.
- Service layer is thinner and currently used for focused workflows like media handling in `backend/internal/services/media_service.go`.
- Middleware under `backend/internal/middleware/` handles auth and comment rate limiting.
## Frontend Flow
- App entry points are route files like:
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
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
