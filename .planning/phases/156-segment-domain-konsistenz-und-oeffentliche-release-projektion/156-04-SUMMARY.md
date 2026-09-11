---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 04
subsystem: api
tags: [go, pgx, postgresql, admin-content, theme-segments, permissions]

# Dependency graph
requires:
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: 01
    provides: "theme_segments.origin_release_version_id column (migration 0161)"
  - phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
    plan: 02
    provides: "theme_segment_assignments as the canonical release<->segment truth (membership check target)"
provides:
  - "SetThemeSegmentOrigin(ctx, segmentID, releaseVersionID) -- validated set/correct of a segment's origin_release_version_id"
  - "AdminThemeSegment.OriginReleaseVersionID surfaced on ListAnimeSegments/GetAnimeSegmentByID"
  - "PUT /api/v1/admin/anime/:id/segments/:segmentId/origin admin endpoint"
affects: [156-05, 156-07, 156-18]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Existence-then-membership validation order (not membership-first) to distinguish ErrNotFound from ErrConflict for a target row that cannot exist without the parent existing"
    - "Reload-after-write via existing GetAnimeSegmentByID, same convention as every other segment-write endpoint in this handler family"

key-files:
  created:
    - backend/internal/repository/theme_segment_origin.go
    - backend/internal/repository/theme_segment_origin_integration_test.go
    - backend/internal/handlers/admin_content_anime_theme_segment_origin.go
    - backend/internal/handlers/admin_content_anime_theme_segment_origin_test.go
  modified:
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/admin_content_anime_themes.go
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/cmd/server/admin_routes.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - backend/internal/handlers/admin_content_release_theme_assets_test.go

key-decisions:
  - "Validation order in SetThemeSegmentOrigin checks segment EXISTENCE first, THEN assignment membership -- deviates from the plan's literal 'membership check first' text because a non-existent segmentID can never have a theme_segment_assignments row (FK-enforced), so a pure membership-first check would always return ErrConflict for a missing segment and make ErrNotFound structurally unreachable"
  - "Task 1's own integration test file (theme_segment_origin_integration_test.go) fully covers all four plan-specified behavior cases against real Postgres; no additional Task-2 companion integration test was created, per the plan's own guidance to avoid duplicating assertions already proven at the repository level"

requirements-completed: [P156-06, P156-18]

# Metrics
duration: 35min
completed: 2026-09-11
---

# Phase 156 Plan 04: Segment-Origin Admin Correction Path Summary

**A new `SetThemeSegmentOrigin` repository method and `PUT /api/v1/admin/anime/:id/segments/:segmentId/origin` endpoint let admins set or correct a segment's `origin_release_version_id`, rejecting any target release version not actually assigned to the segment with 409/`origin_not_assigned` instead of silently accepting it, behind the same `release_version.segments.manage` capability gate used by every other segment-write endpoint.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-11T20:44:00Z (approximate, first file read)
- **Completed:** 2026-09-11T21:19:31Z
- **Tasks:** 2 completed
- **Files modified:** 11 (4 new, 7 modified)

## Accomplishments

- `theme_segments.origin_release_version_id` is now readable via `AdminThemeSegment.OriginReleaseVersionID` on both `ListAnimeSegments` and `GetAnimeSegmentByID` (nil before any origin is set, populated after) -- both SELECT/Scan blocks extended identically, kept byte-identical to each other as before
- `SetThemeSegmentOrigin` validates in this order: segmentID/releaseVersionID<=0 -> `ErrNotFound`; segment does not exist -> `ErrNotFound`; target release version not a member of `theme_segment_assignments` for this segment -> `ErrConflict` (column left unchanged); otherwise `UPDATE theme_segments SET origin_release_version_id`
- `PUT /api/v1/admin/anime/:id/segments/:segmentId/origin` is registered, reachable (verified live: 401 without auth, not 404, after `docker compose up -d --build team4sv30-backend`), enforces `h.requireSegmentManage` before any repository write (proven by a fake-repo test asserting zero writes on denial), and returns 409/`origin_not_assigned`, 400 on a missing/invalid body, or 200 with the reloaded segment
- The `testsupport.OpenPhase117Postgres` fixture now applies migration 0161, so `origin_release_version_id` exists in the isolated test schema used by this entire table family (a real gap found during Task 1 -- see Deviations)
- Repository-level integration test (`TestSetThemeSegmentOrigin`) proves all four plan-specified behavior cases plus the segmentID/releaseVersionID<=0 guard against real Postgres
- Handler-level test (`TestSetAnimeSegmentOrigin_*`) proves: no repository write when the permission gate denies, 200 with the reloaded segment when allowed, 409/`origin_not_assigned` on an unassigned target, and 400 on a missing `release_version_id`

