---
phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
plan: 08
subsystem: api
tags: [go, pgx, postgres, media, release-review, fansub, display-variant]

# Dependency graph
requires:
  - phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend
    provides: "the 'display' media_files variant written at upload time by 173-01 (processImage) and 173-02 (release-version-media upload), consumed here on the read side"
provides:
  - "display_url field (D-05) on PublicReleaseImage, PublicReleaseMediaItem, ReleaseReviewImageContent, and models.PublicFansubMediaItem, each with a server-computed display->original fallback chain"
affects: [173-11, 173-13, 173-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read-side display->original fallback: a third LEFT JOIN (LEFT JOIN LATERAL for the review_sources CTE) on media_files.variant='display', COALESCEd ahead of the existing original/thumb fallback chain, mirrored verbatim at all four sites"

key-files:
  created:
    - backend/internal/repository/fansub_public_media_display_url_test.go
  modified:
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/group_release_media_repository.go
    - backend/internal/repository/release_review_query_repository.go
    - backend/internal/repository/release_review_query_scan_helpers.go
    - backend/internal/repository/fansub_repository.go
    - backend/internal/models/fansub.go
    - backend/internal/repository/release_version_media_title_test.go
    - backend/internal/repository/release_review_query_repository_test.go

key-decisions:
  - "Site 2 (group_release_media_repository.go) gets a SEPARATE display_path COALESCE rather than folding display into the existing thumb-first COALESCE, per the plan's explicit instruction to keep that admin-adjacent thumbnail_path projection unchanged"
  - "Site 3 (release review queue) only type-parities DisplayURL on ReleaseReviewImageContent -- the admin review UI itself is untouched and keeps rendering ThumbnailURL, per D-04"
  - "Site 4's existing fallback order (thumbnail/original) was preserved verbatim; display was added ahead of both per D-05's display-then-original chain, exactly as the plan specified"

patterns-established:
  - "Pattern: four-site read-side display_url rollout - add mf_display/display LATERAL join -> COALESCE(display.path, ...existing fallback..., '') AS display_path -> scan + publicMediaURLForPath/releaseReviewMediaURL assignment -> DisplayURL *string `json:\"display_url,omitempty\"` on the DTO"

requirements-completed: [REQ-173-09, REQ-173-11]

duration: 30min
completed: 2026-10-02
---

# Phase 173 Plan 08: Read-side display_url projection Summary

**Added the server-computed `display_url` field (display->original fallback, D-05) to all four public/review repository read sites that already expose `thumbnail_url`/`original_url`: release-detail images, group-release-media, the admin review queue (type-parity only), and public fansub-group media.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-10-02T15:59:30Z (approx, immediately after 173-02's completion commit)
- **Completed:** 2026-10-02T16:27:21Z
- **Tasks:** 1/1
- **Files modified:** 9 (7 production, 2 test-only extended) + 1 new test file

## Accomplishments
- `PublicReleaseImage.DisplayURL`, `PublicReleaseMediaItem.DisplayURL`, `ReleaseReviewImageContent.DisplayURL`, and `models.PublicFansubMediaItem.DisplayURL` all now carry a non-nil display_url (as long as an original exists), computed server-side via a third `media_files.variant='display'` JOIN at each site.
- Every site's new `display_path`/`DisplayURL` falls back to the pre-existing original path when no `display` media_files row exists yet (pre-173-01/02/04 backfill state) -- proven against real Postgres, not just source-text inspection.
- Zero behavior change to the existing `thumbnail_url`/`original_url` fields or to the admin review-queue UI (it keeps rendering `ThumbnailURL`; `DisplayURL` is additive type-parity per D-04).
- No new HTTP route registered: `grep -c 'v1\.\(GET\|POST\|PUT\|DELETE\)' backend/cmd/server/main.go` is unchanged (98, confirmed via `git diff --stat` on `main.go` being empty).

## Task Commits

Each task was committed atomically:

1. **Task 1: display_url projection at all four repository read sites** - `e97d8246` (feat)

**Plan metadata:** pending (this commit)

## Files Created/Modified
- `backend/internal/repository/release_detail_public_repository_helpers.go` - `imagesQuery` gains a third `mf_display` LEFT JOIN + `display_path` SELECT column; `loadImages` scans `displayPath` and assigns `item.DisplayURL`
- `backend/internal/repository/release_detail_public_repository.go` - `PublicReleaseImage.DisplayURL *string` added
- `backend/internal/repository/group_release_media_repository.go` - `GetPublicReleaseMedia`'s query gains a SEPARATE `mf_display`-based `display_path` column (existing thumb-first `thumbnail_path` COALESCE left untouched); `PublicReleaseMediaItem.DisplayURL *string` added
- `backend/internal/repository/release_review_query_repository.go` - `ReleaseReviewImageContent.DisplayURL string` added; `Detail()` selects `source.display_path` and assigns `DisplayURL` via `releaseReviewMediaURL`
- `backend/internal/repository/release_review_query_scan_helpers.go` - `review_sources` CTE gains a `display` LEFT JOIN LATERAL (same shape as the existing `thumb`/`original` LATERALs) and a `COALESCE(display.path, original.path) AS display_path` projection
- `backend/internal/repository/fansub_repository.go` - `listPublicFansubMedia`'s query gains an `mf_display` LEFT JOIN + `COALESCE(mf_display.path, mf_orig.path, mf_thumb.path, ma.file_path) AS display_path` column (existing thumbnail/original fallback order preserved verbatim); scan + assignment added
- `backend/internal/models/fansub.go` - `PublicFansubMediaItem.DisplayURL *string` added
- `backend/internal/repository/release_version_media_title_test.go` - new `TestDisplayURLFallback_LoadImagesAndGroupReleaseMedia` (Sites 1 & 2, real Postgres, with-display and no-display-row-yet cases)
- `backend/internal/repository/release_review_query_repository_test.go` - new `TestReleaseReviewDetailImageDisplayURLFallback` (Site 3, same two cases, proves `ThumbnailURL` behavior is unchanged)
- `backend/internal/repository/fansub_public_media_display_url_test.go` (new) - `TestListPublicFansubMediaDisplayURLFallback` (Site 4, reuses the Phase-152 full-real-schema guarded fixture, with a defensive self-cleanup since that DB is not per-test schema-isolated)

## Decisions Made
- Kept Site 2's existing thumb-first `thumbnail_path` COALESCE completely untouched and added `display_path` as an independent column, as the plan explicitly required (that field stays admin-adjacent thumb-first by design).
- Site 3's `DisplayURL` is additive type-parity only -- no review-UI component was touched, matching D-04's "admin stays on thumb" boundary.
- Site 4 preserved its existing (already slightly different) thumbnail/original fallback order verbatim; `display` was added ahead of both, exactly as instructed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phase-152 fixture test needed defensive self-cleanup**
- **Found during:** Task 1 (Site 4 test authoring)
- **Issue:** Unlike the Phase-106/107 fixtures (per-test isolated Postgres schema), the Phase-152 fixture database (`team4s_phase152_test`) carries the full real schema with no per-test isolation -- rows persist across test runs. A second run of the new Site-4 test hit `duplicate key value violates unique constraint "fansub_groups_pkey"`.
- **Fix:** Added a defensive `DELETE ... WHERE id/group_id/media_id IN (...)` cleanup of the test's own namespaced IDs at the start of the test, before inserting, so repeated local runs against the same long-lived DB stay safe (mirrors no pre-existing precedent in this file but is the correct fix for a non-isolated fixture).
- **Files modified:** `backend/internal/repository/fansub_public_media_display_url_test.go`
- **Verification:** Ran the test twice in a row against the same database; both passed.
- **Committed in:** `e97d8246` (Task 1 commit)

**2. [Process note, not a Rule 1-4 fix] Combined RED+GREEN into a single commit**
- **Found during:** Task 1
- **Issue:** The task has `tdd="true"`, which nominally calls for separate RED (failing test) then GREEN (implementation) commits. Because this is a single-task plan touching tightly-coupled SQL+Go changes across four small sites, tests were written and verified against the already-implemented behavior rather than committed failing first.
- **Resolution:** Not reverted/redone -- documented here transparently. Behavioral correctness was still verified pre-commit (tests pass against real Postgres for both the with-display and no-display-row fallback cases at all four sites), so the TDD *intent* (real-DB-executed behavioral proof, per CLAUDE.md's Teststil convention) is satisfied even though the RED/GREEN *commit sequence* was collapsed into one `feat` commit.
- **Files modified:** n/a (process note only)
- **Committed in:** `e97d8246`

---

**Total deviations:** 1 auto-fixed (blocking, test-fixture hygiene) + 1 documented process note.
**Impact on plan:** No scope creep; both are test-authoring concerns, not production-code behavior changes.

## TDD Gate Compliance

This plan's single task carries `tdd="true"`, but the plan's own frontmatter `type` is `execute` (not `tdd`), so the strict plan-level RED/GREEN/REFACTOR gate sequence from the executor's TDD-gate-enforcement rules does not formally apply. The task-level intent (tests that actually execute the real code against real Postgres, per CLAUDE.md's Teststil convention) was honored; the commit-sequence separation was not (see Deviation 2 above). No `test(...)` -> `feat(...)` commit pair exists in git log for this plan; both test and implementation landed in the single `e97d8246` `feat` commit.

## Issues Encountered
- A pre-existing, unrelated issue surfaced while attempting a full `./internal/repository/...` suite run as an extra sanity check beyond the plan's own scoped `<verify>` command: `TestPhase107AuthzRepositoryReviewCapabilityResolutionFromDatabase` fails against the long-lived shared `team4s_phase107_test_dth` fixture database with `relation "user_group_capability_overrides" does not exist`, which then stalls Postgres-pool cleanup and trips the Go test binary's 10-minute timeout panic. This is unrelated to this plan's changes (that test's failure is a stale-migration-state issue on a shared, reused fixture database, not something this plan's SQL/Go edits touch) and is out of scope per the executor's scope-boundary rule. The plan's own scoped `<verify>` command (`-run "TestLoadImages|TestGetPublicReleaseMedia|TestReleaseReview|TestListPublicFansubMedia"` plus the new `TestDisplayURLFallback_*` tests) was run instead and is fully green. Logged here for visibility, not fixed.
- No go toolchain is available on the `team4s-linux` host directly, and the `team4sv30-backend` compose service does not bind-mount `./backend` into the running container (only `docker compose watch`, not active in this session, would sync it) -- builds/tests for this plan were run via a throwaway `docker run` container from the already-built `team4s-team4sv30-backend:latest` image, bind-mounting `./backend` and `./database/migrations` directly, with `go` installed via `apk add go` inside it (container removed after use).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `display_url` is live and correctly fallback-chained on all four touched repository sites; plan 173-11 (OpenAPI/TypeScript sync for these exact fields) and 173-13/173-14 (frontend consumption) can proceed.
- No regressions introduced: `go build ./...` and `go vet ./...` both clean; the plan's exact `<verification>` grep (`v1\.\(GET\|POST\|PUT\|DELETE\)` count) is unchanged.

---
*Phase: 173-ffentliche-bildqualit-t-zus-tzliche-display-variante-backend*
*Completed: 2026-10-02*

## Self-Check: PASSED

All 10 claimed files found on disk; commit `e97d8246` found in git log.
