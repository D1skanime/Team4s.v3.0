---
phase: 141-actor-decidable-review-queue
plan: 02
subsystem: api
tags: [go, gin, postgres, authorization, review-queue, pgx]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-01's permissions.Service.ResolveReviewGroupAuthorization and the extracted release_review_handler_authz.go authorizedKinds, the single-resolution foundation this plan extends with actor identity and the view=own bypass"
provides:
  - "releaseReviewQueuePredicates (extracted to release_review_query_predicates.go) with a two-signal (app_user_id OR verified member-claim) self-exclusion clause for view=open/history and an inverted self-inclusion clause for the new view=own scope"
  - "ReleaseReviewQueueViewOwn, ActorAppUserID/ActorMemberIDs on ReleaseReviewQueueOptions, reusing the existing opaque View-scoped cursor mechanism with zero new cursor format"
  - "List's ORDER BY corrected to descending (newest-first, D15), with the cursor 'next page' comparison flipped from > to < to match"
  - "ReleaseReviewQueueCounts.AllowedTypes (json:\"allowed_types\"), set by the handler from the request's already-resolved AllowedKinds"
  - "releaseReviewActorIdentityResolver handler dependency resolving the actor's verified member IDs once per request; queueOptions' view=own D10 capability bypass"
  - "Five new real-Postgres repository regression tests (self-exclusion two-signal, own-view + D14 decided-item exclusion, D15 sort, RDEL-05 end-to-end immediacy, RQUE-06 contribution-kind guard) plus one new handler-level D10 bypass test"
