---
phase: 134-fixture-backed-verification-rollout
plan: 03
subsystem: testing

# Dependency graph
requires:
  - phase: 134-01
    provides: scripts/seed-member-profile-fixtures.mjs (Step 11 story-image extension) + scripts/member-profile-fixture.manifest.json (D-02 single source of truth)
  - phase: 134-02
    provides: backend/internal/testsupport/phase134_postgres.go (Plan 134-02's fresh-proof helpers, extended in place by this plan)
provides:
  - "scripts/provision-phase134-matrix-db.sh: idempotent end-to-end provisioning of the full-schema, once-seeded team4s_phase134_test throwaway database plus a temporary backend instance on port 18093"
  - "backend/internal/testsupport/phase134_postgres.go: OpenPhase134MatrixPostgres (fail-closed, exact-match DSN guard for the matrix database)"
  - "backend/internal/repository/phase134_verification_matrix_access_test.go: 5 access-control matrix cases (anonymous, hidden, owner, refresh-only, missing)"
  - "backend/internal/repository/phase134_verification_matrix_test.go: 4 data-correctness/bounds matrix cases (sparse, dense, error, pagination)"
  - "docker-compose.override.yml: ./scripts:/scripts:ro mount on team4sv30-backend, enabling repository-root-relative manifest reads from inside the container"
affects: [134-04, 134-05, 134-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full migration replay (not pg_dump --schema-only) for a throwaway database, so migration-embedded reference-data INSERTs (role_definitions, visibilities, review_statuses) carry over intact"
    - "Ephemeral temporary backend instance (docker compose run --rm -d, isolated REDIS_DB) bound to a throwaway database, seeded once via the SAME real API + seed script the shared rollout DB uses (D-01 fixture-engine parity)"
    - "Identity/authz bootstrap for a genuinely fresh database: verified member_claims linking + the first platform_admin (app_user_global_roles) via direct SQL, scoped strictly to identity/authz plumbing — zero scenario/business fixture data, which stays 100% owned by the seed script"
    - "HTTP-layer verification matrix (net/http against a live temporary backend) rather than repository-level SQL assertions, so the matrix proves the full HTTP contract including auth middleware and JSON envelope shape"

key-files:
  created:
    - scripts/provision-phase134-matrix-db.sh
    - backend/internal/repository/phase134_verification_matrix_access_test.go
    - backend/internal/repository/phase134_verification_matrix_test.go
  modified:
    - backend/internal/testsupport/phase134_postgres.go
    - docker-compose.override.yml

key-decisions:
  - "Added an identity/authz bootstrap step to the provisioning script (Rule 3) that the plan's action text did not anticipate: a genuinely fresh, migration-only database has no member to self-claim and no platform_admin to grant the first platform_admin, whereas the shared team4s_v2 database already had both as pre-existing 'empty shells'. Scoped to direct SQL for member_claims/app_user_global_roles only — all scenario/business data still flows exclusively through the real seed script."
  - "Mounted ./scripts:/scripts:ro into team4sv30-backend (docker-compose.override.yml), mirroring the existing ./database/migrations:/database/migrations:ro pattern, since the container's /app root corresponds to backend/ (not the repo root) and the plan's '../../../scripts/...' manifest path only resolves correctly with this mount in place."
  - "Corrected the malformed-pagination-params test assertion from the plan's assumed 400 to the actual, correct handler behavior (200 with values silently clamped to the documented safe defaults) — parseBoundedProjectPageValue never returns an error status; clamping IS its fail-closed contract."

patterns-established:
  - "Test files in the same Go package that each load the shared JSON manifest independently use distinct type/function name prefixes (phase134MatrixAccessManifest vs phase134MatrixDataManifest) to avoid package-scope collisions, while HTTP/base-URL helpers declared once (access-matrix file) are reused directly by the sibling file without re-declaration."

requirements-completed: [PMQA-04]

# Metrics
duration: ~20min
completed: 2026-08-16
---

# Phase 134 Plan 03: Fixture-Backed Verification Matrix Summary

**Built and ran a 9-case HTTP-layer verification matrix (anonymous, hidden, owner, refresh-only, missing, sparse, dense, error, pagination) against a dedicated, full-migration-replayed, once-seeded throwaway database (team4s_phase134_test), including a new identity/authz bootstrap step the plan didn't anticipate a fresh database would need.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-16T14:18:53Z (approx., per STATE.md handoff)
- **Completed:** 2026-08-16T14:35:12Z
- **Tasks:** 3
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `scripts/provision-phase134-matrix-db.sh` idempotently provisions `team4s_phase134_test` (full 145-migration replay, including migration-embedded reference-data rows), starts a temporary backend instance on port 18093 with an isolated `REDIS_DB`, bootstraps the identity/authz baseline a fresh database lacks, and seeds the fixture once via the real API — verified across two consecutive runs (15/15 seed assertions PASS both times) and one additional re-provision mid-plan (also 15/15 PASS).
- `backend/internal/testsupport/phase134_postgres.go` gained `OpenPhase134MatrixPostgres`, extending Plan 134-02's file with the same fail-closed shape (exact-match DSN, live `current_database()` cross-check).
- All 9 PMQA-04 matrix cases pass together in one run against the freshly re-provisioned database: `go test ./internal/repository/... -run 'TestPhase134Matrix' -v` — 9/9 PASS, 0.5s total.
- The hidden/missing indistinguishability (PMPR-01) and refresh-token acceptance invariants from Phase 128 are explicitly re-proven against real, manifest-declared fixture data, not synthetic inline rows.

## Task Commits

Each task was committed atomically:

1. **Task 1: Provision the full-schema throwaway matrix database and seed it via a temporary backend instance** - `56968baf` (feat)
2. **Task 2: Matrix cases 1-5 — anonymous, hidden, owner, refresh-only, missing (access-control layer)** - `d8e14108` (feat)
3. **Task 3: Matrix cases 6-9 — sparse, dense, error, pagination (data-correctness + bounds layer)** - `672ba041` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `scripts/provision-phase134-matrix-db.sh` - New: idempotent end-to-end provisioning script (create DB, migrate, start temp backend, bootstrap identity/authz, seed via real API)
- `backend/internal/testsupport/phase134_postgres.go` - Added `OpenPhase134MatrixPostgres` (mandatory `TEAM4S_PHASE134_TEST_DSN`, exact-match `team4s_phase134_test` pattern)
- `backend/internal/repository/phase134_verification_matrix_access_test.go` - New: 5 access-control HTTP-layer matrix cases + manifest loader + Keycloak/HTTP helpers
- `backend/internal/repository/phase134_verification_matrix_test.go` - New: 4 data-correctness/bounds HTTP-layer matrix cases
- `docker-compose.override.yml` - Added `./scripts:/scripts:ro` mount on `team4sv30-backend`

## Decisions Made
- **Identity/authz bootstrap added to the provisioning script (Rule 3, blocking issue).** A live run against the freshly migrated `team4s_phase134_test` failed at the seed script's very first admin call (`POST /api/v1/fansubs` → 403 "keine berechtigung") because a genuinely fresh database has no `member_claims` linking either Keycloak account to a member, and no `app_user_global_roles` row granting the first `platform_admin` — both pre-existed as "empty shells" on the shared `team4s_v2` database per CONTEXT.md, so the seed script (correctly) never creates them itself. Traced the exact linking mechanism (`member_claims.claim_status='verified'` joined in `ensureProfileBaseTx`, `app_user_global_roles` checked by `requirePlatformAdminIdentity`) and added a minimal, scoped SQL bootstrap step to the provisioning script: two member rows (`csubs-leader`, `sheppert` public_slugs), two verified `member_claims` rows, and one `platform_admin` role grant. Zero scenario/business fixture data touched — that remains 100% owned by the seed script.
- **`./scripts:/scripts:ro` mount added to `docker-compose.override.yml`.** The plan's manifest-loading path (`"../../../scripts/member-profile-fixture.manifest.json"` from `backend/internal/repository`) assumes `backend/` is nested inside a full repo checkout at test-run time. Inside `team4sv30-backend`'s container, `/app` corresponds only to `backend/` (Dockerfile.dev `COPY . .` with build context `./backend`), not the repo root, so the same relative path resolved to `/scripts/...` (a non-existent top-level path) rather than the intended manifest location. Mirrored the already-established `./database/migrations:/database/migrations:ro` mount (added for the identical reason, per that mount's own comment) rather than inventing a new pattern.
- **Corrected the malformed-pagination-params assertion (Rule 1, test-assertion fix).** The plan's action/acceptance text assumed invalid `limit`/`offset` query params return 400. Reading `parseBoundedProjectPageValue` in `app_public_profile.go` showed it never returns an error status for unparsable or out-of-range input — it silently clamps to the documented safe default/bound (`currentProjectsInitialPageSize=6`, offset `0`) and still returns 200. Verified live (`limit=-1&offset=abc` → 200, `data.limit=6`, `data.offset=0`, `data.total=10`). Asserted the actual, correct, already-shipped fail-closed behavior instead of a permanently-red 400 expectation against working production code — Phase 134 explicitly adds no new product behavior.
- **Docker sync discovery:** `team4sv30-backend`'s Go source is baked into the image at build time (`COPY . .` in `Dockerfile.dev`) and is NOT live-synced from the host without `docker compose watch` actively running (confirmed not running). Used `docker cp` to push each new/modified Go file into the running container before every `go build`/`go test` invocation, and recreated the container once (`docker compose up -d team4sv30-backend`) to pick up the new `docker-compose.override.yml` volume mount. SQL migrations remain live-bind-mounted and needed no such step.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added identity/authz bootstrap to the provisioning script**
- **Found during:** Task 1, first live run of `scripts/provision-phase134-matrix-db.sh`
- **Issue:** The seed script's very first admin API call failed with 403 because the fresh `team4s_phase134_test` database has no verified `member_claims` linking and no `platform_admin` role assignment — both assumed pre-existing by the seed script (they exist on the shared `team4s_v2` DB from long before Phase 129/134 as documented "empty shells", per CONTEXT.md).
- **Fix:** Added a bootstrap step (JIT-provision both app_users via one authenticated request each, then direct SQL: 2 members, 2 verified member_claims, 1 platform_admin grant) before invoking the seed script. Scoped strictly to identity/authz plumbing.
- **Files modified:** `scripts/provision-phase134-matrix-db.sh`
- **Verification:** Two consecutive full provisioning runs, both `RESULT: PASS` (15/15 seed assertions).
- **Committed in:** `56968baf` (Task 1)

**2. [Rule 3 - Blocking] Mounted ./scripts:/scripts:ro into team4sv30-backend**
- **Found during:** Task 2, first `go test` run of the access-matrix file
- **Issue:** `os.ReadFile("../../../scripts/member-profile-fixture.manifest.json")` failed inside the container — `/app` maps to `backend/` only, not the repo root, so the relative path resolved outside any mounted directory.
- **Fix:** Added `./scripts:/scripts:ro` to `team4sv30-backend`'s volumes in `docker-compose.override.yml`, mirroring the existing `./database/migrations:/database/migrations:ro` mount added for the identical reason.
- **Files modified:** `docker-compose.override.yml`
- **Verification:** `go test ./internal/repository/... -run TestPhase134MatrixAnonymous` passed after the container was recreated with the new mount.
- **Committed in:** `d8e14108` (Task 2)

**3. [Rule 1 - Bug] Corrected the malformed-pagination-params expected status**
- **Found during:** Task 3, writing `TestPhase134MatrixErrorMalformedSlugDoesNotPanic`
- **Issue:** The plan's action text asserted 400 for `limit=-1&offset=abc`; the real handler clamps to safe defaults and returns 200 instead — asserting 400 would have been a permanently-red test against correct, already-shipped code.
- **Fix:** Asserted the actual behavior (200, with `data.limit`/`data.offset` verified to equal the clamped safe defaults), documenting why this is still a valid fail-closed proof.
- **Files modified:** `backend/internal/repository/phase134_verification_matrix_test.go`
- **Verification:** Live curl confirmed the 200/clamp behavior before writing the assertion; test passes.
- **Committed in:** `672ba041` (Task 3)

---

**Total deviations:** 3 auto-fixed (2 blocking-issue fixes, 1 test-assertion bug fix)
**Impact on plan:** All three were necessary to make the matrix actually runnable and correct against real system behavior. No scope creep — no production business logic was changed; the two infra fixes (bootstrap, mount) are scoped to test/dev tooling, and the assertion fix aligns the test with already-correct, already-shipped handler behavior.

## Issues Encountered
- Discovered `team4sv30-backend`'s Go source is not live-synced from the host (no `docker compose watch` running); resolved by `docker cp`-ing each new/changed file into the container before every build/test cycle. This affects future Phase 134 plans that add Go test files — see Next Phase Readiness.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 9 PMQA-04 matrix cases pass against a real, once-seeded, full-schema throwaway database that is never `team4s_v2`.
- `scripts/provision-phase134-matrix-db.sh` is reusable as-is for CI/local re-runs; it is idempotent and leaves the temporary backend running at port 18093 for follow-up test runs, per the plan's stated teardown ownership (Plan 134-04).
- **For downstream plans that add backend Go source:** `team4sv30-backend`'s container does not auto-sync host file changes. Either `docker cp` new/changed files into the running container before `go build`/`go test`, or use `docker compose build team4sv30-backend` for a full rebuild, before running any Go verification commands.
- No blockers for Plan 134-04 (green gate) or Plan 134-05 (reset script), both of which can now rely on `team4s_phase134_test` and its provisioning script as a proven pattern.

---
*Phase: 134-fixture-backed-verification-rollout*
*Completed: 2026-08-16*

## Self-Check: PASSED

All 5 created/modified files confirmed on disk; all 3 task commits (`56968baf`, `d8e14108`, `672ba041`) confirmed in `git log`.
