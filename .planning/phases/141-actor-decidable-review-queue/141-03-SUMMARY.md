---
phase: 141-actor-decidable-review-queue
plan: 03
subsystem: api
tags: [go, gin, postgres, authorization, review-queue, pgx]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-02's ActorAppUserID/ActorMemberIDs fields on ReleaseReviewQueueOptions, the two-signal self-exclusion predicate in releaseReviewQueuePredicates, and the releaseReviewActorIdentityResolver handler dependency"
provides:
  - "releaseReviewExistenceAndIdentity (release_review_query_predicates.go) -- the shared existence+kind+submitter-identity lookup Detail and Next both call as their single 'resolve current item' step, closing the Pitfall-3 drift risk"
  - "repository.ErrForbidden sentinel (errors.go), following the existing ErrConflict/ErrValidation/ErrNotFound convention"
  - "Detail/Next repository signatures extended with actorAppUserID int64, actorMemberIDs []int64 trailing parameters; both return ErrForbidden (not ErrNotFound, not a silent 200) for an existing-but-not-actor-decidable review"
  - "Next's internal r.List(...) call now threads ActorAppUserID/ActorMemberIDs, so the resolved 'next' item itself is guaranteed excluded from the actor's own submissions, not just the current item"
  - "resolveActorMemberIDs handler helper (release_review_handler_identity.go), shared by Detail/Next/Decide/queueOptions"
  - "writeReadError's new REVIEW_FORBIDDEN (403) branch for repository.ErrForbidden"
  - "Three new regression tests closing RQUE-02/D04, RQUE-04/Pitfall-3, and RQUE-02/D05"
