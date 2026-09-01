---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
plan: 09
subsystem: api
tags: [go, permissions, dashboard, review-queue, repository]

# Dependency graph
requires:
  - phase: 143-08
    provides: idempotent migration 0159 baseline the backend build/tests run against
provides:
  - ReleaseReviewQueryRepository.PendingGroupMediaReviewAttention / PendingReleaseReviewAttention
  - dashboard_me_handler.go with zero inline h.db.Query SQL (delegation-only attach* methods)
  - the sole remaining copy of the review self-exclusion predicate (RQUE-02/D15), now in release_review_query_repository.go
  - per-group memoized permission checks in both moved handler loops
  - first-ever tests for all three dashboard attach* candidate sources (claim, group-media, release-review)
affects: [143-10 or later plan implementing ROADMAP Success Criterion 7 (dashboard lane for rejected notes), which is documented to reuse this exact repository/handler shape]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handler attach* methods delegate 100% of SQL to a repository method returning the existing OwnDashboard* row type directly (no duplicate DTOs); the handler keeps only a permission-filtering loop memoized by a map keyed on the resource's group ID."
    - "Oversized repository file split by extracting scan/URL helpers and shared SQL constants into a sibling *_scan_helpers.go file in the same package, keeping the primary file under CLAUDE.md's 450-line cap (same split precedent as Plan 143-02)."

key-files:
  created:
    - backend/internal/repository/release_review_query_scan_helpers.go
  modified:
    - backend/internal/repository/release_review_query_repository.go
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/handlers/dashboard_me_handler.go
    - backend/internal/handlers/dashboard_me_handler_test.go
    - backend/internal/repository/member_claims_repository_test.go
    - backend/cmd/server/main.go

key-decisions:
  - "Reused repository.OwnDashboardPendingGroupMediaReview and repository.OwnDashboardPendingReleaseReview directly as the new repository methods' return row types (field names/JSON tags already matched exactly) instead of introducing PendingGroupMediaReviewRow/PendingReleaseReviewRow duplicates the plan's interfaces block offered as an option."
  - "Split stringValue/releaseReviewMediaURL/scanReleaseReviewQueueItem/releaseReviewQueueScanTargets and the releaseReviewQueueColumns/releaseReviewQueueBaseSQL SQL constants into a new release_review_query_scan_helpers.go file so release_review_query_repository.go (which the plan's own acceptance grep pins the self-exclusion predicate to) stays at 408 lines, under CLAUDE.md's 450-line cap, after adding both new methods."
  - "Built dedicated, trimmed Postgres fixtures in dashboard_me_handler_test.go (duplicating, not importing, the repository package's fixture shape) since the handlers package cannot see repository package's unexported test helpers; this mirrors the existing app_auth_test.go/admin_content_*_test.go convention of package-local permissions.Resolver + ReviewContextResolver stubs plus a dedicated LoadCache-backed capability map for handler-level permission tests."

requirements-completed: ["Criterion-3"]

# Metrics
duration: ~55min
completed: 2026-09-01
---

# Phase 143 Plan 09: Move Dashboard Attention Raw SQL Into ReleaseReviewQueryRepository Summary

**Both dashboard attention raw-SQL methods now delegate to ReleaseReviewQueryRepository (reusing the existing OwnDashboard* row types), the group-media check now gates on the real review-decision action instead of fansub_group.edit, both handler loops are per-group memoized, and all three attach* candidate sources have their first-ever tests.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-01T21:50:00Z (approx.)
- **Completed:** 2026-09-01T22:45:00Z (approx.)
- **Tasks:** 3
- **Files modified:** 7 (6 modified, 1 created)

