---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 04
subsystem: testing
tags: [go, gin, pgx, postgres, testify, testquality, role-catalog, teststil]

requires:
  - phase: 146-01/146-02/146-03
    provides: Block 1 (Registry-Selbstschutz) -- membership-baseline registry hardening and mutation guards this plan's Block 2 work sits on top of
provides:
  - "backend/internal/testquality.SecurityRelevantTestFiles -- the frozen 20-file D-08 definition every later Block-2 plan (146-05..146-12) and Plan 146-13's Criterion-7 ratchet guard consume"
  - "3 of the 20 locked security-relevant files remediated: role_catalog_router_integration_test.go, role_catalog_repository_test.go, role_definitions_context_test.go"
affects: [146-05, 146-06, 146-07, 146-08, 146-09, 146-10, 146-11, 146-12, 146-13]

tech-stack:
  added: []
  patterns:
    - "New backend/internal/testquality package as the canonical home for Phase 146's frozen file lists and (later, Plan 146-13) scanners"
    - "Gin's own duplicate-route panic used as a real, executable proof of \"registered exactly once\" instead of a strings.Count on main.go source"
    - "testsupport.OpenPhase145Postgres + direct role_definitions/role_capabilities/action_definitions seeding to prove repository projections and parameterized queries against a real, migrated schema"

key-files:
  created:
    - backend/internal/testquality/security_relevant_test_files.go
  modified:
    - backend/internal/handlers/role_catalog_router_integration_test.go
    - backend/internal/repository/role_catalog_repository_test.go
    - backend/internal/repository/role_definitions_context_test.go

key-decisions:
  - "Locked the filter rule from RESEARCH.md Open Question 1: 'security-relevant' = the 20-file name+header-keyword match from .planning/notes/2026-09-04-messung-substring-tests.md, with a presence-vs-absence violation rule scoped to test FUNCTIONS, not files"
  - "role_catalog_repository_test.go's real-Postgres proof applies migration 0160 to add role_definitions.reserved, mirroring membership_baseline_registry_test.go's established pattern, since the production query's WHERE clause already filters AND NOT rd.reserved"

patterns-established:
  - "Pattern 1: httptest + real gin.New() router for handler-registration proofs, reusing an existing package-local fake repo (fakePublicRoleCatalog) rather than inventing a new stub"
  - "Pattern 2: real Postgres repository proofs via testsupport.OpenPhase<N>Postgres + direct seed INSERTs, asserting on returned struct fields instead of SQL source text"

requirements-completed: ["Criterion 5", "Criterion 6", "Criterion 7"]

duration: ~40min
completed: 2026-09-04
---

# Phase 146 Plan 04: Testsanierung Start -- Frozen File List and First 3 Remediations Summary

**Locked the 20-file `SecurityRelevantTestFiles` definition (D-08) and replaced 3 of those files' source-substring "false assurance" tests with real httptest/Postgres proofs.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-09-04T15:58Z (approx, per STATE.md `stopped_at`)
- **Completed:** 2026-09-04T16:03Z
- **Tasks:** 3/3 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- Created `backend/internal/testquality/security_relevant_test_files.go` with the frozen, documented `SecurityRelevantTestFiles` var (20 paths) and the presence-vs-absence violation rule stated verbatim, so Plan 146-13's Criterion-7 guard and every remaining wave-3 plan share one canonical definition.
- `role_catalog_router_integration_test.go` now fires a real request through a real `gin.New()` router to prove the public role catalog route needs no `Authorization` header, and proves "registered exactly once" by asserting Gin's own duplicate-route panic instead of `strings.Count`-ing `cmd/server/main.go`.
- `role_catalog_repository_test.go` now seeds `role_definitions`/`role_capabilities`/`action_definitions` rows in a real, migrated Postgres schema and calls `RoleCatalogRepository.ListPublicRoleDefinitions`, asserting the returned `PublicRoleDefinition` fields -- replacing a 9-fragment SQL-text presence loop. The sanctioned forbidden-table absence check (CLAUDE.md exception 1) is preserved unchanged.
- `role_definitions_context_test.go`'s `TestRoleDefinitionsContextQueryIsGeneric` now seeds two `role_definitions` rows and calls `HistGroupMemberRolesRepository.RoleCodeExistsForContext` for matching, mismatched, and unknown `(code, context)` pairs -- proving genericity behaviorally. `TestRoleDefinitionsContextKaraokeFXFollowsSeededContexts` is untouched: it reads a SQL migration, which is itself the object under test (CLAUDE.md exception 2).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the frozen security-relevant file list (D-08 lock)** - `16d6ad4f` (feat)
2. **Task 2: Remediate role_catalog_router_integration_test.go and role_catalog_repository_test.go** - `31a85cb5` (test)
3. **Task 3: Remediate role_definitions_context_test.go's presence violation** - `b245e760` (test)

**Plan metadata:** (this commit, following this SUMMARY)

## Files Created/Modified
- `backend/internal/testquality/security_relevant_test_files.go` - new package; frozen `SecurityRelevantTestFiles []string` (20 paths) with the D-08/D-09 violation-rule doc comment
- `backend/internal/handlers/role_catalog_router_integration_test.go` - real httptest/Gin proof of public reachability + duplicate-registration panic, replacing `os.ReadFile`+`strings.Count` on `main.go`
- `backend/internal/repository/role_catalog_repository_test.go` - real Postgres call to `ListPublicRoleDefinitions`, replacing a 9-fragment presence loop; forbidden-table absence loop kept
- `backend/internal/repository/role_definitions_context_test.go` - real Postgres call to `RoleCodeExistsForContext` for `TestRoleDefinitionsContextQueryIsGeneric`; the migration-reading `TestRoleDefinitionsContextKaraokeFXFollowsSeededContexts` left byte-identical

