---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
plan: 03
subsystem: api
tags: [go, pgx, openapi, release-review, review-lifecycle]

# Dependency graph
requires: []
provides:
  - "ReleaseReviewDetail.PriorRejection (*ReleaseReviewPriorRejection, json prior_rejection,omitempty) populated by ReleaseReviewQueryRepository.Detail"
  - "shared/contracts/openapi.yaml ReleaseReviewPriorRejection schema + frontend/src/types/releaseReviews.ts ReleaseReviewPriorRejection interface, both mirrored field-for-field"
affects: [144-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New DTO + scan/construction helper for a LEFT JOIN LATERAL feature added to release_review_query_scan_helpers.go rather than the already-tight-budget main repository file, extending the same file-size-discipline precedent 144-01 established"
    - "LEFT JOIN LATERAL against review_decisions scoped by exact source_type/source_key match plus source_revision - 1, mirroring release_version_media_repository.go's existing rejection-lookup LATERAL shape but with the PRIOR-revision predicate instead of the current-revision one"

key-files:
  created: []
  modified:
    - backend/internal/repository/release_review_query_repository.go
    - backend/internal/repository/release_review_query_scan_helpers.go
    - backend/internal/repository/release_review_query_repository_test.go
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseReviews.ts

key-decisions:
  - "ReleaseReviewPriorRejection struct type and its scan/construction helpers (releaseReviewPriorRejectionScan, releaseReviewPriorRejectionJoinSQL, releaseReviewPriorRejectionColumns) live in release_review_query_scan_helpers.go, not the main repository file, per the plan's explicit line-budget guidance (408-line pre-phase baseline, only 42 lines of headroom)."
  - "OpenAPI's new ReleaseReviewPriorRejection.rejection_category re-uses the existing ReleaseReviewRejectionCategory schema via $ref instead of duplicating its enum values inline, keeping the vocabulary single-sourced."
  - "Test fixture row 606 (the resubmission-after-reject case) is inserted inside the new test function itself, not appended to the shared openReleaseReviewQueryFixture -- adding a 'pending' row to the shared fixture was tried first and broke 3 pre-existing tests' List/Counts pending-item-count assertions (they count every pending row in fansub_group_id=21); every other test in this file that needs extra fixture data follows the same test-local-insert precedent (604/605), which this plan now also follows for 606."

requirements-completed:
  - "Zielbild 3 (144-CONTEXT.md): Prüfer sieht beim erneuten Vorlegen die überarbeitete Fassung einer eigenen Ablehnung, backend half"

duration: ~30min
completed: 2026-09-02
---

# Phase 144 Plan 03: Prior-Rejection Data on Release Review Detail (Backend Half) Summary

**`ReleaseReviewDetail` now carries an optional `PriorRejection` object -- populated exactly when the current revision has an immediately-preceding reject decision on the same review source -- via a new LEFT JOIN LATERAL against `review_decisions`/`review_reason_texts`/`members`, mirrored into OpenAPI and the frontend TypeScript type.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-02T14:25:46Z (STATE.md session start)
- **Completed:** 2026-09-02T14:34:10Z
- **Tasks:** 3/3 completed
- **Files modified:** 5

## Accomplishments
- `ReleaseReviewPriorRejection` (`RejectedAt`, `RejectionCategory`, `RejectionReason`, `ReviewerDisplayName`, `RejectedByCurrentActor`) is a new type in `release_review_query_scan_helpers.go`; `ReleaseReviewDetail` gained `PriorRejection *ReleaseReviewPriorRejection` tagged `json:"prior_rejection,omitempty"`.
- `Detail()`'s single `QueryRow` now LEFT JOIN LATERALs `review_decisions` (matched by exact `source_type`/`source_key` and `source_revision = source.source_revision - 1`, gated by `source.source_revision > 1`), `review_reason_texts` (via a correlated subquery on the matching `review.rejected` audit event), and `members reviewer_member` to resolve the reviewer's display name using the same `COALESCE(NULLIF(TRIM(...)), nickname, '')` fallback the codebase already uses for submitter names.
- `RejectedByCurrentActor` is computed by comparing the resolved `reviewer_app_user_id` against the `actorAppUserID` parameter `Detail` already receives -- no new plumbing.
- OpenAPI's `ReleaseReviewDetail` schema gained `prior_rejection` (new `ReleaseReviewPriorRejection` schema, reusing the existing `ReleaseReviewRejectionCategory` enum via `$ref`); `frontend/src/types/releaseReviews.ts` mirrors it field-for-field.
- New real-Postgres test `TestReleaseReviewQueryDetailIncludesPriorRejection` (3 subtests) proves: own-rejection resubmission -> `RejectedByCurrentActor=true` with the seeded category/reason/reviewer name; a different reviewer's prior rejection -> `RejectedByCurrentActor=false` (still populated); a never-resubmitted row (fixture's existing row 603, `source_revision=1`) -> `PriorRejection == nil`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ReleaseReviewPriorRejection and populate it in Detail()** - `1dbdcb86` (feat)
2. **Task 2: Contract sync (OpenAPI + frontend type)** - `7085d060` (docs)
3. **Task 3: Backend test proving prior-rejection population and absence** - `9f941c47` (test)

