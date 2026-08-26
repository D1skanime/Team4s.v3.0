# Deferred Items — Phase 141

## Plan 01: pre-existing gaps found while adding real-Postgres tests, out of Plan 01's scope

While building `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`
(`backend/internal/services/review_service_test.go`), running the review-service test
fixture (`openPhase107ReviewServicePostgres`) against a real Postgres DSN
(`TEAM4S_PHASE107_TEST_DSN`) surfaced two **pre-existing, package-wide** gaps that predate
Plan 141-01 and are unrelated to the plan's actual scope (single-resolution review
authorization). Both are now understood; only the first was fixed (it directly blocked
Task 2's own new test), the second was intentionally left alone because fixing it for every
affected test is a separate, larger change outside this plan's file list.

### 1. FIXED (in scope) — `user_group_capability_overrides` table missing from the fixture

`backend/internal/services/review_service_test.go`'s `openPhase107ReviewServicePostgres`
fixture only applies migration `0134_review_foundation` plus a few inline `CREATE TABLE`
statements. It never created `user_group_capability_overrides` (added later by migration
`0146_capability_policy_catalog`), which
`permissions.Service.ResolveGroupRights` -> `AuthzRepository.ResolveActorUserOverrides` ->
`AuthzUserOverridesRepository.LoadCurrentOverrides` queries unconditionally. Every call in
this file that reaches `ResolveGroupRights` (via `CanForFansubGroup` in
`changeDelegation`, or via `CanReviewForFansubGroup` in `Decide`) failed against real
Postgres with `relation "user_group_capability_overrides" does not exist`. Fixed by adding
a minimal inline `CREATE TABLE user_group_capability_overrides (...)` to the shared fixture
— this benefits every test in the file, not just the new one.

### 2. NOT FIXED (out of scope) — package-level role-capability cache never loaded for most of `internal/services`' real-Postgres tests

`permissions.Service.LoadCache` populates a **package-level** (not per-`Service`-instance)
in-memory role->action cache that starts `nil` (fail-closed: `roleAllows` always returns
`false` until loaded). `backend/internal/services/effective_rights_service_test.go`
already established the precedent that some test file in this package must call
`permissions.NewService(nil).LoadCache(...)` once before any role-grant-dependent
assertion can pass against real Postgres — but its own stub deliberately does **not** grant
`RoleFansubLead -> ActionFansubGroupMembersManage` (that action is parked under an unused
role in that file's stub, since that plan's own tests only exercise different actions).

This means every OTHER real-Postgres test in `internal/services` that calls
`ReviewService.GrantDelegation` / `RevokeDelegation` (which authorizes via
`ActionFansubGroupMembersManage` through the group-lead's `fansub_lead` role) or
`ReviewService.Decide` for a role-granted (not specialized-delegation-granted) reviewer,
was **already failing** before Plan 141-01 whenever actually run with
`TEAM4S_PHASE107_TEST_DSN` set — confirmed independent of Plan 141-01's changes by running
the pre-existing `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder` against the same
DSN, which fails identically. This is not a regression Plan 141-01 introduced; these tests
were never actually exercised against real Postgres in CI (the DSN is unset there), so the
gap went unnoticed.

Plan 141-01's own new test (`TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`)
works around this by defining its own file-scoped `sync.Once`-guarded cache loader
(`ensureReviewServicePermissionsCacheLoaded` / `reviewServiceCacheLoaderStub`) granting
exactly `RoleFansubLead -> ActionFansubGroupMembersManage`, called only from that one test.

**Affected pre-existing tests** (all in `backend/internal/services`, all fail identically
with `review capability denied` or the underlying `relation ... does not exist` when run
against a real Postgres DSN, confirmed independent of this plan):
- `review_service_test.go`: `TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit`,
  `TestPhase107ReviewServiceRejectValidationAndSelfReview`,
  `TestPhase107ReviewServiceFirstDecisionWinsConcurrent`,
  `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder`,
  `TestPhase107ReviewServiceCreditSlotsAcrossRevisionsAndIndependentSources`
- `release_review_decision_test.go`: `TestReleaseReviewResubmitKeepsStableContributionAndReviewLimits`
- `release_review_submission_test.go`: `TestReleaseSourceSubmitRejectEditResubmitKeepsIdentity`,
  `TestReleaseReviewOwnershipFailsClosed`, `TestReleaseReviewOwnershipAdaptersApplyAtomicDecisions`,
  `TestReleaseReviewOwnershipExactLandedErrors`

**Recommended follow-up** (not done here — touches files outside Plan 141-01's
`files_modified` list and is a cross-cutting test-infrastructure fix, not a single-plan
change): introduce one shared, package-wide cache-loading fixture helper (superset role map
covering every action every real-Postgres test in `internal/services` needs) and have every
affected test call it, replacing the two independent, narrower stubs
(`effectiveRightsCacheLoaderStub`, `reviewServiceCacheLoaderStub`) this plan and Phase 137's
plan each introduced ad hoc.
