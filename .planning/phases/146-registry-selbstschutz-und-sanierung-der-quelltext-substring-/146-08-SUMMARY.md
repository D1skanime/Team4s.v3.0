---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-
plan: 08
subsystem: testing
tags: [go, gin, postgres, pgx, permissions, testify, media-upload, fansub-notes]

# Dependency graph
requires:
  - phase: 146-04
    provides: the frozen 20-file SecurityRelevantTestFiles list and the presence-vs-absence violation rule this plan remediates against
provides:
  - Real httptest + real-Postgres proofs (no os.ReadFile/strings.Contains source assertions) for 3 of the 20 locked Block-2 files
affects: [146-13 (ratchet-guard file list should shrink by these 3 files)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "actor.IsPlatformAdmin short-circuits permissions.Service.canForContext AND canMutateReleaseVersionMediaRelation before touching the resolver or any contributor-group DB query — the cheapest way to drive a handler test past a permission gate to its real repository call without a working Resolver fixture."
    - "When a handler field is a concrete *repository.XxxRepository (not an interface), the CLAUDE.md Teststil-compliant remediation is a real, schema-isolated Postgres fixture (testsupport.OpenPhaseNNNPostgres) built ad hoc with only the columns the exercised code path touches — not converting the field to an interface (that is an architectural, cross-file change out of a single test-remediation plan's scope)."
    - "A handler whose success path ends in a bare c.Status(code) (no body write) needs c.Writer.WriteHeaderNow() forced explicitly when the handler method is invoked directly (bypassing router.ServeHTTP) — gin only auto-flushes a header-only response at the end of its own request lifecycle."

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_fansub_notes_test.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go
    - backend/internal/handlers/admin_content_release_version_media_replace_test.go

key-decisions:
  - "fansubNotesRepo and mediaRepo are concrete struct types (*repository.FansubNotesRepository, *repository.MediaRepository), not interfaces, so the plan's own recommended 'fake repo' pattern was infeasible for the note/story write paths and the InsertMediaFile/DeleteMediaAsset/ReplaceReleaseVersionMediaFile calls; real, schema-isolated Postgres fixtures (mirroring dashboard_me_handler_test.go's already-established in-package pattern) were substituted instead, without changing any production field types."
  - "Used actor.IsPlatformAdmin=true to bypass permissions.Service's resolver/role-cache entirely for the ALLOW-path proofs, since the resolver would otherwise have required a much heavier fixture (fansub_group_member_roles, anime_contributions, episodes, fansub_releases) to prove role-based group membership for the contributor-group check inside canMutateReleaseVersionMediaRelation."
  - "For TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete's non-platform-admin ALLOW sub-cases, proved 'reaches the gate and passes' via a real non-403 response (400 file-missing / 204 delete) rather than a full multipart upload success, since the point being proven is permission reuse, not upload completion (already covered by the InsertMediaFileCalled test)."

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: ~3h
completed: 2026-09-04
---

# Phase 146 Plan 08: Remediate 3 more Block-2 handler test files (fansub notes, theme assets, RVM file-replace) Summary

**Replaced os.ReadFile+strings.Contains source-substring proofs in 3 of the 20 locked security-relevant test files with real httptest calls, using real schema-isolated Postgres fixtures where the handler's repository dependency is a concrete type and cannot be faked, and permission-resolver stubs (or actor.IsPlatformAdmin short-circuiting) where it can.**

## Performance

- **Duration:** ~3h
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- `admin_content_fansub_notes_test.go`: both functions now execute `GetAnimeFansubProjectNote`/`DeleteAnimeFansubProjectNote`/`UpdateFansubGroupNote`/`DeleteFansubGroupNote`/`UpdateMemberGroupStory`/`DeleteMemberGroupStory` against a real Postgres fixture, proving route-context propagation (wrong-fansub-group requests genuinely 404) and the exact German 404 message for an invalid anime/fansub pairing.
- `admin_content_release_theme_assets_test.go`: all 4 functions now execute `UploadReleaseThemeAsset`/`UploadReleaseThemeAssetForRelease`/`DeleteReleaseThemeAsset` against a real Postgres-backed `mediaRepo`, proving a real `InsertMediaFile` row is written, a real UNIQUE-constraint violation triggers a real `DeleteMediaAsset` rollback (verified via DB state), the 3 handlers gate on fansub/release permissions (not `requireAdmin`) via a genuine 403/non-403 distinction, and the segment-lock error code appears in a real JSON response body.
- `admin_content_release_version_media_replace_test.go`: `TestReplaceReleaseVersionMediaFileRequiresUpdatePermission` now runs the full `ReplaceReleaseVersionMediaFile` success path against a real Postgres fixture (a genuinely swapped `media_asset_id`, 2 real enqueued cleanup jobs, and a real reset review lifecycle), plus a real 403 for a denied actor before any repository call.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remediate admin_content_fansub_notes_test.go** - `53ae8f91` (test)
2. **Task 2: Remediate admin_content_release_theme_assets_test.go** - `328bcfea` (test)
3. **Task 3: Remediate admin_content_release_version_media_replace_test.go** - `ecdb46f0` (test)

_Note: no separate plan-metadata commit was requested for this plan; this SUMMARY.md and the final STATE.md/ROADMAP.md/REQUIREMENTS.md update are committed together as the closing docs commit._

## Files Created/Modified
- `backend/internal/handlers/admin_content_fansub_notes_test.go` - Real Postgres-backed httptest proofs for project-note read/delete and fansub-group-note/member-story write route-context scoping.
- `backend/internal/handlers/admin_content_release_theme_assets_test.go` - Real Postgres-backed httptest proofs for theme-asset upload/delete media persistence, rollback, permission gating, and segment-lock error code.
- `backend/internal/handlers/admin_content_release_version_media_replace_test.go` - Real Postgres-backed httptest proof for the file-replace permission-gate reuse and full repository call chain.

## Decisions Made
- `fansubNotesRepo`/`mediaRepo` are concrete repository struct types on `AdminContentHandler`, not interfaces (unlike `themeRepo`/`projectNoteCreditSvc`/`permissionSvc`'s resolver). The plan's `<interfaces>` section assumed all three files' repository dependencies could be faked; grounding during execution found this true only for `themeRepo` and `projectNoteCreditSvc`. For the concrete dependencies, real, schema-isolated Postgres fixtures (`testsupport.OpenPhase107Postgres`/`OpenPhase106Postgres`, ad hoc `CREATE TABLE` + migration layering, mirroring the already-established `dashboard_me_handler_test.go` and `repository/release_version_media_replace_repository_test.go` patterns in this exact codebase) were used instead — this is the CLAUDE.md Teststil-compliant closest analog, not an architectural change to production code.
- Used `actor.IsPlatformAdmin=true` identities to drive ALLOW-path tests past `permissions.Service.canForContext` and `canMutateReleaseVersionMediaRelation` without needing a fully working `permissions.Resolver` fixture — both short-circuit to Allowed for a platform admin before ever touching the resolver or `ListReleaseVersionMediaContributorGroupIDs`. Non-platform-admin ALLOW/DENY proofs (where the plan specifically wanted to distinguish fansub/release-role gating from a site-admin-only gate) still use real resolver stubs plus the existing `loadAppAuthCapabilityTestCache` role-capability fixture.
- Discovered and worked around a gin-specific test-infra pitfall: `DeleteReleaseThemeAsset`'s success path ends in a bare `c.Status(204)` with no body write, which gin only flushes lazily via `WriteHeaderNow()` at the end of its own router lifecycle. Calling the handler method directly (as all `AdminContentHandler` unit tests in this package do) bypasses that flush, so `httptest.ResponseRecorder.Code` silently stays at its net/http default of 200 unless `c.Writer.WriteHeaderNow()` is called explicitly after the handler returns.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan's "fake mediaRepo/fansubNotesRepo" premise was structurally infeasible; substituted real Postgres fixtures**
- **Found during:** Task 1 (grounding read of `admin_content_handler.go`'s struct field types)
- **Issue:** The plan's `<interfaces>` section and multiple `<action>` blocks instructed building a "fake `mediaRepo`" and treating `fansubNotesRepo` as struct-settable for arbitrary fake substitution. Both fields are declared as concrete pointer types (`*repository.FansubNotesRepository`, `*repository.MediaRepository`), not interfaces — a Go fake struct literal cannot satisfy a concrete pointer field type, and `mediaRepo` alone has 37 distinct methods called across the `handlers` package, making an interface extraction for it a genuinely architectural, multi-file change outside this plan's single-file-per-task scope (Rule 4 territory, not auto-fixable).
- **Fix:** Built real, schema-isolated Postgres fixtures per file (`openFansubNotesHandlerFixture`, `openReleaseThemeAssetMediaFixture`, `openReplaceRVMHandlerFixture`), reusing `testsupport.OpenPhase106Postgres`/`OpenPhase107Postgres`'s SKIP-not-FAIL convention and layering ad hoc `CREATE TABLE` statements plus real migration files (`0134_review_foundation.up.sql`, `0135_release_review_lifecycle.up.sql`) exactly where the exercised repository methods needed them. `themeRepo` (genuinely an interface) and `projectNoteCreditSvc` (genuinely an interface) were faked as originally planned.
- **Files modified:** all 3 target files (fixtures added alongside the required test rewrites)
- **Verification:** `go build ./...` clean; all 8 target test functions pass under `docker run ... go test ./internal/handlers/... -run "TestAdminContentFansubNotes|TestReleaseThemeAsset|TestReplaceReleaseVersionMediaFile" -v` against real ephemeral Postgres schemas on the project's existing `team4sv30-db` container.
- **Committed in:** `53ae8f91`, `328bcfea`, `ecdb46f0` (part of each task's own commit)

**2. [Rule 1 - Bug] Fixed two test-double bugs found while iterating toward green: missing `DisplayName` on synthetic identities, and a bare `c.Status()` flush gap**
- **Found during:** Task 2 (`TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete` first run)
- **Issue:** `middleware.CommentAuthIdentityFromContext` requires a non-empty `DisplayName` in addition to `UserID > 0` (undocumented in the plan); synthetic non-platform-admin identities without `DisplayName` set silently failed authentication with 401 instead of reaching the permission check. Separately, `DeleteReleaseThemeAsset`'s success path (`c.Status(204)`, no body) never flushed its header when the handler was invoked directly instead of through `router.ServeHTTP`, making the recorder report a false 200.
- **Fix:** Added `DisplayName` to all synthetic `middleware.AuthIdentity` literals; added an explicit `c.Writer.WriteHeaderNow()` call after the one direct `DeleteReleaseThemeAsset(c)` invocation whose success path is a bare `c.Status()`.
- **Files modified:** `backend/internal/handlers/admin_content_release_theme_assets_test.go`
- **Verification:** All 6 sub-tests of `TestReleaseThemeAsset_UsesFansubPermissionsForUploadAndDelete` pass with the expected status codes (403 for denied, non-403 for granted, 204 for the delete-allow case).
- **Committed in:** `328bcfea` (part of Task 2's commit)

---

**Total deviations:** 2 auto-fixed (1 blocking/infra-substitution, 1 bug/test-infra gap)
**Impact on plan:** Both deviations were necessary to complete the plan's stated Criterion 5/6 goal with genuine real-execution proof; no scope creep into production code — all changes are confined to the 3 target `_test.go` files.

## Issues Encountered
- Initial rollback test attempt used `setval(..., N, false)` with an off-by-one misunderstanding of Postgres sequence semantics (`is_called=false` makes the NEXT `nextval()` return exactly `N`, not `N+1`); resolved by dropping the FK on the ad hoc `media_files.media_id` column and pre-occupying a `(media_id=1, variant='original')` slot instead of predicting a specific sequence value, which is simpler and more robust.
- `ReplaceReleaseVersionMediaFile`'s full success path required real, valid, fully-decodable PNG bytes (it calls `image.Decode`, not just MIME-sniffing), unlike the video-upload test in Task 2 which only needed MP4 magic bytes for `mimetype.Detect`; generated a real 2x2 PNG in-memory via `image`/`image/png` instead of hardcoding bytes.
- The full `ReplaceReleaseVersionMediaFile` success path needed a materially larger fixture than the sibling `repository`-package test's fixture (`media_types`, extra `media_assets`/`media_files` columns, `media_files` rows for the old asset so `EnqueueReleaseVersionMediaFileDeleteJob` had something to enqueue) since it exercises `CreateMediaAssetWithStatusTx`/`InsertMediaFileWithStatus` in addition to the two 144-02 repository methods the repository-level test covers.

## User Setup Required
None - no external service configuration required. Running these 3 test files' real-Postgres-backed sub-tests locally requires `TEAM4S_PHASE106_TEST_DSN`/`TEAM4S_PHASE107_TEST_DSN` pointing at an ephemeral database on the project's existing Postgres container (SKIP-not-FAIL if unset, per `testsupport`'s established convention) — no new infrastructure.

## Next Phase Readiness
- 3 more of the 20 locked `SecurityRelevantTestFiles` (146-04) now prove their claims via real execution; 146-13's ratchet-guard exception list should be able to drop these 3 filenames when that plan runs.
- No blockers for the remaining Block-2 remediation plans (146-05 through 146-12 minus the ones already complete).

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring-*
*Completed: 2026-09-04*

## Self-Check: PASSED

All 3 modified test files and this SUMMARY.md verified present on disk; all 3
task commit hashes (53ae8f91, 328bcfea, ecdb46f0) verified present in `git log`.
