# Conventions

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
  - `frontend/src/app/anime/[id]/page.module.css`
  - `frontend/src/app/admin/admin.module.css`
- App Router route handlers are used for file/media proxying under `frontend/src/app/api/`, `frontend/src/app/covers/`, and `frontend/src/app/media/`.

## Code Style Signals
- Go code favors small packages with explicit constructors and plain structs.
- TypeScript code uses path alias `@` configured in `frontend/vitest.config.ts`.
- Naming is descriptive rather than abstract; files map closely to behavior.
- Error handling appears explicit rather than exception-heavy:
  - Go returns/logs typed or formatted errors.
  - Frontend uses an `ApiError` class in `frontend/src/lib/api.ts`.

## Documentation and Planning Discipline
- The repo keeps substantial working memory in markdown: `CONTEXT.md`, `DECISIONS.md`, `STATUS.md`, `TODO.md`, `RISKS.md`, and day summaries.
- Contracts are tracked alongside code in `shared/contracts/`.
- Operational scripts are named around their direct purpose, for example `smoke-*`, `import-*`, `report-*`, `remediate-*`.

## Observed Tradeoffs
- Some truth is duplicated across code, contracts, and planning docs, which helps onboarding but raises drift risk.
- The backend handler package is large and highly feature-dense, so conventions rely on naming discipline more than strict subpackage isolation.