_No separate plan-metadata commit was made prior to this SUMMARY; this SUMMARY and STATE/ROADMAP updates are committed together as the plan-completion commit._

## Files Created/Modified
- `backend/internal/repository/release_review_query_repository.go` - `ReleaseReviewDetail.PriorRejection` field; `Detail()`'s query extended with the LATERAL join and post-scan `priorRejection.build(actorAppUserID)` call (414 lines, was 408)
- `backend/internal/repository/release_review_query_scan_helpers.go` - New `ReleaseReviewPriorRejection` type, `releaseReviewPriorRejectionScan` (targets/build), `releaseReviewPriorRejectionJoinSQL`, `releaseReviewPriorRejectionColumns` (193 lines, was 117)
- `backend/internal/repository/release_review_query_repository_test.go` - New `TestReleaseReviewQueryDetailIncludesPriorRejection` (3 subtests, real Postgres)
- `shared/contracts/openapi.yaml` - New `ReleaseReviewPriorRejection` schema; `ReleaseReviewDetail.prior_rejection` property
- `frontend/src/types/releaseReviews.ts` - New `ReleaseReviewPriorRejection` interface; `ReleaseReviewDetail.prior_rejection?`

## Decisions Made
- Kept the new struct type and scan/construction helpers in the sibling `release_review_query_scan_helpers.go` file rather than the main repository file, following the plan's explicit line-budget guidance and 144-01's established same-package-sibling-file precedent.
- Reused the existing `ReleaseReviewRejectionCategory` OpenAPI schema via `$ref` for the new `ReleaseReviewPriorRejection.rejection_category` field instead of duplicating its 5-value enum inline (the plan's own text mirrored `ReleaseVersionMediaItem`'s duplicated enum as a fallback option, but the schema already existed one section below `ReleaseReviewDetail` in the same file, making a `$ref` strictly better).
- Test fixture row 606 (source_revision=2, prior-revision reject decision) is inserted locally inside the new test function, not appended to the shared `openReleaseReviewQueryFixture` -- see "Deviations from Plan" below.

## Deviations from Plan

**1. [Rule 1 - Bug] Fixture extension moved from the shared helper into the test-local scope**
- **Found during:** Task 3, first verification run
- **Issue:** The plan's action text said to extend `openReleaseReviewQueryFixture` itself with the new row 606. Doing so literally added a `'pending'` `release_version_media_review_lifecycle` row visible to every other test in the file that calls the shared fixture. Three pre-existing tests (`TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages`, `TestReleaseReviewQueueRepositoryExcludesActorsOwnSubmissionFromListAndCounts`, `TestReleaseReviewQueueOwnViewReturnsOnlyActorsOwnPendingSubmissions`, `TestReleaseReviewQueueRepositorySortsNewestFirst`) failed because their `List`/`Counts` assertions expect an exact pending-row count for `fansub_group_id=21`, and row 606 silently inflated it.
- **Fix:** Moved the row-606 + `review_decisions`/`review_audit_events`/`review_reason_texts` insert out of `openReleaseReviewQueryFixture` and into `TestReleaseReviewQueryDetailIncludesPriorRejection` itself (called right after `openReleaseReviewQueryFixture(t)`), matching this same test file's own established precedent for every other test that needs extra fixture rows (604 in two different tests, 605 in one) -- each adds its own rows locally rather than mutating the shared function.
- **Files modified:** `backend/internal/repository/release_review_query_repository_test.go`
- **Commit:** `9f941c47` (the fix was applied before the task's own commit, not as a separate follow-up commit)

## Issues Encountered
- Same pre-existing container source-mount limitation as 144-01/144-02: `docker compose exec team4sv30-backend` sees stale source. All `go build`/`go test` verification in this plan ran via a throwaway `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace ... golang:1.25-alpine` container instead, per the note already documented in prior plans' SUMMARYs.
- `TEAM4S_PHASE107_TEST_DSN` was not set in the container environment by default; reused the already-provisioned `team4s_phase107_test_run143` database (created in Phase 143, matches the required `team4s_phase107_test_[a-z0-9]+` pattern) for the real-Postgres test run, consistent with the existing per-phase fixture-database convention.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The backend `prior_rejection` field, OpenAPI schema, and frontend TypeScript type are all in place and ready for 144-07 (the Wave-5 plan that renders the "Überarbeitet" badge + prior-rejection context line on the reviewer detail page) to consume directly -- no further backend/contract work needed for that plan.
- No blockers for the next wave. `release_review_query_repository.go` (414/450) and `release_review_query_scan_helpers.go` (193/450) both have ample remaining line budget.

---
*Phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 5 claimed source files plus this SUMMARY found on disk; all 3 claimed task commits (1dbdcb86, 7085d060, 9f941c47) found in `git log --oneline --all`.
