---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 09
subsystem: testing
tags: [postgres, pgx, fixtures, repository, anime-relations, release-version-media, audit-log]

requires:
  - phase: 185-06
    provides: "Shared Phase-107/152/155 fixture-provisioning precedent (pg_dump --schema-only + schema-isolated pools), reused here to provision a new team4s_relations_test throwaway database"
provides:
  - "anime_relations_public_postgres_test.go seeds the OVA anime's cover via media_types/media_assets/anime_media instead of the dropped anime.cover_image column"
  - "openReleaseVersionMediaReplaceFixture's shared app_users/users stand-in tables carry display_name/preferred_username/username, so ListReleaseVersionMedia's uploader_identity LATERAL join resolves for every test built on this fixture"
  - "release_version_media_cross_package_test.go defines a local no-op auditLogWriter fake (rvmCrossPackageAuditLogFake) and passes it instead of literal nil to WithPermissionDeps"
affects: [185-repository-anime-relations, 185-repository-release-version-media]

tech-stack:
  added: []
  patterns:
    - "When a shared, non-isolated fixture function gains a column fix, grep every sibling test file that calls the same fixture function for the identical ALTER TABLE line before declaring the fix complete -- Postgres aborts a multi-statement Exec on the first 'column already exists' error, so a redundant duplicate ALTER in any sibling test silently regresses that sibling the moment the shared fixture starts providing the column itself."

key-files:
  created: []
  modified:
    - backend/internal/repository/anime_relations_public_postgres_test.go
    - backend/internal/repository/release_version_media_replace_repository_test.go
    - backend/internal/repository/release_version_media_cross_package_test.go
    - backend/internal/repository/release_version_media_title_test.go
    - backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go

key-decisions:
  - "Provisioned a new throwaway database team4s_relations_test (pattern ^team4s_relations_test(?:_[a-z0-9]+)?$ already enforced by openAnimeRelationsPostgres's fail-closed guard) via pg_dump --schema-only of team4s_v2 + psql restore, since no database matching that pattern existed in this environment yet. Never touched team4s_v2 itself. Reused the existing team4s_phase107_test_173 database (already schema-isolated per test run via a random-suffix CREATE SCHEMA, so no provisioning was needed) for Tasks 2 and 3."
  - "Task 2's plan text named only app_users.display_name/preferred_username, but ListReleaseVersionMedia's uploader_identity LATERAL join also reads uploader.username (COALESCE fallback chain: au.display_name -> au.preferred_username -> uploader.username) -- Postgres validates every column reference in a query at plan time, so the 4 target tests still failed ('column uploader.username does not exist') after adding only the two app_users columns. Added users.username to the same fixture (Rule 3 completion of the sibling pattern, matching release_version_media_title_test.go's own identical users.username line)."
  - "Adding users.username/app_users.display_name/preferred_username to the shared openReleaseVersionMediaReplaceFixture (used by 7 sibling test files) caused a self-introduced regression: release_version_media_title_test.go and release_detail_public_repository_cursor_display_url_test.go each independently re-added the exact same columns inside their own test bodies, which now error with 'column already exists' once the base fixture provides them first. Removed the now-redundant ALTER lines from both sibling files (Rule 1 -- auto-fix bug introduced by this plan's own Task 2 change, verified via a full `go test ./internal/repository/...` run before and after)."
  - "TestRVMHandler_ProzessmedienDefaults's own done-criteria text in the plan mentions a 201 Created response, but the handler/test's actual existing assertion checks http.StatusOK (200) -- left unchanged, out of scope for this plan (nil-to-fake audit-log fix only); the test's real assertion passes as written."

patterns-established:
  - "Before marking a shared-fixture column fix complete, run the full package test suite (not just the plan's named verify command) and diff the FAIL set against a pre-change baseline -- catches sibling-file duplicate-DDL regressions that the plan's named verify command alone will never exercise, since those sibling tests are not part of this plan's named red-test list."

requirements-completed: [D-02]

duration: ~45min
completed: 2026-10-16T21:10:00Z
---

# Phase 185 Plan 09: Three independent fixture/test defects (OVA cover resolver, RVM display_name, nil audit-log) Summary

