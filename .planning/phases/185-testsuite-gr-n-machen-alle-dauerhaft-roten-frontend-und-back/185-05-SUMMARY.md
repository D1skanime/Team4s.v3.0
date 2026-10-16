---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 05
subsystem: testing
tags: [go, httptest, docker-compose, env-config, phase134]

# Dependency graph
requires:
  - phase: 134
    provides: the 9-test Phase-134 verification matrix (phase134_verification_matrix_access_test.go, phase134_verification_matrix_test.go) and its dedicated provisioning script
provides:
  - env-overridable base URLs (TEAM4S_PHASE134_MATRIX_BASE_URL / TEAM4S_PHASE134_MATRIX_KC_BASE) for the Phase-134 matrix with host-IP fallback defaults
  - documented Docker-network-internal override values matching the Compose network container names
affects: [testing, scripts/test-backend.sh containerized runner, any future plan that needs to run the Phase-134 matrix inside a container]

# Tech tracking
tech-stack:
  added: []
  patterns: ["envOrDefault(key, fallback) helper for env-override-with-fallback test configuration (same convention family as backend/internal/testsupport/phase106_postgres.go's os.Getenv-with-skip pattern, but non-fatal/fallback instead of skip since these two URLs always have a safe default)"]

key-files:
  created: []
  modified:
    - backend/internal/repository/phase134_verification_matrix_access_test.go
    - scripts/provision-phase134-matrix-db.sh

key-decisions:
  - "phase134MatrixBaseURL/phase134MatrixKCBase became package-level vars (not const) since Go requires os.Getenv to run at init time, which only var declarations support"
  - "provision-phase134-matrix-db.sh's own MATRIX_HOST_PORT/HEALTH_URL constants stay untouched: that probe runs on the host outside any container, so it is a different trust/network context than the Go test invocations this plan targets"

patterns-established:
  - "envOrDefault(key, fallback string) string: generic env-override-with-safe-default helper for test-only config, distinct from testsupport's os.Getenv-with-t.Skip pattern used for required DSNs"

requirements-completed: [D-03]

# Metrics
duration: 4min
completed: 2026-10-16
---

# Phase 185 Plan 05: Phase-134 Matrix Env-Overridable Base URLs Summary

**Converted the two hard-coded host-IP constants in the 9-test Phase-134 verification matrix to env-overridable vars with safe fallback defaults, and documented the matching Docker-network override in the provisioning script.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-10-16T20:40:00Z (approx, continuation of 185-04)
- **Completed:** 2026-10-16T20:44:00Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `phase134MatrixBaseURL` and `phase134MatrixKCBase` are now `var`s initialized via a new `envOrDefault` helper, reading `TEAM4S_PHASE134_MATRIX_BASE_URL` / `TEAM4S_PHASE134_MATRIX_KC_BASE` with the exact previous host-IP values (`http://192.168.235.196:18093` / `http://192.168.235.196:18081`) as fallback defaults
- `scripts/provision-phase134-matrix-db.sh` now documents the container-internal override values (`http://team4s-phase134-backend:8092`, `http://team4sv30-keycloak:8080`) that a containerized test runner on the `team4s_default` Compose network should set, without touching the script's own host-side `HEALTH_URL` probe

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert the two hard-coded matrix URLs to env-overridable vars** - `3af416bc2` (fix)
2. **Task 2: Expose the matching env-override convention in provision-phase134-matrix-db.sh** - `9981d14f5` (docs)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `backend/internal/repository/phase134_verification_matrix_access_test.go` - `phase134MatrixBaseURL`/`phase134MatrixKCBase` are now vars read via new `envOrDefault` helper; all other constants in the block untouched
- `scripts/provision-phase134-matrix-db.sh` - new header comment documenting the `TEAM4S_PHASE134_MATRIX_BASE_URL`/`TEAM4S_PHASE134_MATRIX_KC_BASE` container-internal override; `MATRIX_HOST_PORT`/`HEALTH_URL` byte-identical to before

## Decisions Made
- Used `var` (not `const`) for the two URLs since `os.Getenv` cannot be evaluated at Go's compile-time constant-expression stage — package-level `var` initializers run at init time and behave identically to `const` at every existing call site in the file and in `phase134_verification_matrix_test.go`.
- Left `provision-phase134-matrix-db.sh`'s own `MATRIX_HOST_PORT`/`HEALTH_URL` constants untouched per the plan's explicit instruction: that health probe runs on the host (outside any container), so D-03b's container-reachability problem does not apply to it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `go build ./...` and `go vet ./internal/repository/...` (and the broader `go vet ./...`) ran clean inside the running `team4sv30-backend` container (the sandbox has no local `go` binary, so verification was run via `docker compose exec team4sv30-backend`). `bash -n scripts/provision-phase134-matrix-db.sh` confirmed script syntax is unchanged/valid.

## User Setup Required

None - no external service configuration required. The new env vars are optional overrides with safe defaults; no `.env` changes needed for existing workflows.

## Next Phase Readiness
- The 9-test Phase-134 matrix can now be pointed at Docker-network-internal addresses by a containerized `go test` invocation (e.g. a future `scripts/test-backend.sh` containerized runner) by setting `TEAM4S_PHASE134_MATRIX_BASE_URL`/`TEAM4S_PHASE134_MATRIX_KC_BASE`, without any further code changes.
- No blockers. This closes D-03b; D-03's broader "keine fest verdrahtete Host-IP mehr" requirement for this matrix is met via env-override-with-fallback rather than a breaking change.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*

## Self-Check: PASSED

All created/modified files exist on disk and both task commit hashes (`3af416bc2`, `9981d14f5`) are present in `git log --oneline --all`.
