---
phase: 138-effective-rights-administration-impact-ux
plan: 01
subsystem: api
tags: [go, postgres, gin, openapi, typescript, authz, effective-rights]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: role_definitions/role_capabilities/user_group_capability_overrides schema and requirePlatformAdminIdentity/AdminCapabilityHandler authorization pattern
provides:
  - "GET /api/v1/admin/role-holders/:roleCode — group-scoped, override-aware fansub-group role-holder lookup"
  - "AuthzRepository.ListRoleHolders real Postgres query (no N+1)"
  - "listRoleHolders(roleCode) frontend api.ts helper + RoleHolderEntry TS/OpenAPI/Go DTO"
affects: [138-rollen-view, 138-guided-revocation-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [repository-query-mirrors-ListCapabilityMatrix-shape, platform-admin-first-statement-authz]

key-files:
  created:
    - backend/internal/repository/authz_role_holders_repository.go
    - backend/internal/repository/authz_role_holders_repository_test.go
    - backend/internal/handlers/admin_role_holders_handler.go
  modified:
    - backend/internal/handlers/capability_policy_contract.go
    - backend/cmd/server/admin_routes.go
    - backend/cmd/server/main.go
    - backend/internal/testsupport/phase137_postgres.go
    - backend/internal/services/effective_rights_service_test.go
    - shared/contracts/admin-capabilities.yaml
    - frontend/src/types/admin-capability.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "Extended the shared testsupport.OpenPhase137Postgres harness (post-migration-loop, additive/nullable only) to add fansub_group_member_roles and app_users/fansub_groups display columns, instead of building a new Phase-138 harness, per the plan's explicit instruction to reuse it."
  - "Removed the now-redundant ad-hoc fansub_group_member_roles CREATE TABLE from effective_rights_service_test.go after it started colliding with the newly shared table."

patterns-established:
  - "New admin lookup endpoints for role_definitions-scoped data mirror AdminCapabilityHandler: requirePlatformAdminIdentity as the first statement, capabilityAuthzRepo for the check, badRequest/internalError helpers for error shape."

requirements-completed: []

# Metrics
duration: ~25min
completed: 2026-08-23
---

# Phase 138 Plan 01: Role-Holder Lookup Summary

**New GET /api/v1/admin/role-holders/:roleCode endpoint answers "who holds fansub-group role X" with a real, group-scoped, override-aware Postgres query, closing the one gap 138-RESEARCH.md (R-03) identified for D-07.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 completed
- **Files modified/created:** 11 (3 created, 8 modified)

## Accomplishments
- `AuthzRepository.ListRoleHolders` — one non-N+1 join query (`fansub_group_member_roles` → `fansub_group_members` → `fansub_groups` → `app_users`, plus an `EXISTS` subquery against `user_group_capability_overrides`) proven against real Postgres to never leak a different role code and to flip `has_overrides` correctly.
- `AdminRoleHoldersHandler.ListRoleHolders` — platform-admin-gated (`requirePlatformAdminIdentity` as the first statement), rejects unknown/non-fansub-group role codes with 400 before any query runs, closing an enumeration oracle (T-138-02).
- Wired into `admin_routes.go`/`main.go` alongside the existing `/admin/role-capabilities` block.
- Full D-35 contract chain closed: `shared/contracts/admin-capabilities.yaml` `RoleHolderEntry` schema + path, `frontend/src/types/admin-capability.ts` `RoleHolderEntry` interface, `frontend/src/lib/api.ts` `listRoleHolders(roleCode)`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Repository query + Go DTO + handler + route + wiring** - `2764a735` (feat)
2. **Task 2: Contract chain — OpenAPI schema + frontend type + api.ts function** - `de1652bb` (feat)

## Files Created/Modified
- `backend/internal/repository/authz_role_holders_repository.go` - `ListRoleHolders` query + repository-local `RoleHolderEntry`
- `backend/internal/repository/authz_role_holders_repository_test.go` - real-Postgres test (4 subtests: seeded holder, override flip, empty-not-nil, no cross-role leakage)
- `backend/internal/handlers/admin_role_holders_handler.go` - `AdminRoleHoldersHandler.ListRoleHolders` (platform-admin-gated, role-code validated)
- `backend/internal/handlers/capability_policy_contract.go` - handler-side `RoleHolderEntry` DTO
- `backend/cmd/server/admin_routes.go` - registers `GET /admin/role-holders/:roleCode`, adds `adminRoleHoldersHandler` field
- `backend/cmd/server/main.go` - constructs and wires `adminRoleHoldersHandler`
- `backend/internal/testsupport/phase137_postgres.go` - post-migration-loop additive schema (fansub_group_member_roles table + app_users/fansub_groups display columns)
- `backend/internal/services/effective_rights_service_test.go` - removed now-redundant ad-hoc `fansub_group_member_roles` table creation
- `shared/contracts/admin-capabilities.yaml` - `RoleHolderEntry` schema + `GET /api/v1/admin/role-holders/{roleCode}` path
- `frontend/src/types/admin-capability.ts` - `RoleHolderEntry` TS interface
- `frontend/src/lib/api.ts` - `listRoleHolders(roleCode)` helper

## Decisions Made
- Extended `testsupport.OpenPhase137Postgres`'s shared prerequisite SQL rather than creating a new Phase-138-specific test harness, per the plan's explicit instruction, once it became clear the existing harness was missing schema the new query needed.
- Kept the harness extension purely additive/nullable (no `NOT NULL` on the new `app_users`/`fansub_groups` columns) so every pre-existing Phase-137 test's bare `(id, status)`/`(id)` inserts kept working unmodified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] testsupport.OpenPhase137Postgres was missing schema the plan's own test explicitly required**
- **Found during:** Task 1 (writing `authz_role_holders_repository_test.go`)
- **Issue:** The plan's `<read_first>`/interfaces section asserted `testsupport.OpenPhase137Postgres` "already applies the 0085/0100/0108/0112/0146/0150 migration chain this query needs." By inspection, that migration chain never creates `fansub_group_member_roles` (only created by migration 0073, which is not in the chain) and the harness's stand-in `app_users`/`fansub_groups` tables lack `display_name`/`email`/`preferred_username`/`name` columns the query selects. The test as specified could not run at all.
- **Fix:** Extended `createPhase137Prerequisites` with a post-migration-loop SQL block (must run after 0085/0100 seed `role_definitions`, since the new table FKs to it): added `fansub_group_member_roles` (mirroring migration 0073/0106's real production shape, FK'd to `role_definitions(code)`) and nullable `email`/`display_name`/`preferred_username` on `app_users` plus nullable `name` on `fansub_groups`.
- **Files modified:** `backend/internal/testsupport/phase137_postgres.go`
- **Verification:** New `TestListRoleHolders` (4 subtests) passes against real Postgres; re-ran the entire pre-existing Phase-137 repository/services test suite (18 test functions) — all green.
- **Committed in:** `2764a735` (Task 1 commit)

**2. [Rule 1 - Bug] Fixed a table-name collision this session's own change caused**
- **Found during:** Task 1, regression pass across the full Phase-137 suite after fix #1 above
- **Issue:** `backend/internal/services/effective_rights_service_test.go` independently created its own ad-hoc `fansub_group_member_roles` table (documented in-code as a pre-existing workaround for the same harness gap fix #1 just closed). Once the shared harness started providing that table, all 8 tests in that file failed with `relation "fansub_group_member_roles" already exists`.
- **Fix:** Removed the now-redundant local `CREATE TABLE fansub_group_member_roles` block from `openPhase137EffectiveRightsPostgres`, relying on the shared harness table instead; updated the function's doc comment to explain the removal.
- **Files modified:** `backend/internal/services/effective_rights_service_test.go`
- **Verification:** Re-ran `go test ./internal/repository/... ./internal/services/... -run 'Phase137|TestListRoleHolders'` against a fresh `team4s_phase137_test_1` database — all 18 pre-existing tests plus the new `TestListRoleHolders` pass.
- **Committed in:** `2764a735` (Task 1 commit, same commit as fix #1 since both were needed to reach a green Task 1)

**3. [Rule N/A - narrower comment wording] Avoided double-counting acceptance-criteria grep targets**
- **Found during:** Task 1, running the plan's own literal acceptance-criteria greps
- **Issue:** `grep -c "requirePlatformAdminIdentity"` and `grep -c "IsKnownFansubGroupRole"` against `admin_role_holders_handler.go` returned 2 each (once in a doc comment, once in the actual call), failing the plan's `equals 1` criterion.
- **Fix:** Reworded the two doc comments to describe the pattern without repeating the literal identifier string, keeping the code identical.
- **Files modified:** `backend/internal/handlers/admin_role_holders_handler.go`
- **Verification:** Both greps now return exactly 1; `go build ./...` still exits 0.
- **Committed in:** `2764a735` (Task 1 commit)

**4. [Rule 3 - Blocking] Provisioned the missing `TEAM4S_PHASE137_TEST_DSN` test database**
- **Found during:** Task 1, running the plan's verification command
- **Issue:** No `team4s_phase137_test_*` database existed in the running Postgres container and `TEAM4S_PHASE137_TEST_DSN` was unset in both the host shell and the backend container — the plan's own verify command could not run at all without it.
- **Fix:** Created `team4s_phase137_test_1` (`CREATE DATABASE team4s_phase137_test_1 OWNER team4s;`) in the existing `team4sv30-db` container and passed the resulting DSN inline via `docker compose exec -e TEAM4S_PHASE137_TEST_DSN=...` for every verification run. No `.env`/compose file changes made — this is a disposable local test fixture database, consistent with the project's "existing rows are disposable" test-data convention.
- **Files modified:** none (database-only, outside the repo)
- **Verification:** All Phase-137 and new role-holders tests pass against this database.
- **Committed in:** N/A (infrastructure-only, no code change)

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug-caused-by-own-fix, 1 comment-wording adjustment)
**Impact on plan:** All four were necessary to make the plan's own literal acceptance criteria and verification commands actually runnable/passable. No scope creep — no behavior beyond the plan's stated objective was added; the testsupport/services-test changes are test-infrastructure-only and were re-verified not to regress any pre-existing Phase-137 test.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required

None — no external service configuration required. Note: the `team4s_phase137_test_1` Postgres database created during this session's verification is a local, disposable test fixture inside the existing `team4sv30-db` container; it is not part of any migration or `.env` change and does not need to be preserved or reproduced by the user.

## Next Phase Readiness

The role-holder query, handler, route, and full frontend contract chain are ready for later Phase-138 plans (the "Rollen" top-level page, and any role-holder enumeration a guided flow needs) to consume via `listRoleHolders(roleCode)`. No UI consumes this endpoint yet — that is explicitly out of this plan's scope per the objective.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*
