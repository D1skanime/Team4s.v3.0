---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 11
subsystem: testing
tags: [go, postgres, testify, gin, httptest, release-version-media, teststil]

# Dependency graph
requires:
  - phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring- (146-01, 146-02, 146-03)
    provides: registry self-protection fixes (Criteria 1-4) that Block 2's remediation builds on top of
provides:
  - release_version_media_repository_test.go with all 14 os.ReadFile source-substring assertions replaced by real Postgres/httptest execution
  - extended openReleaseVersionMediaReplaceFixture (caption/sort_order/media_files.path+status/BIGSERIAL id) reusable by future sibling tests in this fixture family
  - a documented, reusable workaround pattern (external `repository_test` package in the same directory) for the repository<->services/handlers import-cycle blocking real-execution test remediation
affects: [146-12, 146-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "External test package (`package repository_test`) in the same directory as `package repository` to import services/handlers without an import cycle, while staying discoverable via `go test ./internal/repository/...`"
    - "Platform-admin actor identity to bypass permissions.Resolver complexity when a test's real claim is orthogonal to who is authorized (handler-behavior default-value proofs)"

key-files:
  created:
    - backend/internal/repository/release_version_media_cross_package_test.go
    - backend/internal/handlers/member_media_upload_defaults_test.go
  modified:
    - backend/internal/repository/release_version_media_repository_test.go
    - backend/internal/repository/release_version_media_replace_repository_test.go

key-decisions:
  - "10 of 14 remediated functions stay in release_version_media_repository_test.go (package repository); 3 handler-behavior functions relocate to a new external-test-package file in the same directory (repository_test) rather than an internal one, to avoid a real Go import cycle discovered empirically during implementation"
  - "1 function (member_media_upload.go's Lock-I claim) relocates to package handlers instead, since the two functions it must call are unexported with zero production call sites"
  - "Shared fixture openReleaseVersionMediaReplaceFixture extended with columns present in the real production schema but missing from the fixture (caption, sort_order, media_files.path/status, BIGSERIAL id) — a pre-existing gap only surfaced because this plan is the first to exercise ListReleaseVersionMedia/UpdateMediaFileStatusRVMTx/CreateReleaseVersionMediaAsset against it"

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: ~3h
completed: 2026-09-04
---

# Phase 146 Plan 11: release_version_media_repository_test.go Remediation Summary

**All 14 os.ReadFile source-substring assertions in the largest Block-2 file replaced with real Postgres/httptest execution, uncovering and fixing 4 genuine pre-existing gaps in the shared test fixture along the way.**

## Performance

- **Duration:** ~3h (heavy Go-package-graph investigation: two independent import-cycle discoveries plus four schema-gap discoveries, each requiring empirical verification against the real container before a fix could be trusted)
- **Tasks:** 3 (as planned)
- **Files modified:** 4 (2 modified, 2 created)

## Accomplishments
- Zero `os.ReadFile` calls remain in `release_version_media_repository_test.go` (`grep -c` confirms 0), matching Task 3's acceptance criterion exactly.
- All 14 original claims now execute real code: 10 repository-layer functions run against real Postgres inside `package repository`; 3 handler-behavior functions run real `httptest` calls into the actual `FansubHandler`/`AdminContentHandler` methods; 1 function calls the real (previously dead-code) `applyBrandingDefaults`/`applyProzessmedienDefaults` functions directly.
- Fixed 4 real schema gaps in the shared `openReleaseVersionMediaReplaceFixture` fixture (used by 3 pre-existing sibling test files) that were latent because no prior test ever called `ListReleaseVersionMedia`, `UpdateMediaFileStatusRVMTx`, or relied on an auto-generated `release_version_media.id` against it.
- Empirically proved and documented a hard Go import-cycle constraint (`repository` <-> `services`/`handlers`) that blocks calling either package from an internal (`package repository`) test file — confirmed via `go test`, not assumed — and established the `repository_test` external-package workaround as the reusable pattern for any future Block-2 file with the same shape.

## Task Commits

1. **Task 1 + Task 2: repository-layer read/query and mutation claims** - `0e2aac74` (test)
2. **Task 3: 3 misplaced handler-behavior claims** - `ff2889f3` (test)

**Plan metadata:** (this commit)

## Files Created/Modified
- `backend/internal/repository/release_version_media_repository_test.go` — 10 of 14 functions rewritten as real Postgres proofs; 4 unchanged compile-time signature checks kept; 4 functions removed (relocated, see below).
- `backend/internal/repository/release_version_media_replace_repository_test.go` — shared `openReleaseVersionMediaReplaceFixture` extended with `caption`/`sort_order` on `release_version_media`, `path`/`status` on `media_files`, and `BIGSERIAL` (was `BIGINT`) on `release_version_media.id`.
- `backend/internal/repository/release_version_media_cross_package_test.go` (new) — `package repository_test`; 3 relocated functions plus a shared fixture (`openRVMCrossPackageFixture`) covering the release-version-media schema, contributor-group resolution chain, and fansub branding columns.
- `backend/internal/handlers/member_media_upload_defaults_test.go` (new) — `package handlers`; the 1 relocated function.

## Decisions Made

1. **Split the file's remediation across 3 files instead of 1, deviating from the plan's literal "these 3 functions... remain in this file" instruction.** The plan's constraint was written assuming real handler execution could happen from within `package repository` — this turned out to be a hard Go language impossibility (import cycle), verified empirically (see Issues Encountered). The chosen resolution honors the *intent* of the constraint (don't touch any existing `internal/handlers/*_test.go` file, stay within the same package/directory scope wherever possible) while resolving the cycle: 3 of 4 relocated functions live in a NEW file in the SAME `internal/repository/` directory (external test package, still discovered by `go test ./internal/repository/...` exactly as the plan's verify commands specify); only the 4th (needing unexported symbols) moves to `internal/handlers/`.
2. **Extended the shared fixture rather than building a second one**, per the plan's explicit "reuse the fixture identified in Task 1 (do not create a second one)" instruction for Task 2. The 4 schema gaps found were pre-existing and latent, not something my new tests introduced incorrectly — they were simply never exercised by the fixture's prior consumers.
3. **Used platform-admin actor identities instead of building a complete role->action capability-cache stub** for the 2 relocated handler tests. `permissions`' package-level `loadedCache` is fail-closed (nil) unless something calls `Service.LoadCache` with a map satisfying a whole-catalog consistency check (`validateCapabilityCatalog`); building/maintaining that full ~40-action stub map was unnecessary scope for proving an orthogonal claim (visibility/review-status defaults), and platform-admin identities correctly bypass the resolver entirely per the handlers' own permission-check code path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Go import cycle prevents real handler/service execution from inside `package repository`**
- **Found during:** Task 3 (attempting `TestFansubMediaUploadHandler_BrandingDefaults`/`TestRVMHandler_ProzessmedienDefaults`/`TestReleaseVersionMedia_CleanupServicePassesExist`)
- **Issue:** Both `internal/services` and `internal/handlers` import `internal/repository`. An internal (`package repository`) test file importing either produces a real compile-time cycle. Verified empirically via two scratch probe files and `go test` (not `go vet`, which did not catch it): `imports team4s.v3/backend/internal/services from a package-repository test file / imports team4s.v3/backend/internal/repository from services: import cycle not allowed in test` (and the identical shape for `handlers`).
- **Fix:** Relocated the 3 affected functions to a new file `release_version_media_cross_package_test.go` declared `package repository_test` (Go's external-test-package convention) in the SAME `internal/repository/` directory — confirmed via the same probe methodology that `package repository_test` files in this directory CAN import `handlers`/`services` without a cycle, and ARE discovered by `go test ./internal/repository/...`.
- **Files modified:** `backend/internal/repository/release_version_media_cross_package_test.go` (new)
- **Verification:** `go test ./internal/repository/... -run "TestFansubMediaUploadHandler_BrandingDefaults|TestRVMHandler_ProzessmedienDefaults|TestReleaseVersionMedia_CleanupServicePassesExist" -v` — 3/3 PASS
- **Committed in:** `ff2889f3`

**2. [Rule 3 - Blocking] `member_media_upload.go`'s claims need unexported-symbol access unreachable from `repository_test`**
- **Found during:** Task 3 (`TestMemberMediaHandler_LockI_OwnerFromSession`)
- **Issue:** `applyBrandingDefaults`/`applyProzessmedienDefaults` in `member_media_upload.go` are unexported, pure functions with NO exported call site anywhere in the codebase (confirmed via repo-wide grep) — they cannot be constructed-around via an exported constructor the way `FansubHandler`/`AdminContentHandler` could (`WithMedia`/`WithMediaDeps`).
- **Fix:** Relocated this 1 function to a new file `internal/handlers/member_media_upload_defaults_test.go` (`package handlers`), calling both functions directly (real execution) plus retaining the CLAUDE.md-exempt `os.ReadFile`-based absence check for `owner_member_id`.
- **Files modified:** `backend/internal/handlers/member_media_upload_defaults_test.go` (new)
- **Verification:** `go test ./internal/handlers/... -run TestMemberMediaHandler_LockI_OwnerFromSession -v` — PASS
- **Committed in:** `ff2889f3`

**3. [Rule 1 - Bug] Shared fixture's `release_version_media`/`media_files` tables missing columns the production schema has**
- **Found during:** Task 1 (`TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle` — `column rvm.caption does not exist`) and Task 2 (`TestReleaseVersionMedia_UploadTransactionContract` — `column "status" of relation "media_files" does not exist`; `TestReleaseVersionMedia_PartialFailureIsolation` — `null value in column "id"`; `TestCreateMediaAsset_SubSelectVisibilityOnInput` — `column "media_type_id" of relation "media_assets" does not exist`)
- **Issue:** `openReleaseVersionMediaReplaceFixture` (in the pre-existing, non-146-11-scoped `release_version_media_replace_repository_test.go`) was built minimally for its own tests' needs and never exercised `ListReleaseVersionMedia`, `UpdateMediaFileStatusRVMTx`, or an auto-generated `release_version_media.id` — this plan is the first consumer to do so, surfacing 3 real gaps against the production schema.
- **Fix:** Added `caption TEXT NULL` and changed `id BIGINT PRIMARY KEY` to `id BIGSERIAL PRIMARY KEY` on `release_version_media`; added `path TEXT NOT NULL DEFAULT ''` and `status TEXT NOT NULL DEFAULT 'ready'` on `media_files` — all backward-compatible additions (existing explicit-value INSERTs in sibling tests unaffected). `media_assets`' missing `CreateMediaAsset`-only columns (`media_type_id`, `file_path`, `mime_type`, `format`, `created_at`) were instead added locally inside `TestCreateMediaAsset_SubSelectVisibilityOnInput` itself (not the shared fixture), since no other test in the family needs the full production `media_assets` shape.
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`, `backend/internal/repository/release_version_media_repository_test.go`
- **Verification:** Re-ran the 5 sibling tests already using this fixture (`TestReleaseVersionMediaReplaceFile*`, `TestGetReleaseVersionMediaRelationReturnsCurrentPreviewCandidate`) plus `TestHardDeleteRVMAndAssetRemovesLifecycleRow` (a different file, same fixture family) — all still PASS after the schema extension.
- **Committed in:** `0e2aac74`

**4. [Rule 1 - Bug] Test's own asset-ID reuse collided with a pre-existing fixture row**
- **Found during:** Task 2 (`TestReleaseVersionMedia_PartialFailureIsolation`)
- **Issue:** My first draft reused `media_asset_id` 703 for the "failed" file — but the base fixture already attaches asset 703 to relation 602 (a pre-existing control row), so the post-rollback assertion (`COUNT(*) WHERE media_asset_id = 703`) matched that pre-existing row instead of proving isolation of the newly-attempted, rolled-back one.
- **Fix:** Seeded two fresh, test-local assets (710/711) not used anywhere else in the fixture.
- **Files modified:** `backend/internal/repository/release_version_media_repository_test.go`
- **Verification:** Re-ran — PASS.
- **Committed in:** `0e2aac74`

---

**Total deviations:** 4 auto-fixed (2 blocking/architectural workarounds, 2 bugs — 1 shared-fixture gap, 1 test-authoring bug)
**Impact on plan:** All 4 were necessary to deliver genuine real-execution proofs (the plan's actual Criterion 5/6 goal); no production code was touched by any of them. The 2 architectural workarounds are documented above and in-code so future Block-2 plans hitting the same import-cycle shape don't have to re-derive the fix from scratch.

## Issues Encountered

- **Postgres connections left `idle in transaction (aborted)` after a test's `require.NoError` failed mid-transaction without a deferred rollback**, blocking that schema's later cleanup for several minutes and making `go test` appear hung (0% CPU, not actually compiling). Root-caused via `pg_stat_activity` on the container's Postgres directly, not from `go test` output alone. Fixed by adding `defer tx.Rollback(ctx)` safety nets after every `pool.Begin(ctx)` in the remediated file (mirrors the existing `defer tx.Rollback(ctx) //nolint:errcheck` pattern already used elsewhere in this package, e.g. `release_version_media_replace_repository_test.go`'s `replaceFile` helper).
- **A full, unscoped `go test ./internal/repository/...` run (no `-run` filter, done as an extra diligence pass beyond the plan's own verification commands) hit a similar hang in an unrelated, pre-existing test** (a `user_group_capability_overrides` query, not touched by this plan). This is out of this plan's scope per the Scope Boundary rule (only auto-fix issues directly caused by this plan's changes) — logged here rather than fixed. All of Task 1/2/3's own targeted verification commands, which ARE this plan's actual acceptance criteria, passed cleanly.
- `docker compose exec` runs against the LIVE container image (`docker compose watch` background sync), not a bind mount — file edits take up to a few seconds to propagate before `go build`/`go test` see them; verified with a short poll loop each time rather than assumed instant.

## User Setup Required

None - no external service configuration required. Verification used the project's existing `team4sv30-db` container and an already-provisioned `team4s_phase107_test_p144` database (via `TEAM4S_PHASE107_TEST_DSN`, SKIP-not-FAIL convention if unset) — no new infrastructure.

## Next Phase Readiness

- `release_version_media_repository_test.go` is fully compliant with CLAUDE.md's Teststil-Regel — 0 `os.ReadFile` calls, all behavioral claims proven by real execution.
- The `repository_test` external-package-in-same-directory pattern (Deviation 1) is now a documented precedent for Plan 146-12/146-13 if any remaining Block-2 file has handler/service-behavior claims misplaced in a repository (or vice versa) test file.
- Plan 146-13's ratchet-guard file (Criterion 7 scanner) should be able to drop this file from its still-unremediated exception list once that plan runs.

## Self-Check: PASSED

All created/modified files verified present on disk; all 3 task commit hashes (`0e2aac74`, `ff2889f3`, `6441cbf1`) verified present in `git log`.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*