## Decisions Made
- Adopted the 20-file name+header-keyword filter rule from `.planning/notes/2026-09-04-messung-substring-tests.md` verbatim as the D-08 lock, since it is reproducible via the committed measurement script and cross-checks the roadmap's own 53-file/302-function totals exactly.
- `role_catalog_repository_test.go`'s real-Postgres proof applies migration `0160_membership_baseline_pseudo_role.up.sql` before calling `ListPublicRoleDefinitions`, because the production query's `WHERE` clause already includes `AND NOT rd.reserved` (added by Phase 145) and `role_definitions.reserved` does not exist before that migration -- mirroring the existing `membership_baseline_registry_test.go` real-Postgres pattern rather than hand-rolling a schema stand-in.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `role_catalog_repository_test.go`'s real-Postgres query failed on missing `role_definitions.reserved` column**
- **Found during:** Task 2 (running the rewritten `TestRoleCatalogRepositoryUsesBoundedPresentationProjection` against real Postgres)
- **Issue:** `ListPublicRoleDefinitions`'s SQL includes `AND NOT rd.reserved`, but `testsupport.OpenPhase145Postgres` deliberately stops before migration `0160` (which adds that column), per its own doc comment -- the query failed with `column rd.reserved does not exist`.
- **Fix:** Applied `testsupport.ApplySQLFile(t, pool, phase145MigrationPath(t, "0160_membership_baseline_pseudo_role.up.sql"))` at the top of the test, mirroring the already-established pattern in `membership_baseline_registry_test.go`.
- **Files modified:** `backend/internal/repository/role_catalog_repository_test.go`
- **Verification:** `TestRoleCatalogRepositoryUsesBoundedPresentationProjection` passes against real Postgres (`TEAM4S_PHASE145_TEST_DSN`), no SKIP.
- **Committed in:** `31a85cb5` (Task 2 commit)

**2. [Rule 1 - Bug] Router test's own explanatory comment contained the literal substring `os.ReadFile`, tripping the plan's own acceptance grep**
- **Found during:** Task 2 (verifying `grep -c "os.ReadFile" role_catalog_router_integration_test.go` returns 0)
- **Issue:** A doc comment describing what the rewrite replaced ("former os.ReadFile+strings.Count inspection...") itself contained the literal string being grepped for, so the acceptance check failed even though no code used `os.ReadFile`.
- **Fix:** Reworded the comment to avoid the literal substring while keeping the same explanation.
- **Files modified:** `backend/internal/handlers/role_catalog_router_integration_test.go`
- **Verification:** `grep -c "os.ReadFile" ...` returns 0; tests still pass.
- **Committed in:** `31a85cb5` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - blocking bugs discovered while making the acceptance criteria genuinely pass)
**Impact on plan:** Both fixes necessary for the rewritten tests to actually run green against real Postgres and satisfy the plan's own literal acceptance greps. No scope creep -- no production code was touched, no filter-rule or scope expansion.

## Issues Encountered
None beyond the two auto-fixed items above.

## TDD Gate Compliance

Tasks 2 and 3 carry `tdd="true"`, but this plan's behavior is a **test-quality remediation** of existing, already-correct production code (`RegisterPublicRoleCatalogRoute`, `RoleCatalogRepository.ListPublicRoleDefinitions`, `HistGroupMemberRolesRepository.RoleCodeExistsForContext` all pre-date this plan and were not modified). No new production behavior was added, so there was no RED phase in the literal "write a failing test against not-yet-written code" sense -- the rewritten tests were green against the existing implementation on first correct attempt (after the two Rule-1 fixes above). Each task's commit is tagged `test(...)`, matching the actual nature of the change (assertion-style rewrite, not new feature). This is consistent with the plan's own framing ("test-quality rewrite only... does not expand Criterion 3's locked scope").

## User Setup Required

None - no external service configuration required. Real-Postgres verification used the existing `team4s_phase145_test_146` fixture database (created during Plan 146-01, `TEAM4S_PHASE145_TEST_DSN` pointed at `team4sv30-db:5432` inside the Docker network) -- no new provisioning was needed.

## Next Phase Readiness

- `SecurityRelevantTestFiles` is locked and ready for Plans 146-05 through 146-12 to consume as their shared scope definition, and for Plan 146-13's Criterion-7 ratchet guard to enforce against.
- 3/20 locked files remediated (`role_catalog_router_integration_test.go`, `role_catalog_repository_test.go`, `role_definitions_context_test.go`); 17 remain for the subsequent wave-3 plans.
- No blockers for the remaining Block-2 plans -- the real-Postgres harness pattern (`testsupport.OpenPhase145Postgres` + direct seed INSERTs) and the httptest+fake-repo pattern (reusing package-local fakes like `fakePublicRoleCatalog`) are both proven and reusable.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

All created/modified files found on disk; all 3 task commit hashes (`16d6ad4f`, `31a85cb5`, `b245e760`) found in `git log --oneline --all`.
