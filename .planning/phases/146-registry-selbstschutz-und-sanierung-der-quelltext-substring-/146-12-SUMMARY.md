---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 12
subsystem: testing
tags: [go, postgres, testify, gin, httptest, release-version-media, teststil]

# Dependency graph
requires:
  - phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring- (146-01, 146-02, 146-03)
    provides: registry self-protection fixes (Criteria 1-4) that Block 2's remediation builds on top of
  - phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring- (146-11)
    provides: the openReplaceRVMHandlerFixture/replaceRVMContext/releaseVersionMediaDeniedResolverStub
      real-Postgres handler-test pattern this plan reuses unchanged, and the empirically-verified
      cache-fail-closed constraint (permissions.loadedCache) that shaped this plan's platform-admin
      vs. denied-actor test design
provides:
  - admin_content_release_version_media_test.go with all 17 os.ReadFile source-substring assertions
    replaced by real httptest execution against the real AdminContentHandler, backed by a new,
    shared, real Postgres fixture (openRVMExecFixture)
  - the openRVMExecFixture/rvmExecUploadOne/newRVMExecHandler helper family, reusable by any future
    sibling test needing a clean, fully-wired release_version_media upload/patch/delete/reorder
    scenario in this same test file
affects: [146-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-admin actor identity for ALLOW-path proofs, genuine no-membership outsider identity
      for DENY-path proofs — avoids depending on permissions.loadedCache (package-private,
      fail-closed/nil in this test binary), extending 146-11's documented precedent"
    - "DB-level mid-transaction fault injection via an id-preserving UPDATE (renaming a lookup row,
      not deleting it) to prove real transactional rollback without violating an existing FK from a
      fixture's other rows"
    - "Directly calling the real, shared, pure decision-core function
      (evaluateReleaseVersionMediaRelationMutation) both canMutateReleaseVersionMediaRelation and
      ReorderReleaseVersionMedia delegate to, as a targeted proof for a permission branch otherwise
      unreachable without populating the full capability cache"

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_release_version_media_test.go

key-decisions:
  - "All 17 remediated functions share ONE new fixture (openRVMExecFixture) and helper family
    (rvmExecPlatformAdminIdentity/rvmExecOutsiderIdentity/rvmUploadMultipartRequest/rvmExecUploadOne/
    newRVMExecHandler) added to the same file, rather than a second file — no Go import-cycle
    forced relocation here (both the test and the handler already live in package handlers), unlike
    146-11's repository-package cycle"
  - "Where a claim required a genuinely-ALLOWED, role-specific (non-admin, non-owner) contributor
    grant — the ALLOW branch of the contributor-group mutation guard — the test proves it by
    directly calling the real, shared pure decision function
    (evaluateReleaseVersionMediaRelationMutation) instead of populating permissions.loadedCache via
    a full role->action capability map, mirroring 146-11's documented 'unnecessary scope' precedent
    for the identical constraint"
  - "TestReleaseVersionMedia_BrokenUploadCannotLeaveReadyStatus injects its mid-transaction DB
    failure via UPDATE media_types SET name='image_broken' (not DELETE) because
    openRVMExecFixture's pre-seeded foreign relation (for the reorder-ownership test) already holds
    a real FK to that row — an id-preserving rename avoids that collision while still making the
    CreateMediaAssetWithStatusTx lookup fail"
  - "Single consolidated commit for all 3 tasks (deviating from the usual one-commit-per-task
    protocol) because all three tasks share one fixture/helper block added during Task 1 and
    incrementally exercised by Tasks 2-3; splitting the diff after the fact would have been
    artificial and error-prone with no verification benefit"

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: ~2h30m
completed: 2026-09-04
---

# Phase 146 Plan 12: admin_content_release_version_media_test.go Remediation Summary

**All 17 os.ReadFile source-substring assertions in the second-largest Block-2 file replaced with real httptest execution against the real AdminContentHandler, backed by a new shared Postgres fixture; the file's other 23 already-compliant functions are untouched.**

## Performance

- **Duration:** ~2h30m
- **Tasks:** 3 (as planned)
- **Files modified:** 1