affects: [141-04, 141-05, 141-06, 141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Existence-then-authorize split (Pattern 3): a cheap existence+identity lookup (no kind/capability/self predicate) decides 404 (genuinely missing/cross-group) vs 403 (exists but not actor-decidable) vs 200 (exists and allowed) -- Detail and Next share this ONE lookup instead of hand-rolling their own WHERE clauses"
    - "Handler identity-resolution helper extracted to a sibling file (release_review_handler_identity.go), mirroring the existing release_review_handler_authz.go precedent, to keep the main handler file under the 450-line cap while still sharing the identity-nil-check + error-write pair across four call sites"

key-files:
  created:
    - backend/internal/handlers/release_review_handler_identity.go
  modified:
    - backend/internal/repository/errors.go
    - backend/internal/repository/release_review_query_predicates.go
    - backend/internal/repository/release_review_query_repository.go
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/handlers/release_review_handler.go
    - backend/internal/handlers/release_review_handler_test.go

key-decisions:
  - "Threaded ActorAppUserID/ActorMemberIDs into Next's own internal r.List(...) call (previously it called List with only Scope/AllowedKinds/Cursor/Limit, never the actor's identity) -- without this fix, D05 ('Next never resolves to the actor's own submission') would only have been true for the CURRENT item's identity check, not for the resolved NEXT item itself, which is what D05 actually requires. Found while implementing Task 1 and confirmed necessary by TestReleaseReviewDetailNextShareListPredicateBuilder in Task 3."
  - "Extracted resolveActorMemberIDs to a new sibling file (release_review_handler_identity.go) instead of inlining it four times in release_review_handler.go, keeping the handler at 443/450 lines per CLAUDE.md's modularity constraint (plan's own acceptance criteria anticipated this and named the extraction as the resolution path)."

patterns-established:
  - "releaseReviewExistenceAndIdentity lives in release_review_query_predicates.go alongside releaseReviewQueuePredicates -- both are shared WHERE-clause-building/lookup helpers kept separate from the repository's List/Counts/Detail/Next method bodies."

requirements-completed: [RQUE-02, RQUE-04, RQUE-05]

# Metrics
duration: ~15min
completed: 2026-08-26
---

# Phase 141 Plan 03: Existence-then-authorize split for Detail/Next Summary

**Detail and Next now resolve existence, review kind, and submitter identity through one shared `releaseReviewExistenceAndIdentity` lookup instead of three hand-rolled WHERE clauses, returning a new `ErrForbidden` (403 REVIEW_FORBIDDEN) for an existing-but-not-actor-decidable review instead of a silent 200, while genuinely missing or cross-group reviews keep their unchanged 404.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-26T09:19:00Z (approx, immediately after Plan 141-02 completed)
- **Completed:** 2026-08-26T09:30:00Z
- **Tasks:** 3
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments
- `errors.go` gained `ErrForbidden`, following the existing `ErrConflict`/`ErrValidation`/`ErrNotFound` sentinel convention.
- `releaseReviewExistenceAndIdentity` (new function in `release_review_query_predicates.go`) resolves whether a review exists in a fansub group -- independent of kind, capability, or submitter identity -- and, if found, its kind and submitter identity. `Detail` and `Next` both call this SAME function as their "resolve current item" step, closing 141-RESEARCH.md's Pitfall 3 (three independently hand-rolled WHERE clauses).
- `Detail`/`Next` repository methods gained `actorAppUserID int64, actorMemberIDs []int64` trailing parameters. Both now: (1) call the shared existence lookup, (2) return `ErrNotFound` if the row genuinely doesn't exist in this group (unchanged 404, verified against the pre-existing cross-group regression tests), (3) return `ErrForbidden` if the kind isn't in `allowedKinds` OR the two-signal self-check matches, (4) otherwise proceed with their existing full-content query / next-item resolution unchanged.
- `Next`'s internal `r.List(...)` call now also threads `ActorAppUserID`/`ActorMemberIDs` -- a fix beyond the plan's literal "unchanged" wording, needed because List's self-exclusion predicate can only guarantee the *resolved next item* is never the actor's own submission if the actor's identity actually flows into that inner List call (see Decisions Made).
- Handler layer: `Detail`, `Next`, and `Decide`'s pre-check (plus `Decide`'s post-decision `Next` call) now resolve the actor's verified member IDs via a new shared `resolveActorMemberIDs` helper and pass `actor.AppUserID, actorMemberIDs` to every `h.query.Detail`/`h.query.Next` call. `writeReadError` gained a `REVIEW_FORBIDDEN` (403) branch for `repository.ErrForbidden`, mirrored after the existing `REVIEW_NOT_FOUND` branch.
- The identity-resolution helper was extracted to a new sibling file, `release_review_handler_identity.go`, mirroring the existing `release_review_handler_authz.go` precedent, keeping `release_review_handler.go` at 443/450 lines (also used to de-duplicate the same logic previously inlined in `queueOptions`).
- Three new regression tests: `TestReleaseReviewDetailNextShareListPredicateBuilder` (real-Postgres, proves List/Detail/Next all agree on the same actor-decidable set, including the Next-internal-List threading fix), `TestReleaseReviewDetailOwnSubmissionReturns403` and `TestReleaseReviewNextNeverReturnsActorsOwnSubmission` (handler stub tests, proving the 403 mapping and that Next never silently returns `{"data": null}` for a forbidden current item).
- All 15 pre-existing handler `ReleaseReview*` tests and all 8 pre-existing repository `ReleaseReview*`/`Phase141*` tests remain green.

## Task Commits

Each task was committed atomically:

1. **Task 1: Existence-then-authorize for Detail/Next (repository layer)** - `fa3fac5d` (feat)
2. **Task 2: Handler 403 wiring for Detail/Next/Decide-precheck** - `6c03cb33` (feat)
3. **Task 3: D04/D05 regression tests** - `3a37ee53` (test)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `backend/internal/repository/errors.go` - Added `ErrForbidden` sentinel
- `backend/internal/repository/release_review_query_predicates.go` - New `releaseReviewExistenceAndIdentity` shared lookup, `containsReleaseReviewMemberID` helper
- `backend/internal/repository/release_review_query_repository.go` - `Detail`/`Next` rewritten to use the shared existence-and-identity lookup and return `ErrForbidden`; `Next`'s internal `List` call now threads actor identity
- `backend/internal/repository/release_review_query_repository_test.go` - New `TestReleaseReviewDetailNextShareListPredicateBuilder`; updated 3 pre-existing `Detail`/`Next` call sites for the new trailing parameters
- `backend/internal/handlers/release_review_handler.go` - `releaseReviewQueryRepository` interface extended; `Detail`/`Next`/`Decide` resolve and thread actor identity; `writeReadError` gains the 403 branch; `queueOptions` refactored to use the shared helper
- `backend/internal/handlers/release_review_handler_identity.go` - New file: `resolveActorMemberIDs` handler helper
- `backend/internal/handlers/release_review_handler_test.go` - Stub `Detail`/`Next` signatures extended and capture actor identity args; 2 new 403 regression tests

