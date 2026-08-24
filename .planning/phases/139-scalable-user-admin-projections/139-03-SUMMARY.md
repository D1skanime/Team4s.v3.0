---
phase: 139-scalable-user-admin-projections
plan: 03
subsystem: api
tags: [postgres, sql, gin, tdd, window-functions, admin]

# Dependency graph
requires:
  - phase: 139-01
    provides: AdminUserContributionsPage/AdminContributionProjectBlock/AdminContributionRangeEntry DTOs and testsupport.OpenPhase139Postgres
provides:
  - Server-side grouped/paginated ListUserContributions (anime+project grouping, sort_index range-collapse, semantic override-diff)
  - AdminUserContributionsFilter query-param wiring on GetUserContributions
  - admin-content.yaml contract documenting the new response/query shape
affects: [139-04, 139-05, 139-06, 139-07, 139-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gap-and-island window functions (LAG + running SUM) for standard-equivalent range collapse over episodes.sort_index, never internal IDs"
    - "MIN() over array-typed columns (role_codes/extra_roles/missing_roles) as the correct way to pick an invariant per-range-group array value, replacing the incorrect ARRAY_AGG(arr_col)[1] pattern which PostgreSQL statically types as the scalar element type"
    - "Semantic override-diff computed at read time via role-set EXCEPT comparison against the project standard, never trusting release_crew_snapshots.snapshot_mode alone (F-03)"

key-files:
  created:
    - backend/internal/repository/admin_users_contributions_query.go
    - backend/internal/repository/admin_users_contributions_query_test.go
  modified:
    - backend/internal/repository/admin_users_tab_repository.go
    - backend/internal/repository/admin_users_tab_repository_test.go
    - backend/internal/repository/admin_users_repository_test.go
    - backend/internal/handlers/admin_users_handler.go
    - backend/internal/handlers/admin_users_handler_test.go
    - shared/contracts/admin-content.yaml

key-decisions:
  - "Fixed a real cardinality(text) SQL bug: ARRAY_AGG(role_codes/extra_roles/missing_roles ORDER BY ...)[1] on already-array (text[]) columns is statically typed as scalar text by PostgreSQL regardless of runtime 2D-array shape, breaking cardinality() calls and silently corrupting entry_role_codes; replaced with MIN(role_codes)/MIN(extra_roles)/MIN(missing_roles), correct because every row within one range_group shares an identical array value by construction (deviation groups are always single-row; non-deviation groups all match the project standard)."
  - "F-02 Option A executed: extended admin-user-contributions in place in admin-content.yaml (not a new admin-users.yaml file), matching RESEARCH.md's hybrid recommendation."

requirements-completed: [UADM-02, UADM-03, UADM-04, UADM-08, QUAL-06]

# Metrics
duration: ~35min (resumed session only; prior session already implemented the bulk of Tasks 1-2)
completed: 2026-08-24
---

# Phase 139 Plan 03: Grouped/Paginated User Contributions Summary

**Server-side anime+project contribution grouping with sort_index range-collapse and semantic override-vs-project-standard diffing, replacing the old unbounded flat `ListUserContributions` fetch — fixed a real `cardinality(text)` SQL type bug found via the 9-test integration suite before landing.**

## Performance

- **Duration:** ~35 min (this resumed session; the plan's Tasks 1-2 bulk of work was already implemented uncommitted in a prior session that hit a session limit)
- **Completed:** 2026-08-24
- **Tasks:** 3/3 complete
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- Diagnosed and fixed a genuine PostgreSQL static-typing bug in the new grouping query: `ARRAY_AGG(already_array_column ORDER BY ...)[1]` resolves to the scalar element type (`text`), not `text[]`, because Postgres's static type checker always types a single-subscript array reference as the element type regardless of runtime dimensionality. This broke `cardinality(entry_extra_roles)`/`cardinality(entry_missing_roles)` with `SQLSTATE 42883` on any non-empty deviation path, and silently corrupted `entry_role_codes` (would have serialized a scalar/NULL instead of the intended role-code array via `to_jsonb`). Fixed with `MIN(role_codes)`/`MIN(extra_roles)`/`MIN(missing_roles)`, which is semantically correct because every row inside one `range_group` carries an identical array value by construction.
- Verified all 9 named integration tests (D02-D10, including both F-03 fixture branches) GREEN against a real disposable Phase-139 Postgres instance.
- Repointed the stale, pre-Phase-139 `TestListUserContributions` source-assertion test (in `admin_users_tab_repository_test.go`) from the deleted old query body to the new `admin_users_contributions_query.go`, preserving the D-29 guarantee it protects (release_versions.version/episodes.episode_number are still sourced and folded into from_label/to_label) without weakening the assertion.
- Removed a leftover scratch/debug test file (`backend/internal/testsupport/zz_inspect2_test.go`) that was never part of this plan.
- Ran the full scoped regression (`go build ./...`, `go vet ./...`, `go test ./internal/repository/... ./internal/handlers/...`): zero new failures in any file this plan touches. All pre-existing failures (Phase-137 nil permissions-cache debt in `internal/handlers`, and unrelated Postgres-DSN-dependent tests in `internal/repository` for Phases 128/129/132/134) are unchanged from 139-BASELINE.md and untouched by this plan's files.
- Extended `shared/contracts/admin-content.yaml`'s existing `admin-user-contributions` entry in place (F-02 Option A): `response.type` is now `AdminUserContributionsPage`, plus a new `query_params` block (`anime_id`, `fansub_group_id`, `role_code`, `only_deviations`, `from`, `to`, `limit`, `offset`) matching the file's existing `admin-users-list` inline-style precedent.

## Task Commits

1. **Task 1: RED — failing integration tests for grouping/range-collapse/override-diff** - `ac8bdaf0` (test)
2. **Task 2: GREEN — grouped/paginated ListUserContributions + repository/handler wiring** - `4748e257` (feat) — includes the `cardinality(text)` bugfix and the lockstep `AdminUsersRepository`/`adminUsersRepoStub` interface updates
3. **Follow-up: repoint stale source-assertion test** - `25f70fae` (test) — not a distinct plan task, but required to keep the pre-existing `TestListUserContributions` compiling/meaningful after Task 2's intentional full rewrite
4. **Task 3: admin-content.yaml (F-02 Option A)** - `0486b6f5` (docs)

**Plan metadata:** this commit (docs: complete plan, includes SUMMARY.md/STATE.md/ROADMAP.md)

_Note: This plan's TDD gate was split across two sessions — Task 1 (RED, 9 tests) and the bulk of Task 2 (GREEN implementation) were written and verified against real Postgres in a prior session that hit a session limit before committing. This resumed session found and fixed a real bug the RED tests exposed once run to completion (`cardinality(text)`), confirmed all 9 tests GREEN, then completed the remaining plan-required cleanup (stale test repoint, scratch-file removal, full regression, Task 3 contract doc)._

## Files Created/Modified

- `backend/internal/repository/admin_users_contributions_query.go` - New grouping/range-collapse/override-diff SQL (6-CTE chain: base → standards/projects → version_rows/diffed → ranged_flags/ranged → range_entries → project_blocks/filtered_blocks/paged) and its Go scan/assembly logic; `AdminUserContributionsFilter` struct
- `backend/internal/repository/admin_users_contributions_query_test.go` - 9 integration tests proving D02-D10 against `testsupport.OpenPhase139Postgres`, all GREEN
- `backend/internal/repository/admin_users_tab_repository.go` - Old unbounded flat `ListUserContributions` body deleted; now delegates to `listUserContributionsGrouped`
- `backend/internal/repository/admin_users_tab_repository_test.go` - `TestListUserContributions` repointed at the new query file with corrected snippet text
- `backend/internal/repository/admin_users_repository_test.go` - `TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst` updated to check the new file and confirm the old `hist_fansub_group_members` legacy fallback is gone
- `backend/internal/handlers/admin_users_handler.go` - `GetUserContributions` now parses filter/pagination query params; `AdminUsersRepository` interface signature updated
- `backend/internal/handlers/admin_users_handler_test.go` - `adminUsersRepoStub` updated in lockstep with the interface
- `shared/contracts/admin-content.yaml` - `admin-user-contributions` entry extended in place (F-02 Option A)

## Decisions Made

- **`MIN()` over array columns instead of `ARRAY_AGG(...)[1]`:** verified against `TestListUserContributionsRangeCollapse` and `TestListUserContributionsRangeBreaksOnDeviation` specifically (per the handoff note's own caveat to not trust the reasoning blindly) — both pass, confirming the invariant (every row within a `range_group` shares an identical role/extra/missing-roles array) holds and `MIN()` is the correct fix, not just a workaround.
- **F-02 Option A (extend in place):** per RESEARCH.md's explicit hybrid recommendation; no new contract file created.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `cardinality(text) does not exist` SQL type bug in the range-entries aggregation**
- **Found during:** Task 2 verification (running the 9 integration tests to GREEN)
- **Issue:** `(ARRAY_AGG(extra_roles ORDER BY sort_index NULLS LAST))[1]` on an already-`text[]`-typed column is statically typed by Postgres as scalar `text`, not `text[]`, regardless of the actual 2D-array runtime value — breaking `cardinality(re.entry_extra_roles)` in the `project_blocks` CTE's `jsonb_build_object` CASE expression, and silently corrupting `entry_role_codes` (would serialize a scalar/NULL via `to_jsonb` instead of the intended array).
- **Fix:** Replaced `(ARRAY_AGG(role_codes/extra_roles/missing_roles ORDER BY sort_index NULLS LAST))[1]` with `MIN(role_codes)`/`MIN(extra_roles)`/`MIN(missing_roles)` in the `range_entries` CTE — semantically correct since every row inside a given `range_group` carries an identical array value by construction (deviation groups are single-row; non-deviation groups all equal the project standard).
- **Files modified:** `backend/internal/repository/admin_users_contributions_query.go`
- **Verification:** All 9 named integration tests GREEN against `TEAM4S_PHASE139_TEST_DSN`, specifically confirmed against `TestListUserContributionsRangeCollapse` and `TestListUserContributionsRangeBreaksOnDeviation` per the diagnostic note's own instruction to verify rather than trust the fix blindly.
- **Committed in:** `4748e257` (Task 2 commit)

**2. [Rule 3 - Blocking] Repointed the stale `TestListUserContributions` source-assertion test**
- **Found during:** Full scoped regression run
- **Issue:** `admin_users_tab_repository_test.go`'s `TestListUserContributions` was a source-text-assertion test checking `admin_users_tab_repository.go` for SQL/mapping snippets that no longer exist there — Task 2 correctly moved the entire query body to `admin_users_contributions_query.go` per the plan's explicit instruction to delete the old body without a fallback. Left unfixed, this test would fail every future run despite the underlying D-29 behavior (release_version_label/episode_number sourcing) being fully preserved.
- **Fix:** Repointed the test at `admin_users_contributions_query.go` with corrected exact-match snippet text (the GROUP BY clause now spans a different column list; the scan-target assertions were replaced with a check that `release_version_label`/`episode_number` are still folded into the returned `from_label`/`to_label` via the `COALESCE(NULLIF(release_version_label, ''), episode_number, '?')` expression), following the same source-inspection convention `TestAdminUsersRepository_MemberIDAnchor_CanonicalFirst` already established for this exact rewrite.
- **Files modified:** `backend/internal/repository/admin_users_tab_repository_test.go`
- **Verification:** `go test ./internal/repository/... -run TestListUserContributions` passes (both the new 9 integration tests and this repointed test).
- **Committed in:** `25f70fae`

**3. [Scope cleanup - not a deviation rule, explicit remaining-work item] Removed scratch debug file**
- **Found during:** Initial git status inspection at session start
- **Issue:** `backend/internal/testsupport/zz_inspect2_test.go` was an untracked scratch/debug leftover from prior exploration, not part of this plan.
- **Fix:** Deleted via `rm`; it was never tracked by git, so no commit was needed to remove it.
- **Files modified:** none (untracked file deleted from filesystem only)

---

**Total deviations:** 2 auto-fixed (1 Rule-1 bug, 1 Rule-3 blocking-test repoint) + 1 scope cleanup (untracked scratch file removal)
**Impact on plan:** Both auto-fixes were necessary for the plan's own stated success criteria (D02-D10 provably true; existing test suite keeps compiling/passing). No scope creep — no additional functionality was added beyond what the plan specified.

## Issues Encountered

None beyond the documented deviations above — the disposable Phase-139 Postgres DSN was available throughout this session, so all 9 integration tests ran to completion (GREEN, not SKIP).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `ListUserContributions` now returns `models.AdminUserContributionsPage` end to end (repository → handler → HTTP), with server-side filters, block-level pagination, and a provably correct semantic override-diff. This is the data foundation Plan 139-04 (or later frontend-facing plans) will consume for the rewritten Contributions-Tab UI.
- `shared/contracts/admin-content.yaml` documents the new shape; a later plan still needs to regenerate/hand-update the TypeScript mirror types and `api.ts` client call if not already covered by 139-02's DTO work (139-02-SUMMARY.md's frontend TS DTOs were written against 139-01's types — verify `AdminUserContributionsPage`'s TS mirror matches this plan's final Go shape before wiring the UI, since 139-01 defined the DTOs before this plan's SQL/Go implementation was finalized).
- No blockers for 139-04 onward.

---
*Phase: 139-scalable-user-admin-projections*
*Completed: 2026-08-24*
