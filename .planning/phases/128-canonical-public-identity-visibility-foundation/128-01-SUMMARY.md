---
phase: 128-canonical-public-identity-visibility-foundation
plan: 01
subsystem: backend-testing
tags: [postgresql, migrations, public-identity, slugs, tdd]
requires: []
provides:
  - Fail-closed Phase-128 PostgreSQL test fixture
  - Executable RED contract for stored immutable member slugs
  - Executable RED contract for deterministic slug allocation across all member creation seams
affects: [128-04, 128-05, 128-VALIDATION]
tech-stack:
  added: []
  patterns:
    - Explicit guarded test DSN with database and schema allow-lists
    - Source-inspection RED contracts that compile before production symbols exist
key-files:
  created:
    - backend/internal/testsupport/phase128_postgres.go
    - backend/internal/testsupport/phase128_postgres_test.go
    - backend/internal/migrations/phase128_public_identity_test.go
    - backend/internal/repository/member_public_slug_test.go
  modified: []
key-decisions:
  - "Phase-128 PostgreSQL tests require TEAM4S_PHASE128_TEST_DSN and never fall back to DATABASE_URL."
  - "Wave-0 migration and repository gates fail only their named missing-contract assertions while future live behavior tests remain compilable."
  - "All member INSERT seams are inventoried independently so repository drift is detected before the allocator exists."
metrics:
  duration: 29m
  completed: 2026-08-13
---

# Phase 128 Plan 01: Canonical Public Identity Test Foundation Summary

**A fail-closed PostgreSQL fixture plus narrowly constrained RED migration and repository contracts now protect immutable stored member slugs and deterministic readable allocation.**

## Performance

- **Duration:** 29m
- **Started:** 2026-08-13T11:46:37Z
- **Completed:** 2026-08-13T12:15:51Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments

- Added a dedicated Phase-128 PostgreSQL fixture that refuses missing or unsafe DSNs, verifies the connected database, restricts schemas, and creates only the minimal member prerequisites.
- Added migration contracts for reversible 0145 up/down/up behavior, a non-empty-table precondition with rollback proof, stored-slug constraints, and slug immutability.
- Added repository contracts for German transliteration, ampersand handling, accent decomposition, unusable/reserved inputs, readable collision suffixes, advisory-lock allocation, and all three production member creation seams.
- Provisioned exactly one guarded `team4s_phase128_test` database without dropping, resetting, or consulting the live application database.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the dedicated Phase-128 PostgreSQL safety fixture** - `04032ae0`, corrected by `b86409c6`
2. **Task 2: Define reversible migration and immutability tests** - `51c3b719`
3. **Task 3: Define normalizer, allocation, and creation-seam tests** - `bf533b52`, tightened by `aad0e79b`

## Files Created

- `backend/internal/testsupport/phase128_postgres.go` - Dedicated DSN, database-name, current-database, and schema safety guards.
- `backend/internal/testsupport/phase128_postgres_test.go` - Missing-DSN, unsafe-name, and schema-boundary coverage.
- `backend/internal/migrations/phase128_public_identity_test.go` - Migration source and guarded PostgreSQL lifecycle contracts.
- `backend/internal/repository/member_public_slug_test.go` - Slug normalization, allocation, concurrency, and creation-seam contracts.

## Decisions Made

- Kept the fixture isolated from `DATABASE_URL`; Phase-128 tests can only run with the explicit dedicated DSN.
- Reused the Phase-117/106 PostgreSQL fixture seams while changing missing-DSN behavior from skip to fail-closed.
- Used source-inspection assertions for production APIs that do not exist in Wave 0, preserving compilability and the required single named RED failure.
- Inventoried the three current `INSERT INTO members` repositories in a passing independent test, then required each to adopt the future shared allocator inside the named RED contract.

## Verification

- Guarded database provision check: passed; exactly one `team4s_phase128_test` exists.
- `go test ./internal/testsupport -run Phase128 -count=1`: passed in an ephemeral Compose test container with the explicit DSN.
- Migration RED gate: passed; only `TestPhase128MigrationRequiresStoredIdentity` failed because migration 0145 is intentionally absent.
- Repository `-race` RED gate: passed; only `TestPhase128MemberSlugContract` failed because the shared allocator is intentionally absent.
- `go test ./internal/repository -run 'MemberSlugNormalizationCases|MemberInsertInventory' -count=1`: passed.
- `go vet ./internal/testsupport ./internal/migrations ./internal/repository`: passed.
- Plan frontmatter validation: passed.
- Plan structure validation: passed with the plan's existing informational missing-`<done>` warnings.
- Structural tag balance: passed.
- Scoped `git diff --check`: passed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed pre-staged user profile changes from the Task-1 commit**

- **Found during:** Task 1 commit review
- **Issue:** Two unrelated user-owned frontend files were already staged and entered commit `04032ae0` alongside the fixture.
- **Fix:** Immediately restored those paths in corrective commit `b86409c6`, then reapplied the user's exact staged and unstaged patches. The paired commits contain only the intended fixture net change, and the original user index/worktree state remains present.
- **Files protected:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Commit:** `b86409c6`

**2. [Rule 2 - Missing Critical Functionality] Made inventory and invalid-input coverage independently enforceable**

- **Found during:** Overall Task-3 acceptance review
- **Issue:** The named RED test stopped at the intentionally missing allocator before checking the exact creation-seam inventory, and only one reserved word/path-separator form was exercised.
- **Fix:** Added an independent passing inventory test, the full researched reserved set, and both slash forms.
- **Files modified:** `backend/internal/repository/member_public_slug_test.go`
- **Commit:** `aad0e79b`

**3. [Rule 3 - Blocking] Adapted verification to the immutable running backend image**

- **Found during:** Overall verification
- **Issue:** The already-running backend container did not contain newly committed source, and its Alpine Go image had CGO disabled for `-race`.
- **Fix:** Ran the same gates in disposable Compose containers with the canonical backend bind-mounted; the race gate installed `gcc` and `musl-dev` only inside its disposable container.
- **Files modified:** None

## Known Stubs

- The guarded live migration tests skip until Plan 128-04 adds migration 0145; the named migration contract remains intentionally RED.
- The guarded live allocator concurrency scenario skips until Plan 128-05 adds the shared allocator; the named repository contract remains intentionally RED.
- These are planned Wave-0 RED gates and do not prevent this plan's goal.

## TDD Gate Compliance

This Wave-0 plan intentionally establishes RED tests only. The test commits are present; production GREEN work is assigned to Plans 128-04 and 128-05.

## Next Phase Readiness

- Plans 128-04 and 128-05 can implement directly against executable schema, lifecycle, normalization, allocation, and creation-seam contracts.
- The guarded database is ready for later Phase-128 PostgreSQL tests and has not mutated `team4s_v2`.


## Self-Check: PASSED

All four created files and all five implementation/corrective commits were verified.