## Accomplishments
- Zero `os.ReadFile(` calls remain in `admin_content_release_version_media_test.go` (`grep -c "os.ReadFile("` confirms 0), matching the plan's Task 3 acceptance criterion exactly.
- All 17 original claims now execute real code against a real, schema-isolated Postgres fixture: 8 existence/permission/category-validation-rejection functions (Task 1), 4 patch/category-change/soft-delete/reorder-ownership functions (Task 2), and 5 upload-constraint/capability-exposure functions (Task 3).
- Built and validated a new, reusable real-Postgres handler-test fixture (`openRVMExecFixture`) — a clean release version with its full contributor-group resolution chain (anime/episodes/fansub_releases/anime_contributions) plus a pre-seeded relation on a *different* release version for the reorder-ownership proof — mirroring 146-08's `openReplaceRVMHandlerFixture` shape exactly.
- Found and fixed 2 real schema gaps in the new fixture during implementation (missing `release_version_media.deleted_by_user_id` column; a `source_revision` conflict from calling `SubmitMedia` twice without the client-supplied expected revision) and 1 fixture FK-collision bug in the mid-transaction fault-injection test — all documented below.
- Full package regression (`go test ./internal/handlers/... -v`) passes with zero failures; `go vet ./...` and `go build ./...` are clean.

## Task Commits