affects: [141-03, 141-04, 141-05, 141-06, 141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-signal actor identity exclusion/inclusion: a SQL predicate keyed on both a direct app_user_id match and a verified-member-claim (member_id) match, mirroring review_service.go's decision-time self-check exactly rather than a weaker one-signal version"
    - "Zero-value-safe options fields: ActorAppUserID/ActorMemberIDs default to values that make the exclusion clause a no-op for pre-existing call sites that never set them"

key-files:
  created:
    - backend/internal/repository/release_review_query_predicates.go
  modified:
    - backend/internal/repository/release_review_query_cursor.go
    - backend/internal/repository/release_review_query_repository.go
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/handlers/release_review_handler.go
    - backend/internal/handlers/release_review_handler_test.go
    - backend/cmd/server/main.go

key-decisions:
  - "A nil ActorMemberIDs slice must be normalized to a non-nil empty slice before binding to pgx: pgx encodes a nil []int64 as SQL NULL rather than '{}', and `x = ANY(NULL::bigint[])` evaluates to NULL (not TRUE), which would have silently excluded every row for every pre-existing call site that never sets ActorMemberIDs -- found and fixed while executing Task 1, before it could reach a committed state."
  - "The repository never reads capability data -- the view=own D10 'capability bypass' is entirely a handler-layer decision (queueOptions sets allowedKinds=[text,image] unconditionally, skipping authorizedKinds). The repository's AllowedKinds parameter is always honored literally; Task 3's repository-level tests derive AllowedKinds from an actual permissions.Service.ResolveGroupRights resolution (mirroring what the real handler computes) rather than asserting the repository itself ignores a narrow AllowedKinds value, which would misrepresent where the bypass actually lives."
  - "Added a new handler-level test (TestReleaseReviewQueueOwnViewBypassesCapabilityGate) proving the D10 bypass structurally at the layer where it is implemented, since none of the plan's stated test names exercised it directly."

patterns-established:
  - "releaseReviewQueuePredicates lives in its own file (release_review_query_predicates.go) separate from the repository's List/Counts/Detail/Next methods, making the shared WHERE-clause-building logic independently readable and testable."

requirements-completed: [RQUE-01, RQUE-02, RQUE-03, RQUE-04, RQUE-06, RDEL-05]

# Metrics
duration: 40min
completed: 2026-08-26
---

# Phase 141 Plan 02: Self-exclusion, own-view queue, D15 sort correction Summary

**Actor's own submissions are now excluded from the actionable release-review queue and counters using a two-signal identity check (app_user_id or verified member-claim), a new `view=own` scope surfaces only the actor's own pending submissions with the capability gate bypassed, `List` now sorts newest-first per D15, and `Counts` echoes the request's resolved `allowed_types` for honest frontend filter-gating.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-26T08:30:00Z (approx, planning/context-read phase)
- **Completed:** 2026-08-26T09:18:55Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `releaseReviewQueuePredicates` extracted to its own file and extended with a two-signal self-exclusion clause (view=open/history) / self-inclusion clause (view=own), exactly mirroring `review_service.go`'s decision-time identity check (app_user_id match OR verified member-claim match via `SubmitterMemberID`/`BeneficiaryMemberID`).
- New `ReleaseReviewQueueViewOwn` scope value round-trips through `validateReleaseReviewScope` and the existing opaque cursor mechanism with zero new cursor fields.
- `List`'s `ORDER BY` corrected from ascending to descending across all three sort columns (D15), with the cursor "next page" comparison flipped from `>` to `<` to match.
- `ReleaseReviewQueueCounts.AllowedTypes` (`json:"allowed_types"`) added, initialized to `[]string{}` so it marshals as `[]` (not `null`) until the handler sets it.
- Handler resolves the actor's verified member IDs exactly once per request via a new `releaseReviewActorIdentityResolver` dependency, threading `ActorAppUserID`/`ActorMemberIDs` into every `ReleaseReviewQueueOptions`; `view=own` bypasses the capability gate (`authorizedKinds` skipped entirely, `allowedKinds` unconditionally `[text, image]`); `Counts` echoes the request's resolved `AllowedKinds` as `allowed_types`.
- `main.go` wires the already-constructed `authzRepo` as the handler's 4th constructor argument; no second `AuthzRepository` instance.
- Five new real-Postgres repository regression tests (self-exclusion two-signal, own-view + D14 decided-item exclusion, D15 sort + pagination, RDEL-05 end-to-end grant/revoke immediacy, RQUE-06 contribution-kind structural guard) plus one new handler-level test proving the D10 capability bypass structurally.
- All 6 pre-existing repository `ReleaseReview*` tests and all 15 pre-existing (14 original + 1 new) handler `ReleaseReview*` tests remain green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Self-exclusion + own-view predicate extraction + D15 sort direction + allowed_types field** - `b46cd71a` (feat)
2. **Task 2: Handler actor-identity wiring + own-view capability bypass + allowed_types echo** - `e432f58e` (feat)
3. **Task 3: RQUE-02/D15/RDEL-05/RQUE-06 repository regression tests** - `ed38f222` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `backend/internal/repository/release_review_query_predicates.go` - New file: extracted and extended `releaseReviewQueuePredicates` (two-signal self-exclusion/inclusion, corrected pending-state branch, flipped cursor comparison)
- `backend/internal/repository/release_review_query_cursor.go` - `ReleaseReviewQueueViewOwn` constant, `ActorAppUserID`/`ActorMemberIDs` fields, extended scope validation
- `backend/internal/repository/release_review_query_repository.go` - Removed relocated predicate function, `ORDER BY ... DESC` (D15), `ReleaseReviewQueueCounts.AllowedTypes` field
- `backend/internal/repository/release_review_query_repository_test.go` - 5 new real-Postgres regression tests plus fixture/helper additions
- `backend/internal/handlers/release_review_handler.go` - `releaseReviewActorIdentityResolver`, actor identity resolution in `queueOptions`, view=own bypass, `Counts` echoes `allowed_types`
- `backend/internal/handlers/release_review_handler_test.go` - `releaseReviewIdentityStub`, all 14 `NewReleaseReviewHandler` call sites updated, 1 new bypass test
- `backend/cmd/server/main.go` - `authzRepo` passed as the handler's 4th constructor argument

## Decisions Made
- Normalized a nil `ActorMemberIDs` slice to a non-nil empty slice before binding to pgx (see Deviations) -- without this, the "safe no-op for unset fields" claim in the plan's interfaces block would have been false and every pre-existing call site would have silently seen zero rows.
- Kept the capability bypass (D10) entirely handler-side; Task 3's repository tests compute `AllowedKinds` from a real `permissions.Service.ResolveGroupRights` resolution rather than asserting the repository ignores a narrow `AllowedKinds` value.
- Added a handler-level regression test for the D10 bypass (Rule 2) since the plan's five named tests are all repository-layer and could never directly prove a handler-layer behavior.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Normalized nil ActorMemberIDs before binding to avoid a silent SQL NULL exclusion bug**
- **Found during:** Task 1, immediately after writing the two-signal predicate and running the pre-existing `TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages` test as a smoke check
- **Issue:** pgx encodes a nil `[]int64` as SQL `NULL`, not `'{}'`. `NOT (source.submitter_member_id = ANY(NULL::bigint[]))` evaluates to SQL `NULL` (not `TRUE`), which is not-true in a `WHERE` clause -- so every pre-existing call site that never sets `ActorMemberIDs` (i.e. every call site before this plan) would have silently excluded 100% of rows instead of safely no-op'ing, exactly the opposite of the plan's own documented safety claim.
- **Fix:** Normalized `options.ActorMemberIDs` to a non-nil empty slice (`[]int64{}`) before binding, for both the exclusion and inclusion branches.
- **Files modified:** `backend/internal/repository/release_review_query_predicates.go`
- **Verification:** `TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages` failed with "should have 2 item(s), but has 0" before the fix, passed after.
- **Committed in:** `b46cd71a` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added a handler-level test proving the D10 capability bypass structurally**
- **Found during:** Task 3, while reviewing the plan's five named test targets against what each layer can actually prove
- **Issue:** The plan's must-haves require `view=own` to bypass the capability gate (D10), and Task 2 implements this entirely in the handler (`queueOptions` skips `authorizedKinds`). None of the plan's five named repository-layer tests, and none of the pre-existing handler tests, directly exercise this behavior -- the repository has no concept of capability at all, so it structurally cannot prove a "bypass."
- **Fix:** Added `TestReleaseReviewQueueOwnViewBypassesCapabilityGate` to `release_review_handler_test.go`, proving `view=own` never calls `ResolveReviewGroupAuthorization` and always uses `[text, image]` as `AllowedKinds`, even when the actor is authorized for neither review kind.
- **Files modified:** `backend/internal/handlers/release_review_handler_test.go`
- **Verification:** New test passes; all 14 pre-existing handler tests remain green.
- **Committed in:** `ed38f222` (Task 3 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical test coverage)
**Impact on plan:** Both auto-fixes were necessary for correctness (the nil-slice bug would have silently broken every pre-existing production call site) and for genuine proof of a security-relevant behavior (the D10 bypass). No scope creep -- the plan's stated code changes (self-exclusion, own-view, D15 sort, allowed_types, actor identity wiring) are exactly as specified.

## Issues Encountered
- No `TEAM4S_PHASE107_TEST_DSN`-matching database existed on the host; created a scratch `team4s_phase107_test_141` database for verification runs and dropped it again afterward (matches the pattern documented in 141-01-SUMMARY.md; fixture-internal schemas are auto-cleaned via `t.Cleanup`, only the outer database is created/dropped manually).
- Confirmed via direct code reading that `BeneficiaryMemberID` (used by `review_service.go`'s two-signal check) is scanned from `lifecycle.submitter_member_id` under an alias (`release_review_adapters.go:69`), so the plan's interfaces-block reference to `source.submitter_member_id` as the second signal is consistent with `review_service.go`'s decision-time definition -- no naming ambiguity, just an aliasing detail worth recording for future readers.

## User Setup Required

None - no external service configuration required. (Note: real-Postgres repository tests in this area require `TEAM4S_PHASE107_TEST_DSN` pointed at a database matching `team4s_phase107_test_[a-z0-9]+`; they skip cleanly without it, matching existing CI behavior.)

## Next Phase Readiness
`releaseReviewQueuePredicates`, `ActorAppUserID`/`ActorMemberIDs`, and the two-signal identity pattern are now available for Plan 141-03 to extend to `Detail`/`Next`'s equivalent self-exclusion gap (deliberately deferred from this plan per the objective). The `AllowedTypes` field on `ReleaseReviewQueueCounts` is ready for Plan 141-06's frontend filter-gating work. No blockers.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created/modified files and referenced commit hashes (`b46cd71a`, `e432f58e`, `ed38f222`) verified present on disk / in `git log --oneline --all`.
