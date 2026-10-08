---
phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-
plan: 09
subsystem: testing
tags: [postgres, migrations, permissions, review-lifecycle, release-version-media, go]

requires:
  - phase: 176-05
    provides: earlier D-series fixes in this bug/debt collection phase
  - phase: 176-06
    provides: earlier D-series fixes in this bug/debt collection phase
provides:
  - "testsupport.OpenPhase107Postgres provisions real capability-registry schema (role_definitions, action_definitions, role_capabilities, user_group_capability_overrides, user_group_capability_override_history) via the real migration chain instead of hand-rolled stubs"
  - "ReleaseReviewLifecycleRepository.CheckMediaRevisionConflict: revision-conflict-only guard for non-uploader release-media metadata edits"
  - "PatchReleaseVersionMedia returns 409 SOURCE_REVISION_CONFLICT for stale non-uploader edits without reopening review"
affects: [release-version-media, review-service, authz, capability-registry-tests]

tech-stack:
  added: []
  patterns:
    - "Phase-NNN disposable-Postgres test fixtures should run the real, narrowly-scoped migration slice for shared schema (role_capabilities/action_definitions/etc.) rather than hand-rolling stub tables, mirroring phase137_postgres.go's precedent"
    - "permissions.loadedCache (package-level role->action cache) must be explicitly loaded per test file via a scoped CacheLoader stub; never assume an unrelated test file's LoadCache call will still be in effect when filtering by -run"

key-files:
  created:
    - backend/internal/repository/release_review_lifecycle_revision_guard.go
  modified:
    - backend/internal/testsupport/phase107_postgres.go
    - backend/internal/services/review_service_test.go
    - backend/internal/services/release_review_submission_test.go
    - backend/internal/repository/release_review_query_repository_test.go
    - backend/internal/repository/authz_permissions_test.go
    - backend/internal/handlers/admin_content_release_version_media_patch.go
    - backend/internal/handlers/admin_content_release_version_media_test.go

key-decisions:
  - "Extended phase107_postgres.go with the SAME migration slice phase137_postgres.go already uses (0085/0100/0108/0112/0146/0150), not the full migration history -- additive schema extension, not a rebuild of the hand-rolled identity tables 21+ consumers depend on"
  - "Did not pre-seed review.*.decide role grants in the base fixture (would require running migration 0134 itself, which many consumers already apply separately and would then double-apply) -- left review-action role grants to each consumer's own 0134 ApplySQLFile call, matching existing precedent"
  - "Revision-conflict check for non-uploader edits is a read-only guard (CheckMediaRevisionConflict), not a reuse of SubmitMedia -- preserves BUG-174-04's Option-1 decision that non-uploader metadata edits never reopen review"
  - "The check only activates when the client sends source_revision; the frontend already always sends it for title/caption/category edits, so no real client loses protection, and no caller that omits it is newly blocked"

requirements-completed: []

duration: ~95min
completed: 2026-10-08
---

# Phase 176 Plan 09: Phase-107 Fixture Schema + Non-Uploader Revision Protection Summary

**Extended the Phase-107 Postgres test fixture with the real capability-registry migration chain (closing a 10-minute pgxpool-hang bug and the two named D-06 capability-denial failures), and added a revision-conflict guard that restores optimistic-concurrency protection for non-uploader release-media metadata edits.**

## Performance

- **Duration:** ~95 min
- **Completed:** 2026-10-08
- **Tasks:** 2 completed
- **Files modified:** 7 (+ 1 created)

## Accomplishments

