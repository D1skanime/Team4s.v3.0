# Testing

## Test Stack
- Backend tests use Go's standard test runner with `testify`; examples include:
  - `backend/cmd/server/main_test.go`
  - `backend/internal/handlers/auth_test.go`
  - `backend/internal/handlers/comment_test.go`
  - `backend/internal/repository/fansub_repository_test.go`
  - `backend/internal/middleware/comment_rate_limit_test.go`
- Frontend tests use Vitest configured in `frontend/vitest.config.ts`.
- Frontend test discovery includes `src/**/*.test.ts` and `src/**/*.test.tsx`.

## Test Layout
- Tests are colocated with implementation files.
- Current test inventory from file scan:
  - 34 Go test files
  - 177 TypeScript test files
- Backend test coverage appears strongest around handlers, repositories, middleware, auth, and migration helpers.
- Frontend has at least some utility-level tests such as `frontend/src/lib/groupNavigation.test.ts`; broader route/component test quality should be re-verified separately because file count alone includes installed dependencies when scanning the full workspace.

## Smoke and Integration Checks
- The project relies heavily on PowerShell smoke scripts for real flow checks:
  - `scripts/smoke-auth-comments-watchlist.ps1`
  - `scripts/smoke-fansubs.ps1`
  - `scripts/smoke-episode-playback.ps1`
  - `scripts/smoke-anime-media.ps1`
  - `scripts/smoke-admin-content.ps1`
- These scripts validate API behavior, auth lifecycle, degraded Redis paths, and media/playback flows against the running stack.

## Verification Culture
- README instructions emphasize `curl`/smoke checks plus Docker runtime validation.
- Build verification is part of the normal loop:
  - frontend `npm run build`
  - backend `go build`
  - compose startup and health checks
- Review artifacts in `docs/reviews/` suggest manual critical review is part of quality control.

## Gaps and Caveats
- `TODO.md` and `RISKS.md` both mention repo-wide frontend lint debt, so lint is not yet a reliable clean gate.
- Some active risks still call for more tests, especially around media upload validation and UI upload workflow.
- A fresh targeted test census excluding `frontend/node_modules` would improve the frontend testing picture.
