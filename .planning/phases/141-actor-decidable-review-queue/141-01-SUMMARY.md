---
phase: 141-actor-decidable-review-queue
plan: 01
subsystem: api
tags: [go, gin, postgres, authorization, review-delegation, permissions]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver
    provides: "permissions.Service.ResolveGroupRights, the single provenance-capable group-wide decision primitive this plan consolidates onto"
  - phase: 140-review-delegation-management
    provides: "ReviewService.GrantDelegation/RevokeDelegation and the specialized review-grant provider ResolveGroupRights already batches"
provides:
  - "permissions.Service.ResolveReviewGroupAuthorization -- single-resolution, per-review-action authorization for a fansub group, replicating CanReviewForFansubGroup's exact guard chain (including the ReviewContextResolver verified-membership gate) for both review.text.decide and review.image.decide in one ResolveGroupRights call"
  - "release_review_handler_authz.go's authorizedKinds now resolves group review rights exactly once per HTTP handler invocation (List/Counts/Detail/Next/Decide-precheck), closing 141-RESEARCH.md's Pitfall 1 N+1"
  - "TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts -- regression proof of single-resolution across all four handler entry points"
  - "TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke -- real-Postgres proof the decision-time guard (review_service.go, untouched) survives a mid-flight delegation revoke deterministically, never double-applying a decision"
affects: [141-02, 141-03, 141-04, 141-05, 141-06, 141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-resolution authorization: aggregate multiple per-action authorization calls into one map[Action]Result built from exactly one central-resolver call, instead of calling the central resolver once per action"

key-files:
  created:
    - backend/internal/permissions/review_group_authorization.go
    - backend/internal/handlers/release_review_handler_authz.go
  modified:
    - backend/internal/handlers/release_review_handler.go
    - backend/internal/handlers/release_review_handler_test.go
    - backend/internal/services/review_service_test.go

key-decisions:
  - "ResolveReviewGroupAuthorization replicates CanReviewForFansubGroup's guard chain exactly (including the ReviewContextResolver verified-membership gate, which is intentionally stricter than ResolveGroupRights' own ActiveMembership signal) rather than substituting the looser signal -- prevents an elevation-of-privilege regression where an unclaimed-but-role-granted member would appear allowed in List/Counts while Decide still denies them."
  - "CanReviewForFansubGroup itself is left untouched (still used by review_service.go's own transaction-scoped authorization, per 141-CONTEXT.md D11) -- only the handler-layer read path was consolidated onto the new single-resolution entry point."
  - "Fixed a pre-existing, previously-undiscovered gap in review_service_test.go's shared Postgres fixture (missing user_group_capability_overrides table) because it directly blocked this plan's new concurrency test; a second, wider pre-existing gap (package-level role-capability cache never loaded for most of this package's real-Postgres tests) was left unfixed and logged to deferred-items.md as out of scope."

patterns-established:
  - "Single-resolution authorization: when multiple actions need per-action Results from the same underlying resolver, call the resolver once and project a map[Action]Result, rather than calling it once per action."

requirements-completed: [RQUE-01, RQUE-04, RQUE-05, RDEL-05]

# Metrics
duration: 11min
completed: 2026-08-26
---

# Phase 141 Plan 01: Single-resolution review authorization Summary

**Closed the real N+1 in the release-review read path by resolving group review rights exactly once per handler call via a new `permissions.Service.ResolveReviewGroupAuthorization`, and proved with a real-Postgres concurrency test that the decision-time guard survives a mid-flight delegation revoke without ever double-applying a decision.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-26T08:52:00Z
- **Completed:** 2026-08-26T09:03:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified) + 1 deviation-tracking doc