**Closed three unrelated single-cause red tests: a dropped-column fixture seed, a shared fixture missing three uploader-identity columns (plus a self-caused sibling regression fixed in the same pass), and a literal-nil audit-log dependency causing a nil-pointer panic.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-10-16T21:10:00Z
- **Tasks:** 3/3 completed (plus 1 Rule-1 self-correction discovered during Task 2's full-suite verification)
- **Files modified:** 5

## Accomplishments

- `TestGetAnimeRelations_PerspectiveAndPosterCover` no longer writes to the dropped `anime.cover_image` column; the OVA anime's cover now goes through the exact same `media_types`/`media_assets`/`anime_media` resolver path already used for the main anime, with its own `t.Cleanup`.
- `openReleaseVersionMediaReplaceFixture`'s shared `app_users`/`users` stand-in tables now carry `display_name`, `preferred_username`, and `username`, letting `ListReleaseVersionMedia`'s `uploader_identity` LATERAL join (COALESCE across all three) resolve. All 4 named red tests pass: `TestReleaseVersionMedia_ListIncludesOwnReviewLifecycle`, `TestReleaseVersionMedia_ListAllowsOrdinaryRowsWithoutHighlight`, `TestReleaseVersionMedia_SoftDeleteQueryExcludesDeletedRows`, `TestReleaseVersionMediaHighlightsAreIndependentFromPreview`.
- `TestRVMHandler_ProzessmedienDefaults` now passes a local no-op `rvmCrossPackageAuditLogFake` (satisfying handlers' unexported `auditLogWriter` interface structurally) instead of literal `nil` to `WithPermissionDeps`, so `UploadReleaseVersionMedia`'s `h.auditLogRepo.Write(...)` call no longer nil-pointer-panics. Passes with the handler's own existing 200/OK assertion.
- Discovered and fixed a self-introduced regression: adding the three columns to the shared fixture broke two sibling test files (`release_version_media_title_test.go`, `release_detail_public_repository_cursor_display_url_test.go`) that independently re-added the same columns inside their own test bodies. Removed the now-redundant duplicate `ALTER TABLE` lines from both.
- Provisioned a new throwaway database `team4s_relations_test` (via `pg_dump --schema-only` of `team4s_v2` + restore) since no database matching the fixture's required name pattern existed yet. Never touched `team4s_v2`.
- Full `go build ./...` and `go test ./internal/repository/... -v -count=1` run (with `TEAM4S_RELATIONS_TEST_DSN` and `TEAM4S_PHASE107_TEST_DSN` set) confirms all 6 target tests pass and no sibling test in any of the touched files regresses; the only remaining failures are pre-existing, already-documented, unrelated families (missing `TEAM4S_PHASE128_TEST_DSN`, unreachable Phase-134-matrix container at `192.168.235.196:18093`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Seed the OVA anime's cover via the real resolver instead of the dropped column** - `6545dd93e` (fix)
2. **Task 2: Add display_name/preferred_username (+ users.username) to openReleaseVersionMediaReplaceFixture's app_users** - `2372c1ac4` (fix)
3. **Task 3: Pass a real no-op audit-log fake instead of nil in TestRVMHandler_ProzessmedienDefaults (+ Rule-1 sibling-regression fix)** - `d504966e8` (fix)

**Plan metadata:** (this commit, created after this SUMMARY)

## Files Created/Modified

- `backend/internal/repository/anime_relations_public_postgres_test.go` - replaced the OVA anime's `UPDATE anime SET cover_image = ...` with a second `media_assets`/`anime_media` insert pair (reusing the already-inserted `'poster'` `media_types` row), with its own `t.Cleanup`.
- `backend/internal/repository/release_version_media_replace_repository_test.go` - `openReleaseVersionMediaReplaceFixture`'s `app_users` ALTER gained `display_name`/`preferred_username`; a new `ALTER TABLE users ADD COLUMN username TEXT;` was added for the same uploader-identity resolution query.
- `backend/internal/repository/release_version_media_cross_package_test.go` - added `rvmCrossPackageAuditLogFake` (local no-op `Write` method) and passed `&rvmCrossPackageAuditLogFake{}` instead of `nil` in `TestRVMHandler_ProzessmedienDefaults`'s `WithPermissionDeps` call.
- `backend/internal/repository/release_version_media_title_test.go` - removed the now-redundant `ALTER TABLE users ADD COLUMN username TEXT; ALTER TABLE app_users ADD COLUMN display_name TEXT, ADD COLUMN preferred_username TEXT;` lines (two occurrences) that duplicated what the shared fixture now already provides.
- `backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go` - removed the same now-redundant duplicate ALTER lines (one occurrence).

## Decisions Made

- **Provisioned `team4s_relations_test` via schema-only dump + restore of `team4s_v2`**, matching `openAnimeRelationsPostgres`'s fail-closed database-name guard and the 185-06 precedent for shared, non-schema-isolated fixture databases. Never touched `team4s_v2`.
- **`users.username` was also required, beyond the plan's literally-named `app_users` columns** — root-caused by running the plan's own verify command first (failed with "column uploader.username does not exist"), then adding the column from the sibling `release_version_media_title_test.go` pattern. Documented as a Rule 3 completion of an already-correct sibling fix, not a new design decision.
- **Fixed a self-introduced sibling regression within the same task's commit**, rather than leaving it for a later plan: adding the shared fixture's three columns broke two files that redundantly re-added them. Running the full `internal/repository` package suite (not just the plan's named verify command) before considering Task 2/3 done caught this; both pre-change and post-change full-suite runs were diffed to confirm the FAIL set shrank by exactly the 2 newly-fixed sibling tests and introduced zero new failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `users.username` column also needed, beyond the plan's named `app_users` columns**
- **Found during:** Task 2 verification
- **Issue:** The plan's `<action>` named only `app_users.display_name`/`preferred_username`. `ListReleaseVersionMedia`'s `uploader_identity` LATERAL join's COALESCE chain also reads `uploader.username` (aliased `users` table); Postgres validates all column references in a query at plan time, so all 4 target tests still failed with "column uploader.username does not exist" after adding only the two named columns.
- **Fix:** Added `ALTER TABLE users ADD COLUMN username TEXT;` to the same fixture, copied from the identical line already present in the sibling `release_version_media_title_test.go` fixture extension.
- **Files modified:** `backend/internal/repository/release_version_media_replace_repository_test.go`
- **Verification:** All 4 named tests pass.
- **Committed in:** `2372c1ac4` (Task 2 commit)

**2. [Rule 1 - Bug] Removed duplicate ALTER TABLE lines in two sibling files, broken by Task 2's own fixture change**
- **Found during:** Task 3's full-package verification pass (run before considering the plan complete, per this plan's own "no sibling test regresses" success criterion)
- **Issue:** `release_version_media_title_test.go` (2 occurrences) and `release_detail_public_repository_cursor_display_url_test.go` (1 occurrence) each independently re-added `users.username`/`app_users.display_name`/`app_users.preferred_username` inside their own test bodies, on top of the same shared `openReleaseVersionMediaReplaceFixture`. Once Task 2 made the base fixture provide those columns itself, these sibling tests failed with "column ... already exists" (Postgres aborts a multi-statement Exec on the first error).
- **Fix:** Removed the now-redundant duplicate `ALTER TABLE` lines from all 3 occurrences across the 2 files; none of the removed columns were read or asserted on by those tests beyond mere existence.
- **Files modified:** `backend/internal/repository/release_version_media_title_test.go`, `backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go`
- **Verification:** `TestReleaseVersionMediaTitlePublicProjections`, `TestDisplayURLFallback_LoadImagesAndGroupReleaseMedia`, and `TestListReleaseVersionImagesCursorDisplayURLFallback` all pass again; full package re-run shows the FAIL count dropping by exactly these 3 tests with no new failures introduced.
- **Committed in:** `d504966e8` (Task 3 commit, same commit as the audit-log fake since both were discovered/fixed in the same verification pass)

---

**Total deviations:** 2 auto-fixed (1 blocking-completion, 1 self-introduced-regression bugfix)
**Impact on plan:** Both auto-fixes were necessary for the plan's own stated success criterion ("no sibling test in any of the three touched files regresses" — the regression touched 2 additional files sharing the same fixture function, caught only by running the full package suite). No scope creep beyond what was required to make the fixture change correct and non-regressive.

## Issues Encountered

- No database matching `openAnimeRelationsPostgres`'s required name pattern (`^team4s_relations_test(?:_[a-z0-9]+)?$`) existed in this environment. Resolved by provisioning `team4s_relations_test` via `pg_dump --schema-only` of `team4s_v2` + `psql` restore (schema-only, no data), matching this fixture's own undocumented-but-implied full-schema requirement (it seeds real `anime`/`episodes`/`relation_types`/`episode_filler_types`/`media_types`/`media_assets`/`anime_media` rows with no hand-rolled stand-in tables).

## User Setup Required

None - no external service configuration required. The new `team4s_relations_test` database lives only in the local Docker Postgres container (`team4sv30-db`) already running on this host; no `.env` or CI configuration changes are needed for this plan's scope.

## Next Phase Readiness

- All 6 target tests across the 3 plan-named files pass; the broader `internal/repository` package suite shows no new failures, confirmed via a before/after full-suite diff.
- `team4s_relations_test` is now available in this environment's Postgres container for any future plan that needs `TEAM4S_RELATIONS_TEST_DSN` (e.g. `postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_relations_test?sslmode=disable` from inside the backend container's network).
- Remaining red tests in `internal/repository` (Phase-128/134-matrix families) are pre-existing, already tracked in `STATE.md`/prior 185-* summaries, and untouched by this plan.

---
*Phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back*
*Completed: 2026-10-16*

## Self-Check: PASSED

All 5 modified source/test files and the SUMMARY.md itself exist on disk; all 4 referenced commit hashes (`6545dd93e`, `2372c1ac4`, `d504966e8`, `b35a6a0af`) are present in `git log --oneline --all`.