## Accomplishments
- `ReleaseReviewQueryRepository` gained `PendingGroupMediaReviewAttention(ctx)` and `PendingReleaseReviewAttention(ctx, actorAppUserID)`, moved verbatim from the handler, reusing `OwnDashboardPendingGroupMediaReview`/`OwnDashboardPendingReleaseReview` as their return types.
- `dashboard_me_handler.go` has zero `h.db.Query(...)` calls left; both `attachPending*ReviewAttention` methods are now thin permission-filtering loops over repository results.
- Group-media review attention now checks `permissions.ActionReviewImageDecide` (the actual review-decision right) instead of the too-broad `permissions.ActionFansubGroupEdit`.
- Both moved handler loops memoize permission checks per distinct fansub group (`allowedByGroup map[int64]bool` for group-media; `authorizationByGroup map[int64]map[permissions.Action]permissions.ReviewAuthorizationResult` for release-review), matching `attachPendingClaimAttention`'s existing memoization shape.
- All three `attach*` candidate sources now have tests: `ListPendingClaimAttentionCandidates` (repository-level, first-ever), the two new repository methods (including a proof that the RQUE-02/D15 self-exclusion predicate still holds via both identity signals after the move), and two handler-level tests proving the corrected permission action and the per-group memoization.
- `release_review_query_repository.go` stayed at 408 lines (CLAUDE.md's 450-line cap) by extracting scan/URL helpers into a new sibling file, `release_review_query_scan_helpers.go` (117 lines).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PendingGroupMediaReviewAttention and PendingReleaseReviewAttention to ReleaseReviewQueryRepository** - `d62429b0` (feat)
2. **Task 2: Delegate the handler to the new repository methods, fix the permission action, add memoization** - `49b3e697` (fix)
3. **Task 3: Add the missing repository-level test for the already-compliant claim-attention path** - `616d328d` (test)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `backend/internal/repository/release_review_query_repository.go` - added `PendingGroupMediaReviewAttention`/`PendingReleaseReviewAttention`; helper functions/SQL constants moved out to keep the file at 408 lines
- `backend/internal/repository/release_review_query_scan_helpers.go` - new file holding `stringValue`, `releaseReviewMediaURL`, `scanReleaseReviewQueueItem`, `releaseReviewQueueScanTargets`, `releaseReviewQueueColumns`, `releaseReviewQueueBaseSQL` (zero behavior change, pure relocation)
- `backend/internal/repository/release_review_query_repository_test.go` - added `TestPendingReleaseReviewAttentionExcludesActorsOwnSubmissionsViaBothSignals` and `TestPendingGroupMediaReviewAttentionExcludesLogoBannerAndNonReviewItems` (plus a dedicated fixture helper for the latter)
- `backend/internal/handlers/dashboard_me_handler.go` - added `reviewQueryRepo` field + `WithReviewQueryRepo` builder; rewrote both `attachPending*ReviewAttention` methods as delegation-only, memoized loops
- `backend/internal/handlers/dashboard_me_handler_test.go` - added `TestAttachPendingGroupMediaReviewAttentionUsesReviewActionNotGroupEdit` and `TestAttachPendingReleaseReviewAttentionMemoizesPermissionCheckPerGroup`, plus their fixture helpers, a `dashboardAttentionResolverStub` (permissions.Resolver + ReviewContextResolver double with per-group call counting), and a dedicated `dashboardAttentionCacheLoader`
- `backend/internal/repository/member_claims_repository_test.go` - added `TestMemberClaimsRepositoryListPendingClaimAttentionCandidates`, reusing `member_claims_list_repository_test.go`'s existing fixture helpers
- `backend/cmd/server/main.go` - wired `dashboardMeHandler.WithReviewQueryRepo(releaseReviewQueryRepo)` (the same repository instance already constructed for the release review queue handler)

## Decisions Made
- Reused the existing `OwnDashboardPendingGroupMediaReview`/`OwnDashboardPendingReleaseReview` types as the new repository methods' return shapes rather than introducing new `PendingGroupMediaReviewRow`/`PendingReleaseReviewRow` types (the plan's interfaces block explicitly allowed this if field names/JSON tags matched, and they did).
- Split `release_review_query_repository.go`'s scan/URL helpers and SQL constants into a new sibling file to stay under CLAUDE.md's 450-line cap (CLAUDE.md's modularity constraint takes precedence over the plan's implicit assumption that both new methods could simply be appended in place; this is a Rule-2-style correctness adjustment, not scope creep — same split precedent as 143-02's `member_claims_repository.go`).
- Built handler-package-local Postgres fixtures and a `permissions.Resolver`/`ReviewContextResolver` double for the two new handler tests, since `handlers` cannot import `repository`'s unexported test fixtures and `permissions.Service` is a concrete struct backed by an injectable `Resolver` interface — this follows the exact pattern already established by `app_auth_test.go`'s `appAuthCapabilityCacheLoader`/`permissionResolverStub`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality / CLAUDE.md modularity] Split release_review_query_repository.go to stay under the 450-line cap**
- **Found during:** Task 1
- **Issue:** Adding both new methods in place (as the plan's interfaces block implied) would have grown `release_review_query_repository.go` from 408 to ~478 lines, exceeding CLAUDE.md's "Production code files should stay at or below 450 lines" constraint.
- **Fix:** Extracted `stringValue`, `releaseReviewMediaURL`, `scanReleaseReviewQueueItem`, `releaseReviewQueueScanTargets`, and the `releaseReviewQueueColumns`/`releaseReviewQueueBaseSQL` constants into a new same-package file, `release_review_query_scan_helpers.go` (117 lines). Zero behavior change; both files build and all existing tests pass unmodified.
- **Files modified:** `backend/internal/repository/release_review_query_repository.go`, `backend/internal/repository/release_review_query_scan_helpers.go` (new)
- **Verification:** `go build ./...`, `go vet ./...`, `gofmt -l` all clean; full `TestReleaseReviewQueue*` suite still passes.
- **Committed in:** `d62429b0` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 CLAUDE.md-driven modularity split)
**Impact on plan:** Necessary to satisfy CLAUDE.md's hard file-size constraint; no scope creep — pure relocation, no logic change.

