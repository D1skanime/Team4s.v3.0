---
phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste
plan: 03
subsystem: database
tags: [go, pgx, postgres, repository, display-url, cursor-pagination]

# Dependency graph
requires:
  - phase: 177-02
    provides: viewer primitive extensions this fix's DisplayURL feeds into
provides:
  - ListReleaseVersionImagesCursor now returns a non-nil DisplayURL (display-variant
    path when ready, original-path fallback otherwise) for every item, matching the
    SSR-initial loadImages()/imagesQuery() sibling query
  - Repository-level regression proof that the existing visibility/review-state/
    soft-delete predicate is unchanged by the additive JOIN
affects: [177-04, 177-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive-only SQL fix: copy a verified-correct sibling query's JOIN/SELECT
      clause verbatim instead of re-deriving it, to avoid predicate drift"

key-files:
  created:
    - backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository.go

key-decisions:
  - "Reused the existing openReleaseVersionMediaReplaceFixture base fixture and its
    seeded IDs (601/701, 602/703) instead of inventing new fixture rows, mirroring
    release_version_media_title_test.go's established extension pattern"
  - "Proved the soft-delete regression guard with a THIRD release_version_media row
    referencing the already ready/public/approved asset 703 but itself deleted_at-set,
    isolating the soft-delete predicate from the visibility/review-state predicates"

requirements-completed: [D-19, D-24]

# Metrics
duration: 25min
completed: 2026-10-09
---

# Phase 177 Plan 03: Cursor-Paginated Image DisplayURL Fix Summary

**Added the missing `mf_display` LEFT JOIN to `ListReleaseVersionImagesCursor` so the "load more" gallery path progressive-loads display-resolution images exactly like the SSR-initial page, proven by a new repository test.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-10-09T12:07:00Z
- **Completed:** 2026-10-09T12:32:09Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- `ListReleaseVersionImagesCursor` (backing `ReleaseGallery.tsx`'s `revealAll()` "load more" button) now selects `display_path` via an additive `LEFT JOIN media_files mf_display ... AND mf_display.variant = 'display'`, copied verbatim from the already-correct `imagesQuery()` sibling in `release_detail_public_repository_helpers.go`.
- The Go scan loop populates `PublicReleaseImage.DisplayURL` from the new column, falling back to the original path when no display variant exists yet (never nil as long as an original exists).
- A new repository test (`TestListReleaseVersionImagesCursorDisplayURLFallback`) proves both the DisplayURL population (display-row case and fallback case) and that the unchanged visibility/review-state/soft-delete predicate still excludes a non-visible row after the JOIN addition.

## Task Commits

1. **Task 1: Add the missing mf_display JOIN to ListReleaseVersionImagesCursor + prove it with a repository test** - `f5c71eb5` (fix)

**Plan metadata:** (this commit, below)

## Files Created/Modified
- `backend/internal/repository/release_detail_public_repository.go` - Added `mf_display` LEFT JOIN + `display_path` SELECT column to `ListReleaseVersionImagesCursor`'s query, added `displayPath *string` scan variable and `DisplayURL` population in the scan loop. The existing `WHERE` predicate (`rvm.deleted_at IS NULL AND ma.status = 'ready' AND v.name = 'public' AND rs.code = 'approved'`) is byte-for-byte unchanged.
- `backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go` - New test `TestListReleaseVersionImagesCursorDisplayURLFallback`: extends `openReleaseVersionMediaReplaceFixture`'s base schema with the minimal columns/tables `ListReleaseVersionImagesCursor` needs (uploader-name join columns, `media_assets.file_path`, the ownership-check tables `anime`/`episodes`/`fansub_releases`/`release_versions.release_id`), gives rvm 602 (asset 703) both an `original` and a `display` media_files row, promotes rvm 601 (asset 701) to ready/public/approved with only an `original` row, and adds a third soft-deleted rvm row (603) reusing asset 703 to prove the deleted_at predicate still excludes it.

## Decisions Made
- Copied the `mf_display` JOIN clause verbatim from the verified-correct `imagesQuery()` sibling rather than re-deriving it, per the plan's explicit "copy this JOIN clause verbatim" interface note — minimizes risk of predicate drift between the two queries.
- Isolated the soft-delete regression proof into its own release_version_media row (603) referencing an already-public/approved asset, so the test unambiguously attributes exclusion to `deleted_at` rather than to visibility or review-state, which are already covered by the other two fixture rows.

## Deviations from Plan

None - plan executed exactly as written. The task's `<action>` and `<behavior>` specs were followed directly; the only judgment call was which existing fixture IDs/schema extensions to reuse for the new test, which the plan's `read_first` pointers already identified.

## Issues Encountered
- No local Go toolchain is installed on the `team4s-linux` host directly (`go: command not found`). Worked around this by running `go build`/`go vet`/`go test` inside a throwaway `golang:1.25-alpine` container (already pulled locally for the backend's dev image), mounted against `/home/d1sk/team4s/backend` and `/home/d1sk/team4s/database`, joined to the `team4s_default` Docker network so it could reach `team4sv30-db`. Used the Phase-107 DSN env var pointed at the pre-existing `team4s_phase107_test_173` fixture database (matches the required `team4s_phase107_test_[a-z0-9]+` pattern); the test creates its own randomly-named isolated schema inside that database per the existing `openPhasePostgres` helper, so no shared state was touched.
- Confirmed (via `go test ./internal/repository/... -run 'TestReleaseVersionMedia|TestListReleaseVersionImagesCursor' -v`) that three pre-existing, unrelated test failures exist in `release_version_media_repository_test.go` (`ERROR: column au.display_name does not exist`, from a different function `ListReleaseVersionMedia` in `release_version_media_repository.go`, a file this plan did not touch). Confirmed out of scope per the deviation rules' scope boundary — not fixed, not caused by this plan's changes (verified the diff only touches `ListReleaseVersionImagesCursor`).
- Mid-session, a `git status --short backend/internal/repository/` diagnostic step accidentally ran `git stash push` against the in-progress fix file while diagnosing the pre-existing failures above. Recognized immediately as a prohibited operation (destructive_git_prohibition), and recovered with `git stash pop` in the very next step before any other git operation — verified via `git diff` that the restored file was byte-for-byte identical to the pre-stash edit. No data was lost; this plan's final commit does not include a stash-recovery artifact (the pop happened before the task commit).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plans 177-04/177-05 (the unified viewer's progressive display-resolution loading, D-03) can now rely on `ListReleaseVersionImagesCursor`'s "load more" items carrying a real `DisplayURL`, identical in shape and fallback behavior to every other image source on the release-detail page.
- No blockers identified.

---
*Phase: 177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste*
*Completed: 2026-10-09*

## Self-Check: PASSED

- FOUND: backend/internal/repository/release_detail_public_repository_cursor_display_url_test.go
- FOUND: .planning/phases/177-einheitlicher-bild-viewer-f-18-ein-gemeinsamer-viewer-bauste/177-03-SUMMARY.md
- FOUND commit: f5c71eb5