- `testsupport.OpenPhase107Postgres` now runs the real `0085/0100/0108/0112/0146/0150` migration chain (mirroring `phase137_postgres.go`'s precedent) instead of hand-rolled, empty `action_definitions`/`role_definitions`/`role_capabilities` stub tables — closing D-06's documented schema gap and fixing a previously-undiagnosed 10-minute `pgxpool.Close()` hang in `internal/repository`'s test suite that the missing-table error was triggering.
- Found and fixed the actual second-layer root cause of the two named failing tests (`TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit`, `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder`): `permissions.loadedCache` (the package-level role→action cache) was never loaded by these specific tests, only by an unrelated test in the same file that the `-run` filter excludes. Added the missing `ensureReviewServicePermissionsCacheLoaded(t)` calls and completed the stale stub (it predated two newer `permissions.Action` constants, which tripped `LoadCache`'s D-10 completeness check the moment it was actually exercised).
- Closed D-06's second clause (F-14 "Folgehinweis" to BUG-174-04): non-uploader metadata edits on release media had zero revision-conflict protection (optimistic concurrency), even though the frontend always sends `source_revision`. Added `ReleaseReviewLifecycleRepository.CheckMediaRevisionConflict` and wired it into `PatchReleaseVersionMedia`'s non-uploader branch — a stale non-uploader edit is now rejected with the same `409 SOURCE_REVISION_CONFLICT` shape the uploader path already used, without reopening review (BUG-174-04's Option-1 decision stays intact).
- Along the way, fixed two of D-06's named "8 RVM-Handler-Tests" that were blocked by an unrelated, pre-existing local-fixture schema gap (`openRVMExecFixture` was missing `app_users.display_name`/`preferred_username`, `users.username`, and the entire `release_version_story_order`/`theme_segment_assignments`/`theme_segments` schema) and a latent test-logic bug in `TestReleaseVersionMedia_ReorderRequiresVersionOwnership`'s cross-version subtest (it could never reach the ownership-mismatch path because of an earlier length guard).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend phase107_postgres.go with the real capability-registry migration chain** - `5d37cd85` (fix)
2. **Task 2: Verify the non-uploader revision-protection check on release-media metadata edits (D-06's second clause)** - `57107f95` (fix)

_No separate plan-metadata commit requested by the orchestrator for this execution; this SUMMARY.md + STATE.md/ROADMAP.md update is captured in the final docs commit._

## Files Created/Modified

- `backend/internal/testsupport/phase107_postgres.go` - Replaced hand-rolled `action_definitions`/`role_definitions`/`role_capabilities` stub with the real `0085/0100/0108/0112/0146/0150` migration chain (plus the `hist_group_member_roles` stand-in migration 0085 needs), provisioning `user_group_capability_overrides`/`user_group_capability_override_history` for the first time.
- `backend/internal/services/review_service_test.go` - Removed the now-redundant local `user_group_capability_overrides` stand-in table; fixed the stale `reviewServiceCacheLoaderStub` (added `ActionReleaseVersionMediaReorder`/`ActionReleaseVersionMediaHighlight`, and granted `RoleFansubLead` the three `review.*.decide` actions matching migration 0134's real seed); added the missing `ensureReviewServicePermissionsCacheLoaded(t)` call to every test that authorizes via a plain `fansub_lead` role grant.
- `backend/internal/services/release_review_submission_test.go` - Added the same `ensureReviewServicePermissionsCacheLoaded(t)` call to the shared `openReleaseReviewSubmissionFixture`, fixing the whole family of downstream release-review cleanup/concurrency/decision tests that depend on it.
- `backend/internal/repository/release_review_query_repository_test.go` - Removed the now-redundant local `user_group_capability_overrides` stand-in table in `TestPhase141RevokedDelegationImmediateEffect`.
- `backend/internal/repository/authz_permissions_test.go` - Changed `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase`'s exact-match role-capability assertion to `assert.Subset` (fansub_lead legitimately carries more real grants now); added a dedicated, self-contained cache-loading stub so the test no longer depends on unrelated test-file ordering.
- `backend/internal/repository/release_review_lifecycle_revision_guard.go` *(new)* - `CheckMediaRevisionConflict`: locks the lifecycle row and compares the caller's `expectedRevision` against the current `source_revision`, returning `ErrConflict` on mismatch without mutating revision or review state.
- `backend/internal/handlers/admin_content_release_version_media_patch.go` - Wired `CheckMediaRevisionConflict` into the non-uploader branch of `PatchReleaseVersionMedia`, returning `409 SOURCE_REVISION_CONFLICT` on a stale revision.
- `backend/internal/handlers/admin_content_release_version_media_test.go` - Added `TestPatchReleaseVersionMediaNonUploaderRevisionConflictProtection`; extended `openRVMExecFixture` with `app_users.display_name`/`preferred_username`, `users.username`, and the `release_version_story_order`/`theme_segment_assignments`/`theme_segments` schema; fixed `TestReleaseVersionMedia_ReorderRequiresVersionOwnership`'s cross-version subtest (isolated fixture pool per subtest, seeded a matching-length story order first).

## Decisions Made

- Mirrored `phase137_postgres.go`'s exact migration slice (`0085/0100/0108/0112/0146/0150`) rather than the full migration history or a wider slice — matches the plan's documented interface analog and avoids pulling in unrelated tables (`anime_contribution_roles`, `fansub_group_media`, `release_playback_entitlement_rules`, etc.) the hand-rolled identity tables don't have.
- Left `review.*.decide` role grants out of the base fixture's migration chain. Seeding them would require running migration 0134 itself inside the base fixture, but several consumers (`review_service_test.go`, `release_review_submission_test.go`, `authz_permissions_test.go`) already apply 0134 themselves afterward — running it twice would hit "relation already exists" on 0134's own `CREATE TABLE` statements. Consumers that need `fansub_lead → review.*.decide` already get it from their own 0134 application (migration 0134 itself grants those three rows to `fansub_lead`) or load their own cache stub.
- `CheckMediaRevisionConflict` is a brand-new, read-only method rather than a repurposing of `SubmitMedia`/`ResubmitMediaKeepingSubmitter` — both of those mutate revision/review_state, which BUG-174-04's user decision (Option 1) explicitly forbids for non-uploader metadata edits.
- The new conflict check only fires when the client supplies `source_revision`. The real frontend (`useReleaseVersionMedia`) already always sends it for title/caption/category PATCH calls, so this closes the gap for every real client without newly blocking any backend caller that omits it (matching the pre-existing opt-in behavior of the uploader path for a medium with no lifecycle row yet).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `review_service_test.go`'s role-capability cache was never loaded for several tests it names as D-06 subjects**
- **Found during:** Task 1, live-reproducing the plan's documented failure command
- **Issue:** `permissions.loadedCache` (package-level) was populated only by `TestPhase141ReviewDecisionRemainsAuthoritativeUnderConcurrentRevoke`'s `ensureReviewServicePermissionsCacheLoaded(t)` call — a test the `-run 'TestPhase107...'` filter the plan documents excludes. Without it, `GrantDelegation`/`RevokeDelegation`/`Decide` calls from a plain `fansub_lead` actor always evaluated `review capability denied`, independent of the schema fix.
- **Fix:** Added `ensureReviewServicePermissionsCacheLoaded(t)` to every `review_service_test.go` test that authorizes via a role grant (not platform-admin bypass, not a prior specialized delegation grant): `TestPhase107ReviewServiceGrantRevokeDelegationNoOpAudit`, `TestPhase107ReviewServiceDelegationRollbackOnMandatoryAuditFailure`, `TestPhase107ReviewServiceRejectValidationAndSelfReview`, `TestPhase107ReviewServiceFirstDecisionWinsConcurrent`, `TestPhase107ReviewServiceGrantRevokeDecisionLockOrder`, `TestPhase107ReviewServiceCreditSlotsAcrossRevisionsAndIndependentSources`. Also completed the stub's action coverage (it predated `ActionReleaseVersionMediaReorder`/`ActionReleaseVersionMediaHighlight`, tripping `LoadCache`'s D-10 completeness check) and added the `review.*.decide` grants to `RoleFansubLead` in the stub.
- **Files modified:** `backend/internal/services/review_service_test.go`, `backend/internal/services/release_review_submission_test.go`
- **Verification:** Both named tests pass in isolation; `go test ./internal/services/...` (full, unfiltered) shows only one remaining failure, confirmed pre-existing and unrelated (see Known Pre-Existing Issues below).
- **Committed in:** `5d37cd85`

**2. [Rule 3 - Blocking] Duplicate `user_group_capability_overrides` table creation after the schema fix**
- **Found during:** Task 1, after extending `phase107_postgres.go`
- **Issue:** `review_service_test.go` and `release_review_query_repository_test.go` each hand-rolled their own local `user_group_capability_overrides` stand-in table (added ad hoc in Plan 141-01 to work around the exact gap this plan now fixes at the source). After the fixture fix, these local tables collided with the one `OpenPhase107Postgres` now creates (`relation "user_group_capability_overrides" already exists`).
- **Fix:** Removed both local stand-in tables; the fixture's own table (real migration-0146 shape) is a superset-compatible schema for both consumers' queries.
- **Files modified:** `backend/internal/services/review_service_test.go`, `backend/internal/repository/release_review_query_repository_test.go`
- **Committed in:** `5d37cd85`

**3. [Rule 1 - Bug] `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase`'s exact-match assertion and missing cache load**
- **Found during:** Task 1, running the full acceptance command across all five packages
- **Issue:** This test asserted `capabilities[RoleFansubLead]` equals exactly the three review actions — true only because the OLD hand-rolled fixture had zero pre-existing `role_capabilities` rows. With the real migration seed, `fansub_lead` legitimately carries ~16 more grants. The test also never loaded `permissions.loadedCache` itself, instead silently depending on the SQL error (now fixed) having always short-circuited the test before reaching the `CanReviewForFansubGroup` call that needs it.
- **Fix:** Changed the assertion to `assert.Subset`; added a dedicated `authzRepositoryReviewCapabilityCacheLoaderStub` (including `ActionFansubGroupMembersManage`, after discovering the first version of this stub silently broke `fansub_group_app_members_repository_test.go`'s `TestEvaluateMemberMutationConflictBlocksLastActiveManager` by omitting it from `RoleFansubLead`'s grants — `LoadCache` replaces the package-level cache wholesale for every subsequent test in the binary).
- **Files modified:** `backend/internal/repository/authz_permissions_test.go`
- **Committed in:** `5d37cd85`

**4. [Rule 1 - Bug] `openRVMExecFixture` missing `app_users.display_name`/`preferred_username`/`users.username` and the entire story-order schema**
- **Found during:** Task 2, running the new revision-protection test's happy path and the broader RVM acceptance command
- **Issue:** `ListReleaseVersionMedia`'s uploader-identity projection queries `au.display_name`/`au.preferred_username`/`uploader.username`; `ReorderReleaseVersionMedia`/the list handler's story-order path queries `release_version_story_order`/`theme_segment_assignments`/`theme_segments`. None of these existed in `openRVMExecFixture`, so every successful PATCH/reorder/list call in this file failed with `db_schema_mismatch` — confirmed pre-existing (same failure in the unmodified baseline) and matching the "8 vorbestehend rot" RVM-handler tests named in 174-BUGS.md/F-14.
- **Fix:** Added the missing columns and a minimal (zero-row) version of the real migration-0141/0174 schema.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** `go test ./internal/handlers/... -run "ReleaseVersionMedia|RVM"` is fully green; full `./internal/handlers/...` run shows no RVM-related failures.
- **Committed in:** `57107f95`

**5. [Rule 1 - Bug] `TestReleaseVersionMedia_ReorderRequiresVersionOwnership`'s cross-version subtest could never reach the code path it claimed to test**
- **Found during:** Task 2, after fixing #4 above and reaching real reorder logic for the first time
- **Issue:** `ReorderReleaseVersionStoryOrder` requires the submitted item list to match the release version's current story-order length before it checks per-item ownership. The subtest submitted one foreign-relation item against an otherwise-empty version 41, so it always hit the "complete list required" (409) guard, never the ownership-mismatch (404) path it asserted on. This was invisible before because the whole test previously failed at the schema layer first (#4).
- **Fix:** Upload one real item to version 41 first (making the submitted list's length match), then submit the foreign relation id in its place — genuinely exercises the per-item ownership check. Gave each subtest its own isolated fixture pool to avoid state leaking between them.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Committed in:** `57107f95`

---

**Total deviations:** 5 auto-fixed (3 Rule 1, 1 Rule 1, 1 Rule 3 — all either bug fixes revealed by this plan's own schema fix or blocking issues it directly caused).
**Impact on plan:** All auto-fixes were necessary to reach the plan's own acceptance criteria (the named tests, the full `TestPhase107` suite, and the RVM handler suite all green) or were directly caused by this plan's schema extension (duplicate-table conflicts). No unrelated scope creep.

## Issues Encountered

- **Root-cause misdiagnosis in the plan's own framing:** the plan describes D-06 as a pure schema gap, but live reproduction showed the two named tests' failure is actually caused by TWO independent, stacked gaps: (1) the missing `user_group_capability_overrides` table (the documented schema gap) and (2) `permissions.loadedCache` never being loaded for those specific tests (a separate, pre-existing test-infrastructure fragility: the package-level cache is populated by file-scoped stubs, and filtering tests by name can skip the test that happens to load it). Fixing only (1) left the two named tests still failing with "review capability denied"; both had to be fixed together.
- **Investigated and intentionally did NOT fully resolve:** a handful of `TestPhase107ReviewService*`-adjacent tests needing `fansub_lead → review.*.decide` as a ROLE grant (not a specialized delegation grant) only pass once their OWN file applies migration 0134 (which seeds those grants) — this is already the existing, correct pattern; no fixture change was needed for them once the cache-loading gap above was fixed.

## Known Pre-Existing Issues (confirmed out of scope, not touched)

Confirmed via git-stash before/after comparison against the unmodified baseline — these already fail identically without any change from this plan:

- `TestPhase137EffectiveRightsOverrideMutationConcurrentConflictSerializes` (`internal/services`) — `effective_rights_service_test.go`'s own stale `effectiveRightsCacheLoaderStub` (missing `ActionReleaseVersionMediaReorder`), unrelated to `OpenPhase107Postgres`/`OpenPhase137Postgres`'s fixture.
- `TestPhase141RevokedDelegationImmediateEffect` (`internal/repository`) — `release_review_query_repository_test.go`'s own stale `releaseReviewDelegationCacheLoader` (same missing action); the cache-load call happens before the fixture even opens, so this plan's fix cannot reach it.
- `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`, `TestReleaseVersionMedia_ListAllowsOrdinaryRowsWithoutHighlight`, `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`, `TestReleaseVersionMediaHighlightsAreIndependentFromPreview`, `TestRVMHandler_ProzessmedienDefaults` (`internal/repository`) — a different local fixture (`release_version_media_repository_test.go`'s own setup, not `openRVMExecFixture`) has the same missing `au.display_name` column plus an unrelated handler nil-pointer panic; out of this plan's `backend/internal/handlers` scope for Task 2 (which only covers `admin_content_release_version_media_test.go`/`admin_content_release_version_media_replace_test.go`).
- `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource`, `Test11eyesSourceSelection_AllActualItemsAndPermutations`, `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` (`internal/handlers`) — missing `docs/audits/2026-09-15-jellyfin12/fixtures/*.json` files on this environment; environmental, unrelated to Phase-107/RVM.

These remain legitimate follow-up candidates but are outside this plan's `backend/internal/testsupport/phase107_postgres.go` + named-RVM-test scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- D-06 is closed: both documented clauses (Phase-107 fixture schema; non-uploader revision protection) are fixed and verified against live Postgres.
- The capability-registry migration chain in `phase107_postgres.go` is now a stable base other Phase-107 consumers can build on without re-discovering the `user_group_capability_overrides` gap.
- Follow-up candidate (not blocking, listed above): a dedicated cleanup pass across `internal/services`/`internal/repository` test files to replace file-scoped, order-dependent `permissions.loadedCache` stubs with a single, complete, shared stub — the fragility pattern this plan worked around twice (review_service_test.go, authz_permissions_test.go) is systemic, not local to Phase-107.

---
*Phase: 176-bug-und-altlasten-sammelphase-offene-174-followups-f-02-out-*
*Completed: 2026-10-08*

## Self-Check: PASSED

- All 8 files listed under "Files Created/Modified" verified present on disk.
- Both task commits (`5d37cd85`, `57107f95`) verified present in `git log --oneline --all`.
- No missing items.