1. **Tasks 1-3 (single consolidated commit — see Decisions Made): all 17 functions + shared fixture** - `57407f95` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_test.go` — 17 of 40 functions rewritten as real httptest proofs against a new shared Postgres fixture; the file's other 23 already-compliant functions (thumbnail generation, MIME/dimension/category constant checks, no-auth 401 checks) are byte-identical to before.

## Decisions Made

1. **All 17 functions and their shared fixture/helper family live in the SAME file**, unlike 146-11's forced cross-file relocation — there is no Go import-cycle here (the test file and the handler it exercises both already live in `package handlers`), so the plan's literal file scope (`files_modified: [admin_content_release_version_media_test.go]`) is honored exactly.
2. **Platform-admin identity for every ALLOW-path proof, a genuine no-membership "outsider" identity for every DENY-path proof.** `permissions.loadedCache` (the role→action capability cache `roleAllows`/`RoleAllowsAction` depend on) is package-private and fail-closed (`nil` → always deny) in this test binary; building a full, valid role→action map via `Service.LoadCache` to exercise a specific non-admin, non-owner ALLOW branch was judged out of proportion to this plan's actual claim (matching 146-11's own documented reasoning for the identical constraint, cited in this plan's `<interfaces>` block).
3. **The contributor-group mutation guard's ALLOW branch is proven by directly calling the real, shared, pure decision function** `evaluateReleaseVersionMediaRelationMutation` (the exact function both `canMutateReleaseVersionMediaRelation` and `ReorderReleaseVersionMedia` delegate to) rather than attempting a cache-populated integration path — this still executes real production code with real inputs, it just isolates the one branch that is otherwise unreachable from an httptest call without the capability cache.
4. **Single consolidated commit for all 3 tasks.** The shared fixture/helper block was added once during Task 1's edit and incrementally exercised — not extended — by Tasks 2 and 3; the git diff for "Task 1 alone" vs. "Task 1+2+3" is not cleanly separable after the fact without reverting and reapplying edits, which would have added risk without any verification benefit. All three tasks' acceptance criteria were independently verified via targeted `-run` test invocations before the final full-package regression.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixture's `release_version_media` table was missing the `deleted_by_user_id` column `SoftDeleteReleaseVersionMedia` writes**
- **Found during:** Task 2 (`TestReleaseVersionMedia_SoftDeleteExcludesFromList`, DELETE returned 500 `db_schema_mismatch`)
- **Issue:** `openRVMExecFixture`'s `release_version_media` table definition omitted `deleted_by_user_id`, a column the real `SoftDeleteReleaseVersionMedia` repository method always writes (`SET deleted_at = NOW(), deleted_by_user_id = ...`).
- **Fix:** Added `deleted_by_user_id BIGINT NULL REFERENCES users(id)` to the fixture's table definition.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** `TestReleaseVersionMedia_SoftDeleteExcludesFromList` — PASS
- **Committed in:** `57407f95`

**2. [Rule 1 - Bug] PATCH requests reaching `SubmitMedia` a second time without an `expectedRevision` genuinely conflict**
- **Found during:** Task 1 (`TestPatchReleaseVersionMediaResponseKeepsActorPermissions`) and Task 2 (`TestPatchReleaseVersionMediaAllowsCategoryChange`) — both returned a real 409 `SOURCE_REVISION_CONFLICT`
- **Issue:** The real upload seed step (`rvmExecUploadOne`) already calls `SubmitMedia` once, creating `source_revision = 1`. A subsequent real PATCH that reaches the same `SubmitMedia` call without a matching `source_revision` in its JSON body is genuinely rejected by `ReleaseReviewLifecycleRepository.submitLifecycle`'s optimistic-concurrency check — this is real, correct production behavior the tests needed to account for, not a bug in the handler.
- **Fix:** Both PATCH request bodies now include `"source_revision":1`, matching the real, known revision left by the seed upload.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** Both tests — PASS
- **Committed in:** `57407f95`

**3. [Rule 1 - Bug] Fault-injection `DELETE` in the broken-upload test violated a real FK from the fixture's own pre-seeded foreign relation**
- **Found during:** Task 2 (`TestReleaseVersionMedia_BrokenUploadCannotLeaveReadyStatus`)
- **Issue:** The test's original fault injection (`DELETE FROM media_types WHERE name = 'image'`) failed with a real FK-violation error, because `openRVMExecFixture`'s pre-seeded foreign relation (added for the reorder-ownership test, relation 9101/asset 9001) already references that exact `media_types` row.
- **Fix:** Switched to an id-preserving `UPDATE media_types SET name = 'image_broken' WHERE name = 'image'` (and the matching restore `UPDATE ... SET name = 'image'`), which still makes `CreateMediaAssetWithStatusTx`'s `SELECT id FROM media_types WHERE name = 'image'` lookup fail (no row matches the renamed value) without touching the `id` column the FK depends on.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** `TestReleaseVersionMedia_BrokenUploadCannotLeaveReadyStatus` — PASS
- **Committed in:** `57407f95`

**4. [Rule 1 - Bug] `readyCount` assertion counted the fixture's own pre-seeded foreign ready row, not just this attempt's effect**
- **Found during:** Task 2 (same test, after fixing Deviation 3)
- **Issue:** `SELECT COUNT(*) FROM media_assets WHERE status = 'ready'` returned 1, not 0 — the fixture's pre-seeded foreign relation (asset 9001) is itself `status = 'ready'` from creation, so the original absolute-zero assertion was wrong given the fixture's own shape, not a real regression.
- **Fix:** Captured a baseline `readyCount` before the fault-injected upload attempt and asserted the post-attempt count is unchanged from that baseline, proving the specific attempt added zero new ready rows.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** Test — PASS
- **Committed in:** `57407f95`

---

**Total deviations:** 4 auto-fixed (all Rule 1 — real schema/behavior gaps or test-authoring bugs surfaced while building genuine real-execution proofs)
**Impact on plan:** All 4 were necessary to deliver working real-execution tests (the plan's actual Criterion 5/6 goal); no production code was touched by any of them.

## Issues Encountered

- No `TEAM4S_PHASE107_TEST_DSN`-backed database existed for this session; provisioned a disposable `team4s_phase107_test_p146` database on the existing `team4sv30-db` Postgres container (`docker compose exec team4sv30-db psql -U team4s -d team4s_v2 -c "CREATE DATABASE team4s_phase107_test_p146;"`), ran all verification against it, then dropped it after the final full-package regression passed — no lasting infrastructure change, consistent with the SKIP-not-FAIL convention when the env var is unset.
- `go` is not on `PATH` in the SSH session's shell; all `go build`/`go vet`/`go test` commands were run via `docker compose exec team4sv30-backend go ...` against the live backend container, matching this repo's canonical Docker-based dev workflow (CLAUDE.md).

## User Setup Required

None — no external service configuration required. Verification used a disposable, self-provisioned test database on the project's existing `team4sv30-db` container; no new persistent infrastructure was left behind.

## Next Phase Readiness

- `admin_content_release_version_media_test.go` is now fully compliant with CLAUDE.md's Teststil-Regel — 0 `os.ReadFile(` calls, all 17 previously-substring-based behavioral claims proven by real execution; the file's other 23 already-compliant functions are unchanged.
- Plan 146-13's ratchet-guard file (Criterion 7 scanner) should be able to drop this file from its still-unremediated exception list once that plan runs.
- The `openRVMExecFixture`/`rvmExecPlatformAdminIdentity`/`rvmExecOutsiderIdentity`/`rvmUploadMultipartRequest`/`rvmExecUploadOne`/`newRVMExecHandler` helper family is now available in-package for any future sibling test needing a clean, fully-wired release-version-media upload/patch/delete/reorder scenario.

## Self-Check: PASSED

All modified files verified present on disk; commit hash `57407f95` verified present in `git log`.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*
