---
phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend
plan: 03
subsystem: api
tags: [go, pgx, postgres, httptest, nextjs-typescript, media-upload]

# Dependency graph
requires:
  - phase: 179
    provides: unified fansub_group_media.upload capability check and shared upload/soft-delete handler paths this plan's call site builds on
provides:
  - CreateFansubGroupMediaAsset(ctx, tx, input) now returns (int64, error) via RETURNING id instead of error-only
  - fansubGroupMediaFileResult.FansubGroupMediaID (*int64, json:"fansub_group_media_id,omitempty") populated on the success path only
  - frontend FansubGroupMediaUploadResult.fansub_group_media_id?: number mirroring release_version_media_id
affects: [180-02, 180-07]

tech-stack:
  added: []
  patterns:
    - "RETURNING id + .Scan(&id) on an existing tx.Exec INSERT to add a created-row ID without touching column list/parameter order (mirrors CreateReleaseVersionMediaAsset's existing shape)"
    - "Real-Postgres + httptest end-to-end handler test (platform-admin identity bypasses resolver, repository.NewAuditLogRepository(nil) as nil-safe no-op) instead of source-grep assertions"

key-files:
  created:
    - backend/internal/repository/media_repository_fansub_group_media_id_test.go
    - backend/internal/handlers/fansub_media_upload_exec_test.go
  modified:
    - backend/internal/repository/media_repository.go
    - backend/internal/handlers/fansub_media_upload.go
    - frontend/src/lib/api/admin/fansub-media.ts

key-decisions:
  - "Appended RETURNING id to the existing INSERT with zero changes to columns/values/parameter order, keeping the only behavior change scoped to the return signature"
  - "Built a second, package-local test fixture (openFansubGroupMediaUploadExecFixture) rather than reusing openFansubGroupMediaSoftDeleteFixture as-is, because the soft-delete fixture's fansub_group_media table omits the category/sort_order/uploaded_by_user_id columns this upload path actually writes"

patterns-established:
  - "fansub_group_media_id is the relation-ID counterpart to release_version_media_id for Weg 2, enabling 180-02/180-07's metadata-patch and single-item-retry pipeline to address group-media uploads by relation ID instead of sort_order"

requirements-completed: [D-01, D-14]

duration: 55min
completed: 2026-10-11
---

# Phase 180 Plan 03: Group-media upload response carries fansub_group_media_id Summary

**CreateFansubGroupMediaAsset now returns the real persisted row ID via `RETURNING id`, and the group-media upload HTTP response carries that ID as `fansub_group_media_id` — proven end to end against real Postgres, not by grepping the handler's source text.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-10-11T18:50:00Z
- **Completed:** 2026-10-11T19:45:00Z
- **Tasks:** 3 completed
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `CreateFansubGroupMediaAsset` signature changed from `error` to `(int64, error)`, with a real-Postgres test proving the returned ID matches the actual persisted `fansub_group_media` row (not just "non-zero"), and that a real FK violation returns `(0, non-nil error)` with no row left behind
- `fansubGroupMediaFileResult.FansubGroupMediaID` added and wired through `processOneFansubGroupMediaFile`'s success path, with a real-Postgres + `httptest` end-to-end test (`h.UploadFansubMedia(c)` actually invoked, real multipart PNG, real JSON response unmarshaled) proving the field is both present and correct — plus a companion test proving it stays absent (`omitempty`) on a rejected/failed upload
- Frontend `FansubGroupMediaUploadResult` type now carries the matching optional field; `npm run typecheck` green

## Task Commits

Each task was committed atomically:

1. **Task 1: Repository — CreateFansubGroupMediaAsset returns the new row's ID** - `cea8f39c` (feat)
2. **Task 2: Handler — thread the new ID through the upload response** - `57388142` (feat)
3. **Task 3: Frontend type — FansubGroupMediaUploadResult.fansub_group_media_id** - `f7578fac` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `backend/internal/repository/media_repository.go` - `CreateFansubGroupMediaAsset` now `(int64, error)` via `RETURNING id`
- `backend/internal/repository/media_repository_fansub_group_media_id_test.go` - real-Postgres proof the returned ID matches the persisted row; FK-violation failure path proof
- `backend/internal/handlers/fansub_media_upload.go` - `fansubGroupMediaFileResult.FansubGroupMediaID` field + success-path assignment
- `backend/internal/handlers/fansub_media_upload_exec_test.go` - real-Postgres + httptest end-to-end proof of the response field (success and failure paths)
- `frontend/src/lib/api/admin/fansub-media.ts` - `FansubGroupMediaUploadResult.fansub_group_media_id?: number`

## Decisions Made
- Kept the INSERT's column list, parameter order, and values byte-for-byte unchanged — only `RETURNING id` was appended, preserving T-180-06's parameterized-query-discipline guarantee from the plan's threat model.
- Did not reuse `openFansubGroupMediaSoftDeleteFixture` verbatim for either new test file: that fixture's `fansub_group_media` table is intentionally minimal for soft-delete tests and lacks `category`/`sort_order`/`uploaded_by_user_id` — the exact columns `CreateFansubGroupMediaAsset`'s INSERT writes. Each new test file defines its own fixture with the full column set instead of mutating the shared one (avoiding changing behavior/assumptions of unrelated existing tests).

## Deviations from Plan

None - plan executed exactly as written. The interface specification's exact target shapes (struct field, repository signature, call-site threading, frontend field) were followed as given; the only plan-left-open implementation choice was the exact fixture-building shape for the two new real-Postgres tests, which the plan explicitly delegated to "reuse or lightly extend" judgment.

## Issues Encountered
None. The handler path (`FansubGroupExistsForMedia` → `GetMaxFansubGroupMediaSortOrder` → `SaveUpload` → `generateRVMThumbnail` → `BeginTx` → `CreateMediaAssetWithStatusTx` → `InsertMediaFileWithStatus` (×2–3) → `CreateFansubGroupMediaAsset` → `UpdateMediaAssetStatusRVMTx` → `UpdateMediaFileStatusRVMTx` → `Commit`) was traced from source before writing the exec-test fixture, so all required tables (`fansub_groups`, `users`, `media_types`, `visibilities`, `review_statuses`, `media_assets`, `media_files`, `fansub_group_media`) were seeded correctly on the first attempt; both new tests passed on first real-Postgres run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `fansub_group_media_id` is now live in the group-media upload response, unblocking plans 180-02 and 180-07's per-file metadata-patch and single-item-retry pipeline, which need to address Weg 2 uploads by relation ID exactly as Weg 1 already does via `release_version_media_id`.
- No blockers. Pre-existing, unrelated test failures observed in the same packages during verification (missing `TEAM4S_PHASE128_TEST_DSN`, Keycloak/Jellyfin network dependencies, a pre-existing `release_version_media.reorder` capability-registry gap, a pre-existing search `db_schema_mismatch`) are documented in prior phases' `deferred-items.md` files and are out of this plan's scope per the Scope Boundary rule — none mention `fansub_group_media` or `CreateFansubGroupMediaAsset`.

---
*Phase: 180-einheitliche-upload-oberfl-che-f-15-teil-2-ein-wiederverwend*
*Completed: 2026-10-11*

## Self-Check: PASSED

All claimed files exist on disk and all claimed commit hashes (cea8f39c, 57388142, f7578fac) are present in git history.