## Task Commits

Each task was committed atomically:

1. **Task 1: theme_segment_origin.go repository -- get/set with assignment-membership validation, plumbed into segment reads** - `2d1a241d` (feat)
2. **Task 2: Admin origin-correction endpoint + route + interface wiring + handler tests** - `b0c1cf10` (feat)

**Plan metadata:** (this commit) `docs(156-04): complete plan`

## Files Created/Modified

- `backend/internal/repository/theme_segment_origin.go` - NEW: `SetThemeSegmentOrigin`
- `backend/internal/repository/theme_segment_origin_integration_test.go` - NEW: `TestSetThemeSegmentOrigin`, all four plan behavior cases against real Postgres
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegment.OriginReleaseVersionID *int64`
- `backend/internal/repository/admin_content_anime_themes.go` - `ListAnimeSegments`/`loadSegmentByID` SELECT+Scan extended with `origin_release_version_id`
- `backend/internal/testsupport/phase117_postgres.go` - added migration `0161_theme_segments_origin_release_version.up.sql` to the fixture's applied-migrations list (Rule 3 fix, see Deviations)
- `backend/internal/handlers/admin_content_anime_theme_segment_origin.go` - NEW: `SetAnimeSegmentOrigin` handler, `adminAnimeSegmentOriginRequest`
- `backend/internal/handlers/admin_content_anime_theme_segment_origin_test.go` - NEW: httptest+fake-repo handler tests
- `backend/internal/handlers/admin_content_handler.go` - `adminThemeRepository` interface gains `SetThemeSegmentOrigin`
- `backend/cmd/server/admin_routes.go` - registers `PUT /admin/anime/:id/segments/:segmentId/origin`
- `backend/internal/handlers/admin_content_fansub_releases_test.go`, `admin_content_release_theme_assets_test.go` - two pre-existing full-manual `adminThemeRepository` stubs given a `SetThemeSegmentOrigin` no-op implementation so the package compiles (Rule 3, blocking compile error)

## Decisions Made

- Kept the plan's prescribed struct/route/error-code shapes (`adminAnimeSegmentOriginRequest{ReleaseVersionID}`, `PUT .../origin`, 409/`origin_not_assigned`, 400 on missing body) exactly as specified.
- Deviated from the plan's literal validation-order text (see Deviations below) for a correctness reason the plan itself did not resolve.
- Task 2's own `theme_segment_origin_integration_test.go` companion file was not created as a separate addition beyond what Task 1 already produced, per the plan's explicit instruction to avoid duplicating already-proven repository-level assertions -- Task 1's test file already carries that exact filename and fully covers the four behavior cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Plan's literal "membership check first" validation order made `ErrNotFound` for a non-existent segment unreachable**
- **Found during:** Task 1, while writing `TestSetThemeSegmentOrigin`'s "non-existent segmentID" case
- **Issue:** The plan's `<action>` text specifies: (1) guard <=0 -> `ErrNotFound`, (2) membership `SELECT EXISTS` -> `ErrConflict` if false, (3) `UPDATE` -> `ErrNotFound` if 0 rows affected. Because `theme_segment_assignments.theme_segment_id` carries an `ON DELETE CASCADE` FK to `theme_segments.id`, no assignment row can ever exist for a segment that does not exist. Under the plan's literal order, step (2) would always fail first for a missing segment and return `ErrConflict`, never reaching step (3)'s `ErrNotFound` -- making the plan's own acceptance criterion ("SetThemeSegmentOrigin returns ErrNotFound for a non-existent segmentID") impossible to satisfy together with "returns ErrConflict when not assigned".
- **Fix:** Reordered to: (1) guard <=0 -> `ErrNotFound`, (2) explicit `SELECT EXISTS(SELECT 1 FROM theme_segments WHERE id = $1)` -> `ErrNotFound` if false, (3) membership `SELECT EXISTS` -> `ErrConflict` if false, (4) `UPDATE`. This distinguishes the two error cases exactly as the plan's acceptance criteria require.
- **Files modified:** `backend/internal/repository/theme_segment_origin.go`
- **Verification:** `TestSetThemeSegmentOrigin/Setzen_auf_eine_nicht_existierende_segmentID_liefert_ErrNotFound` and the sibling "not assigned -> ErrConflict" subtest both pass independently against real Postgres.
- **Commit:** `2d1a241d`

**2. [Rule 3 - Blocking] `testsupport.OpenPhase117Postgres`'s fixture schema was missing migration 0161**
- **Found during:** Task 1, first attempt to run the new integration test
- **Issue:** The shared Phase-117 Postgres test fixture (used by 12+ existing tests in this table family, including this plan's) applies a fixed list of migrations that predates migration 0161. Without it, `origin_release_version_id` does not exist in the test schema and every new query in this plan would fail with an undefined-column error.
- **Fix:** Added `"0161_theme_segments_origin_release_version.up.sql"` to the migration list in `createPhase117Prerequisites`.
- **Files modified:** `backend/internal/testsupport/phase117_postgres.go`
- **Verification:** the full existing theme-segment test family (`TestAssignThemeSegmentToEpisodeRange*`, `TestThemeSegmentAssignmentsAndOverrides`, `TestGetAnimeSegmentByID_HydratesPlaybackForRequestedReleaseVersion`, etc.) still passes unchanged after this addition -- confirms 0161 is additive and non-breaking for every existing consumer of this fixture.
- **Commit:** `2d1a241d`

**3. [Rule 3 - Blocking] Two pre-existing full-manual `adminThemeRepository` stubs needed a new no-op method to compile**
- **Found during:** Task 2 build verification
- **Issue:** `fansubReleaseThemeRepoStub` (`admin_content_fansub_releases_test.go`) and `releaseThemeAssetRepoStub` (`admin_content_release_theme_assets_test.go`) each implement the full `adminThemeRepository` interface method-by-method (no embedding), for unrelated handler tests. Adding `SetThemeSegmentOrigin` to the interface broke compilation of the whole `handlers` package.
- **Fix:** Added a trivial `func (s *X) SetThemeSegmentOrigin(context.Context, int64, int64) error { return nil }` to both stubs, mirroring the existing no-op pattern already used for their other unexercised methods.
- **Files modified:** `admin_content_fansub_releases_test.go`, `admin_content_release_theme_assets_test.go`
- **Commit:** `b0c1cf10`

---

**Total deviations:** 3 auto-fixed (1 correctness bug in the plan's own validation-order text, 2 blocking compile/schema fixes)
**Impact on plan:** All three were required for the plan's own acceptance criteria to be jointly satisfiable and for the package to compile/test against real Postgres. No scope creep beyond what the plan specified.

## Known Pre-Existing Debt (not introduced by this plan)

- The same pre-existing test-order dependency documented in `156-02-SUMMARY.md` reproduces here: `go test ./internal/handlers/... -run TestSetAnimeSegmentOrigin` fails two of three test functions with `403 insufficient_role` when run in isolation via `-run`, because `releasePermissionResolverStub`'s granted role only resolves correctly when the full package test suite runs (some other test in the package establishes state this resolver implicitly depends on at the `permissions` package level). The full package suite (`go test ./internal/handlers/... -count=1`) is green, including all four `TestSetAnimeSegmentOrigin*` subtests. This is not new to this plan -- it is the identical symptom already flagged and root-caused-as-pre-existing in 156-02.

## Issues Encountered

The plan's mandated Task 2 verify command (`go test ./internal/handlers/... -run TestSetAnimeSegmentOrigin -v`) fails under the pre-existing test-order dependency above when run in isolation. Confirmed non-regression by running the full `internal/handlers` package suite (green, including this plan's four new subtests) rather than the isolated `-run` filter.

## User Setup Required

None. Migration 0161 was already applied to the live `team4s_v2` database by Plan 156-01. This plan's only schema-adjacent change was extending the `team4s_phase117_test_156` fixture's applied-migrations list, done automatically as part of test execution, not deferred to the user. Backend was rebuilt (`docker compose up -d --build team4sv30-backend`) and the new route confirmed live-reachable (401, not 404) as part of this plan's own verification.

## Next Phase Readiness

- Plan 156-05/156-07 (dynamic segment-credit projection) can now read a segment's current `origin_release_version_id` via the same `ListAnimeSegments`/`GetAnimeSegmentByID` paths already used elsewhere, with no additional plumbing needed.
- Plan 156-18 (admin segment editor origin UI) has a working, tested, permission-gated backend endpoint to call; no backend blockers remain for that follow-on UI work.
- No blockers identified for downstream plans. The pre-existing test-order-dependent `-run` isolation issue is documented and does not block phase progress (full-suite runs are green).

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-11*

## Self-Check: PASSED

All four created files confirmed present on disk (`theme_segment_origin.go`,
`theme_segment_origin_integration_test.go`, `admin_content_anime_theme_segment_origin.go`,
`admin_content_anime_theme_segment_origin_test.go`). Both task commits (`2d1a241d`, `b0c1cf10`)
confirmed present in `git log --oneline --all`.