### Note on the plan's acceptance-criteria grep string

`grep -rn "submitter_app_user_id <>" backend/internal/` (excluding `_test.go`) returns **two** non-test matches after this plan, not the one the plan's acceptance criteria literally expects:
- `backend/internal/repository/release_review_query_repository.go:380` — the new `PendingReleaseReviewAttention` method (the full self-exclusion block: `submitter_app_user_id <> $1` AND `NOT EXISTS ... member_claims ...`), moved verbatim from the handler. This is the block Criterion 3's must_have targets.
- `backend/internal/repository/release_review_query_predicates.go:65` — a pre-existing, structurally different, parameterized fragment (`fmt.Sprintf("source.submitter_app_user_id <> $%d", ...)`) that `releaseReviewQueuePredicates` already used before this plan (Plan 141-02, RQUE-02/D01/D06) to build the review queue's own List/Counts self-exclusion clause. It has never used the `member_claims NOT EXISTS` shape and was not part of the duplication Criterion 3 flags.

The plan's own `must_haves.truths` describes the substantive requirement precisely ("The self-exclusion predicate (`submitter_app_user_id <> $1` **+ `member_claims` NOT EXISTS**) exists in exactly one place: `release_review_query_repository.go`"), and that full-block requirement is satisfied — the handler's duplicate copy is gone, leaving exactly one copy of the full predicate. The acceptance criteria's simplified grep-on-substring proxy just doesn't distinguish this pre-existing, unrelated occurrence. Not a defect; documented here so a later reviewer isn't surprised by the grep count.

### Note on the plan's literal verification-block regex

The plan's `<verification>` block and Task 1's `<acceptance_criteria>` specify `-run "TestReleaseReviewQueryRepository|..."`, which matches zero tests — the file's existing test-naming convention is `TestReleaseReviewQueue*` (Queue, not Query), and this plan's own new tests are named `TestPendingReleaseReviewAttention*`/`TestPendingGroupMediaReviewAttention*` per their subject. All relevant tests were run and pass under their actual names (see below); this is a plan-authoring naming mismatch, not a missing-coverage gap.

## Issues Encountered
- The `TEAM4S_PHASE107_TEST_DSN`/`TEAM4S_PHASE137_TEST_DSN` fixture databases the plan's own acceptance commands depend on (`testsupport.OpenPhase107Postgres`/`OpenPhase137Postgres`) were not yet provisioned on `team4sv30-db`. Created `team4s_phase107_test_run143` (matching the required `team4s_phase107_test_[a-z0-9]+` pattern) and reused the already-existing `team4s_phase137_test_1`; both are schema-isolated per test run (per-test `CREATE SCHEMA`/`DROP SCHEMA CASCADE`) so this is safe, reusable local test infrastructure, consistent with the existing per-phase fixture-database convention already present on this host (`team4s_phase106_test_136`, `team4s_phase128_test`, etc.).
- Per the operational note for this phase, `team4sv30-backend`'s running container had stale file contents relative to the host edits (no active `docker compose watch`). Verified via `docker compose exec ... wc -l`/`diff` before every build/test run and used `docker cp` to sync each touched file into the container before compiling or testing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `dashboard_me_handler.go` now has zero `h.db.Query(...)` calls, which is the explicit prerequisite the plan's objective names for ROADMAP Success Criterion 7 (Plan 143-09 is "the prerequisite Criterion 7 depends on — no plan after this one may add a new `h.db.Query(...)` call to `dashboard_me_handler.go`").
- `ReleaseReviewQueryRepository.PendingGroupMediaReviewAttention`/`PendingReleaseReviewAttention` and the handler's `authorizationByGroup`/`allowedByGroup` memoization pattern are the exact reusable building blocks 143-CONTEXT.md's Criterion 7 section names for the new "rejected own notes" dashboard lane.
- No blockers.

---
*Phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz*
*Completed: 2026-09-01*

## Self-Check: PASSED

- FOUND: backend/internal/repository/release_review_query_scan_helpers.go
- FOUND: backend/internal/repository/release_review_query_repository.go
- FOUND: backend/internal/repository/release_review_query_repository_test.go
- FOUND: backend/internal/handlers/dashboard_me_handler.go
- FOUND: backend/internal/handlers/dashboard_me_handler_test.go
- FOUND: backend/internal/repository/member_claims_repository_test.go
- FOUND: backend/cmd/server/main.go
- FOUND commit: d62429b0
- FOUND commit: 49b3e697
- FOUND commit: 616d328d