## Decisions Made
- Threaded `ActorAppUserID`/`ActorMemberIDs` into `Next`'s own internal `r.List(...)` call, which previously omitted them entirely -- without this, D05 would only have been true for the CURRENT item, not the resolved NEXT item that D05 actually governs (see Deviations).
- Extracted `resolveActorMemberIDs` to a new sibling file rather than inlining it four times, keeping `release_review_handler.go` at 443/450 lines per CLAUDE.md's file-size ceiling -- the plan's own acceptance criteria anticipated this extraction as the resolution path if the line budget was exceeded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Threaded actor identity into Next's internal List(...) call**
- **Found during:** Task 1, while implementing `Next`'s rewrite per the plan's interfaces block
- **Issue:** The plan's action text said `Next` "proceeds with its existing `r.List(...)` call unchanged," reasoning that "List's own self-exclusion predicate ... already guarantees the returned 'next' item is never the actor's own submission." This was not actually true: the pre-existing code's internal `r.List(...)` call never set `ActorAppUserID`/`ActorMemberIDs` on the `ReleaseReviewQueueOptions` it built, so List's self-exclusion predicate always no-op'd for this call (zero-value actor fields), meaning the resolved "next" item COULD be the actor's own submission -- contradicting D05.
- **Fix:** Added `ActorAppUserID: actorAppUserID, ActorMemberIDs: actorMemberIDs` to the `ReleaseReviewQueueOptions` passed to the internal `r.List(...)` call inside `Next`.
- **Files modified:** `backend/internal/repository/release_review_query_repository.go`
- **Verification:** `TestReleaseReviewDetailNextShareListPredicateBuilder`'s final assertion (Task 3) inserts a third-party actor's own pending item immediately adjacent in sort order to the resolved candidate and proves `Next` skips it, landing on the next non-owned item instead. This assertion would fail without the fix (the third-party's own item would be returned as "next").
- **Committed in:** `fa3fac5d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for D05's actual correctness -- without this fix, "Next never resolves to the actor's own submission" would have been provably false for a very likely case (an adjacent own-item, not just the current item). No scope creep -- the plan's stated code changes (existence-then-authorize split, ErrForbidden, handler 403 wiring, D04/D05 tests) are exactly as specified.

## Issues Encountered
- No `TEAM4S_PHASE107_TEST_DSN`-matching database existed on the host at the start of this plan; created scratch databases (`team4s_phase107_test_141a`, `_141b`, `_141v`) for verification runs and dropped each afterward, matching the pattern documented in 141-01/141-02-SUMMARY.md.

## User Setup Required

None - no external service configuration required. (Note: real-Postgres repository tests in this area require `TEAM4S_PHASE107_TEST_DSN` pointed at a database matching `team4s_phase107_test_[a-z0-9]+`; they skip cleanly without it, matching existing CI behavior.)

## Next Phase Readiness
Detail/Next are now at full parity with List/Counts on actor-decidability (RQUE-04 closed for this requirement cluster). `ErrForbidden` and `releaseReviewExistenceAndIdentity` are available for any future read-path work in this handler/repository pair. No blockers for Plan 141-04.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*

## Self-Check: PASSED

All created/modified files and referenced commit hashes (`fa3fac5d`, `6c03cb33`, `3a37ee53`) verified present on disk / in `git log --oneline --all`.