## Accomplishments
- `permissions.Service.ResolveReviewGroupAuthorization` resolves `review.text.decide` and `review.image.decide` for one actor + fansub group in a single pass, calling `ResolveGroupRights` exactly once instead of twice, while byte-for-byte preserving `CanReviewForFansubGroup`'s guard chain (nil-service, actor-invalid, disabled, no-group, platform-admin fast path, resource-existence, and crucially the verified-membership `ReviewContextResolver` gate).
- `authorizedKinds` (List/Counts/Detail/Next/Decide's pre-check) was extracted to `release_review_handler_authz.go` and now calls the new single-resolution entry point once per handler invocation, proven by `TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts` across all four call sites.
- All 13 pre-existing `release_review_handler_test.go` tests remain green with zero behavioral drift.
- Added `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`, a real-Postgres concurrency test proving `Decide`'s own, untouched transaction-scoped authorization guard resolves a mid-flight delegation revoke deterministically to either success or `ErrReviewCapabilityDenied` -- never a double-applied decision -- and that any decision attempt strictly after a completed revoke is denied.

## Task Commits

Each task was committed atomically:

1. **Task 1: Single-resolution review authorization (Pattern 1)** - `7fc65ffb` (feat)
2. **Task 2: Decision-guard concurrency regression under mid-flight revoke** - `d3f40289` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `backend/internal/permissions/review_group_authorization.go` - New `ResolveReviewGroupAuthorization`, replicating `CanReviewForFansubGroup`'s guard chain once for both review actions
- `backend/internal/handlers/release_review_handler_authz.go` - Extracted `authorizedKinds`, now calling the single-resolution entry point
- `backend/internal/handlers/release_review_handler.go` - Removed `authorizedKinds` (moved out); `releaseReviewPermissionService` interface now requires `ResolveReviewGroupAuthorization` instead of `CanReviewForFansubGroup`
- `backend/internal/handlers/release_review_handler_test.go` - Stub updated to `ResolveReviewGroupAuthorization` with a `resolveCalls` counter; added `TestReleaseReviewHandlerResolvesGroupRightsOnceForListAndCounts`
- `backend/internal/services/review_service_test.go` - Added `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`; fixed the fixture's missing `user_group_capability_overrides` table; added a file-scoped role-capability cache loader
- `.planning/phases/141-actor-decidable-review-queue/deferred-items.md` (new) - Documents a pre-existing, wider gap found but deliberately not fixed (out of scope)

## Decisions Made
- Preserved the `ReviewContextResolver` verified-membership gate exactly rather than substituting `ResolveGroupRights`'s looser `ActiveMembership` signal -- see threat model T-141-01 and key-decisions above.
- Left `CanReviewForFansubGroup` and `review_service.go`'s own authorization call untouched, per 141-CONTEXT.md D11 and the plan's explicit non-goal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed a literal `CanReviewForFansubGroup` reference from a doc comment to satisfy the plan's grep acceptance criterion**
- **Found during:** Task 1
- **Issue:** The plan's acceptance criterion requires `grep -n "CanReviewForFansubGroup" release_review_handler.go release_review_handler_authz.go` to show zero matches; an explanatory doc comment in the new `release_review_handler_authz.go` referenced the old function name literally, causing a spurious grep match despite the handler layer no longer calling it.
- **Fix:** Reworded the comment to describe the change without repeating the literal old function name.
- **Files modified:** `backend/internal/handlers/release_review_handler_authz.go`
- **Verification:** `grep -n "CanReviewForFansubGroup" ...` now exits 1 (zero matches); `go build ./...` still clean.
- **Committed in:** `7fc65ffb` (Task 1 commit)

**2. [Rule 3 - Blocking] Added the missing `user_group_capability_overrides` table to `review_service_test.go`'s shared Postgres fixture**
- **Found during:** Task 2
- **Issue:** `openPhase107ReviewServicePostgres`'s fixture predates Phase 137 and never created `user_group_capability_overrides`. `permissions.Service.ResolveGroupRights` -> `AuthzRepository.ResolveActorUserOverrides` queries this table unconditionally, so every `GrantDelegation`/`RevokeDelegation`/`Decide` call in this file failed against real Postgres with `relation "user_group_capability_overrides" does not exist` -- including the plan's own new test.
- **Fix:** Added a minimal inline `CREATE TABLE user_group_capability_overrides (...)` to the shared fixture.
- **Files modified:** `backend/internal/services/review_service_test.go`
- **Verification:** New test passes against a real Postgres DSN with `-race`, run 8x consecutively without flake.
- **Committed in:** `d3f40289` (Task 2 commit)

**3. [Rule 3 - Blocking] Added a file-scoped role-capability cache loader for the new test's group-lead actor**
- **Found during:** Task 2
- **Issue:** `permissions.Service.LoadCache` populates a package-level, not per-instance, in-memory role->action cache that starts `nil` (fail-closed). Without loading it, `changeDelegation`'s `ActionFansubGroupMembersManage` check for the group lead's `fansub_lead` role would always deny, regardless of database state, making `GrantDelegation` unusable in the new test.
- **Fix:** Added `ensureReviewServicePermissionsCacheLoaded` / `reviewServiceCacheLoaderStub` (a `sync.Once`-guarded loader granting exactly `RoleFansubLead -> ActionFansubGroupMembersManage`, with every other action parked under an unused role to satisfy `LoadCache`'s D-10 catalog-consistency check), mirroring the existing precedent in `effective_rights_service_test.go`. Called only from the new test.
- **Files modified:** `backend/internal/services/review_service_test.go`
- **Verification:** New test passes; existing tests' pass/skip behavior is unaffected when run without the real-Postgres DSN (the default CI baseline).
- **Committed in:** `d3f40289` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues, all necessary to complete Task 1/Task 2's stated acceptance criteria)
**Impact on plan:** All auto-fixes were required for correctness or to unblock verification. No scope creep -- the plan's actual code changes (ResolveReviewGroupAuthorization, authorizedKinds extraction) are exactly as specified.

## Issues Encountered
- Running the new real-Postgres concurrency test surfaced a **wider, pre-existing** gap: several other real-Postgres tests in `internal/services` (in `review_service_test.go`, `release_review_decision_test.go`, `release_review_submission_test.go`) also fail once the missing-table issue is fixed, because nothing in the package previously loaded the role cache with `ActionFansubGroupMembersManage` for `fansub_lead`. Confirmed via `git stash`-free direct testing that this predates Plan 141-01 (the pre-existing `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder` fails identically against the same real Postgres DSN). This is out of Plan 141-01's `files_modified` scope (touches unrelated test files) and was left unfixed; documented in `.planning/phases/141-actor-decidable-review-queue/deferred-items.md` with the full affected-test list and a recommended follow-up (one shared, package-wide cache-loading fixture helper).
- The backend container lacked `gcc`/`musl-dev` needed for `-race`; installed both via `apk add --no-cache gcc musl-dev` directly in the running container for this session only (not persisted to the image) to satisfy the plan's `-race` verification requirement.
- No Postgres database matching the `team4s_phase107_test_<name>` pattern existed; created a scratch `team4s_phase107_test_run` database for verification and dropped it again afterward (fixture-internal schemas are auto-cleaned via `t.Cleanup`; the outer database was created/dropped manually since `TEAM4S_PHASE107_TEST_DSN` requires an existing database to connect to).

## User Setup Required

None - no external service configuration required. (Note: real-Postgres tests in this area require `TEAM4S_PHASE107_TEST_DSN` pointed at a database matching `team4s_phase107_test_[a-z0-9]+`; they skip cleanly without it, matching existing CI behavior.)

## Next Phase Readiness
`ResolveReviewGroupAuthorization` is now the sole per-action authorization path the release-review handler layer uses, giving Plans 02-07 (self-exclusion, own-pending view, Detail/Next predicate sharing) one clean, single-resolution foundation to extend instead of the historical two-call path. No blockers. The deferred, wider role-cache gap (deferred-items.md) does not block any of this phase's remaining plans since none of their files_modified overlap with the affected pre-existing tests.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created files and referenced commit hashes verified present on disk / in `git log --oneline --all`.
