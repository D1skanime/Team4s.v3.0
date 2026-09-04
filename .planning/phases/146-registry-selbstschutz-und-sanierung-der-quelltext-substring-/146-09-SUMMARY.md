---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 09
subsystem: testing
tags: [go, gin, postgres, pgx, dashboard, ownership-gate, testify]

# Dependency graph
requires:
  - phase: 146-04
    provides: the frozen 20-file SecurityRelevantTestFiles list and the presence-vs-absence violation rule this plan remediates against
provides:
  - Real httptest + real-Postgres proofs (no os.ReadFile/strings.Contains source assertions) for 1 of the 20 locked Block-2 files (dashboard_me_handler_test.go)
affects: [146-13 (ratchet-guard file list should shrink by this file)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "resolveVerifiedMemberIDForAppUser takes a real *pgxpool.Pool, not an interface -- proven via testsupport.OpenPhase107Postgres (already used elsewhere in this exact file for the attachPendingXxxAttention tests) instead of inventing a new fixture."
    - "IDOR resistance proven by firing a real GET request carrying an attacker-supplied conflicting ?member_id= query param and asserting the captured memberID argument a fake ownDashboardLoader received, not by grepping the handler's source for absent c.Query('member_id') calls."
    - "CommentAuthIdentityFromContext requires both AuthIdentity.UserID > 0 and a non-empty DisplayName; identities built only with AppUserID silently fail to 401 without either field set (same pitfall documented in Plan 146-08's SUMMARY)."

key-files:
  created: []
  modified:
    - backend/internal/handlers/dashboard_me_handler_test.go

key-decisions:
  - "Reused testsupport.OpenPhase107Postgres (already used by this file's attachPendingXxxAttention tests) rather than a new fixture -- its schema already provisions members/app_users/member_claims exactly as resolveVerifiedMemberIDForAppUser needs."
  - "TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper proves delegation by calling both ContributionsMeHandler.resolveVerifiedMemberID(ctx, appUserID) (constructed via NewContributionsMeHandler(nil, nil, pool), since only h.db is needed for this method) and resolveVerifiedMemberIDForAppUser(ctx, pool, appUserID) directly and asserting identical results, instead of grepping contributions_me_handler.go for the literal delegating return statement."
  - "TestGetOwnDashboardRequiresAuth and TestEmptyOwnDashboardDataMatchesD09Contract were left untouched per the plan's <interfaces> section -- neither uses os.ReadFile."

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: ~1h
completed: 2026-09-04
---

# Phase 146 Plan 09: Remediate dashboard_me_handler_test.go's D-08/D-09 source-substring proofs Summary

**Replaced os.ReadFile+strings.Contains source-substring proofs in the 4 non-compliant test functions of dashboard_me_handler_test.go with real httptest + real-Postgres calls, reusing the file's existing testsupport.OpenPhase107Postgres fixture pattern.**

## Performance

- **Duration:** ~1h
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `TestDashboardMeHandlerUsesSharedOwnershipGateHelper` now seeds a verified `member_claims` row, fires a real `GET /api/v1/me/dashboard?member_id=999999` (attacker-supplied, unrelated member), and asserts the fake `ownDashboardLoader`'s captured `memberID` argument equals the real resolved member (501), never the attacker's `999999` -- proving D-08 IDOR resistance by execution.
- `TestDashboardMeHandlerGracefulEmptyStateInsteadOf403` now fires a real `GET /api/v1/me/dashboard` for an `AppUserID` with no verified `member_claims` row and asserts `recorder.Code == 200` with `has_member_profile == false` -- proving D-09's graceful-empty-state contract by the actual 200-vs-403 behavioral outcome, not a source-absence grep.
- `TestContributionsMeHandlerDelegatesToSharedOwnershipGateHelper` now calls `ContributionsMeHandler.resolveVerifiedMemberID` and `resolveVerifiedMemberIDForAppUser` directly against the same seeded Postgres fixture and asserts both resolve to the identical `memberID` (601) -- proving delegation behaviorally.
- `TestMeIdentityHelpersDefinesSharedOwnershipGate` now seeds one `pending` and one `verified` `member_claims` row for two different `AppUserID`s and calls `resolveVerifiedMemberIDForAppUser` for both, asserting the pending claim returns `repository.ErrNotFound` and the verified claim resolves to the correct `memberID` -- proving `claim_status = 'verified'` scoping by execution.

## Task Commits

1. **Task 1: Remediate the D-08 IDOR-resistance and D-09 empty-state claims via real handler calls** - `20394d0d` (test)

## Files Created/Modified
- `backend/internal/handlers/dashboard_me_handler_test.go` - The 4 previously source-inspection-based test functions now prove their D-08/D-09 claims via real httptest + real-Postgres calls; `TestGetOwnDashboardRequiresAuth` and `TestEmptyOwnDashboardDataMatchesD09Contract` are unchanged. `os` and `strings` imports removed (no longer used); `errors` import added for `errors.Is(err, repository.ErrNotFound)`.

## Decisions Made
- Reused `testsupport.OpenPhase107Postgres` (the file's own pre-existing fixture, already backing the `attachPendingXxxAttention` tests) instead of inventing a new fixture -- its `members`/`app_users`/`member_claims` schema is exactly what `resolveVerifiedMemberIDForAppUser` needs, per the orchestrator context's pointer.
- Proved `ContributionsMeHandler`'s delegation by calling its real (unexported, same-package) `resolveVerifiedMemberID` method directly rather than routing through a full HTTP handler that would need unrelated repositories wired up -- the method itself is a one-line delegate (`return resolveVerifiedMemberIDForAppUser(ctx, h.db, appUserID)`), so calling it real-database-backed IS the real request path for this specific claim.
- `NewContributionsMeHandler(nil, nil, pool)` is safe for this test because `resolveVerifiedMemberID` only touches `h.db`; the nil `contributionsRepo`/`groupRolesRepo` fields are never dereferenced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Synthetic `middleware.AuthIdentity` literals initially failed `CommentAuthIdentityFromContext`'s hidden validation (401 instead of reaching the handler)**
- **Found during:** Task 1, first test run
- **Issue:** `CommentAuthIdentityFromContext` requires both `AuthIdentity.UserID > 0` and a non-empty, trimmed `DisplayName` in addition to `AppUserID`; the two new tests' identity literals set only `AppUserID`/`AppUserStatus`, causing a silent 401 before the ownership-gate resolution was ever reached (same pitfall Plan 146-08's SUMMARY documented for a sibling file).
- **Fix:** Added `UserID` and `DisplayName` fields to both synthetic identity literals in `TestDashboardMeHandlerUsesSharedOwnershipGateHelper` and `TestDashboardMeHandlerGracefulEmptyStateInsteadOf403`.
- **Files modified:** `backend/internal/handlers/dashboard_me_handler_test.go`
- **Verification:** Both tests pass with the expected 200 status codes.
- **Committed in:** `20394d0d` (part of Task 1's commit)

---

**Total deviations:** 1 auto-fixed (bug)
**Impact on plan:** No scope creep; the fix is confined to the target test file and required to reach the plan's stated 4/4 PASS acceptance criterion.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required. Real-Postgres verification reused the already-existing `team4s_phase107_test_p144` fixture database on the project's shared dev Postgres container (`team4sv30-db`, reached via `TEAM4S_PHASE107_TEST_DSN` inside the Docker network) -- no new provisioning was needed. No `go` binary is available on the host PATH; all `go build`/`go vet`/`go test`/`gofmt` verification commands were run via `docker exec team4sv30-backend`.

## Next Phase Readiness
- One more of the 20 locked `SecurityRelevantTestFiles` (146-04) now proves its claims via real execution; 146-13's ratchet-guard exception list should be able to drop this filename when that plan runs.
- No blockers for the remaining Block-2 remediation plans.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

- FOUND: `backend/internal/handlers/dashboard_me_handler_test.go`
- FOUND: `.planning/phases/146-registry-selbstschutz-und-sanierung-der-quelltext-substring-/146-09-SUMMARY.md`
- FOUND: commit `20394d0d`
