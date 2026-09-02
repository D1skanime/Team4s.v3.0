---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
plan: 04
subsystem: api
tags: [go, gin, pgx, openapi, release-version-media, review-lifecycle, multipart]

# Dependency graph
requires: ["144-01", "144-02", "144-03"]
provides:
  - "PUT /admin/release-versions/:versionId/media/:relationId/file — single-file multipart replace endpoint, registered and documented"
  - "AdminContentHandler.ReplaceReleaseVersionMediaFile (backend/internal/handlers/admin_content_release_version_media_replace.go)"
affects: [144-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New sibling handler file composing 144-02's ReplaceReleaseVersionMediaFile/EnqueueReleaseVersionMediaFileDeleteJob repository methods with SubmitMedia inside one transaction — the exact three-call shape 144-02's replaceFile test helper already proved"
    - "Multipart preview-guard check moved before any file I/O (ahead of the file-intake guard sequence) so a PREVIEW_NOT_ALLOWED_FOR_CATEGORY rejection never requires orphaned-file cleanup — a minor reordering vs. the plan's literal step numbering, applied for correctness (Rule 1)"

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_replace.go
    - backend/internal/handlers/admin_content_release_version_media_replace_test.go
  modified:
    - backend/cmd/server/admin_routes.go
    - shared/contracts/openapi.yaml

key-decisions:
  - "Category/caption/is_preview_candidate are read directly via c.GetPostForm(...) and validated inline against the existing package-level rvmValidCategories/rvmPreviewAllowedCategories maps, rather than building a map[string]interface{} to reuse parseRVMCategoryPatchField's JSON-shaped signature — both were explicitly sanctioned by the plan's interfaces block as equally acceptable, and the inline approach keeps the new file under the 450-line cap (448 lines)."
  - "A multipart form cannot express JSON's explicit null; parseRVMReplaceCaptionField treats an empty submitted caption field as 'clear the caption' (Caption=nil, CaptionSet=true) — the closest multipart equivalent to PATCH's JSON-null-means-clear contract."
  - "The preview-candidate guard (rvmCategoryAllowsPreview) runs before any file write to disk, not after (as the plan's literal step 4-then-5 ordering implies) — this avoids needing orphaned-file cleanup on a guard rejection that has nothing to do with the uploaded file's own validity."
  - "STORAGE_FAILED-class file-intake failures (open/read/mkdir/write) return HTTP 500; all other file-intake validation failures (FILE_TOO_LARGE, INVALID_MIME_TYPE, IMAGE_DECODE_FAILED, IMAGE_DIMENSIONS_TOO_LARGE, IMAGE_TOO_MANY_PIXELS, GIF_TOO_MANY_FRAMES, THUMBNAIL_FAILED) return 422 — matching the plan's explicit '422 for validation failures, 500 for STORAGE_FAILED/DB_FAILED' status-code contract."

patterns-established:
  - "Every DB-write failure branch inside the transaction calls a local cleanupNewFiles() closure (removeFileQuietly on both the new original and thumb paths) before returning an error response — mirrors processOneRVMFile's per-branch cleanup discipline without duplicating the six-line pattern six separate times."

requirements-completed:
  - "Zielbild 1 (144-CONTEXT.md): Datei ersetzen, HTTP surface"
  - "Permission — reuse, do not invent (144-VALIDATION.md cross-cutting invariant)"

duration: ~10min
completed: 2026-09-02
---

# Phase 144 Plan 04: HTTP Endpoint for Release-Version-Media File Replace Summary

**New `PUT /admin/release-versions/:versionId/media/:relationId/file` handler composes 144-02's file-swap/cleanup-enqueue repository methods with the existing SubmitMedia lifecycle call inside one transaction, reusing every multipart-intake, permission, and error-response primitive from `UploadReleaseVersionMedia`/`PatchReleaseVersionMedia` verbatim.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-02T14:35:35Z (STATE.md session, immediately after 144-03)
- **Completed:** 2026-09-02T14:42:22Z
- **Tasks:** 3/3 completed
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `ReplaceReleaseVersionMediaFile` (new file, `admin_content_release_version_media_replace.go`) reuses the exact `permissions.ActionReleaseVersionMediaUpdate` + `canMutateReleaseVersionMediaRelation` gate `PatchReleaseVersionMedia` already uses, verifying no new, weaker permission action was introduced (T-144-04-01).
- The exact multipart file-intake guard sequence (`io.LimitReader` size guard, MIME allow-list, `inspectRVMImage` dimension/GIF-frame/decompression-bomb checks, `generateRVMThumbnail`) from `processOneRVMFile` is reused verbatim, writing to a NEW `assetUUID` directory so the replacement never overwrites the relation's existing file in place (T-144-04-02).
- Inside one `BeginTx`/`Commit` block: optional metadata patch (`PatchReleaseVersionMedia`) → new `media_assets`/`media_files` rows → `h.mediaRepo.ReplaceReleaseVersionMediaFile` (swaps `media_asset_id`, `id` untouched) → `h.mediaRepo.EnqueueReleaseVersionMediaFileDeleteJob` for the old asset → `ReleaseReviewLifecycleRepository.SubmitMedia` (revision bump + pending reset) → both new rows flipped to `ready` → commit. Every DB-write failure branch cleans up the newly-written original/thumb files before returning (T-144-04-03).
- A distinct `release_version_media.file_replaced` audit event (carrying `previous_media_asset_id`) makes a file replace auditable-distinct from a metadata-only `.updated` patch (T-144-04-04).
- Route registered (`admin_routes.go`) and documented in OpenAPI (new PUT path, multipart request body, full 400/401/403/404/409/422/500 response set).
- Two new tests: a source-inspection test proving the permission-reuse invariant and the three required repository/lifecycle calls, and a bare-router 401-without-auth test matching every sibling mutation route's convention.

## Task Commits

Each task was committed atomically:

1. **Task 1: New ReplaceReleaseVersionMediaFile handler** - `b9c57618` (feat)
2. **Task 2: Route registration and OpenAPI path** - `a49287b5` (docs)
3. **Task 3: Permission-invariant test** - `6ded7b42` (test)

_No separate plan-metadata commit was made prior to this SUMMARY; this SUMMARY and STATE/ROADMAP updates are committed together as the plan-completion commit._

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media_replace.go` - New: `ReplaceReleaseVersionMediaFile`, `parseRVMReplaceCaptionField` (448 lines)
- `backend/internal/handlers/admin_content_release_version_media_replace_test.go` - New: `TestReplaceReleaseVersionMediaFileRequiresUpdatePermission`, `TestReplaceReleaseVersionMediaFileRejectsNoAuth`
- `backend/cmd/server/admin_routes.go` - New route line: `v1.PUT("/admin/release-versions/:versionId/media/:relationId/file", ...)`
- `shared/contracts/openapi.yaml` - New `PUT /api/v1/admin/release-versions/{versionId}/media/{relationId}/file` path (`operationId: replaceReleaseVersionMediaFile`)

## Decisions Made
- Kept category/caption/preview form-field parsing inline (direct `rvmValidCategories`/`rvmPreviewAllowedCategories` lookups) rather than routing through a synthesized `map[string]interface{}` to reuse `parseRVMCategoryPatchField`'s JSON-shaped signature — both were explicitly sanctioned as equally acceptable by the plan, and inline parsing kept the file at 448/450 lines.
- Moved the preview-candidate guard check ahead of the file-intake guard sequence (before any file write to disk) rather than after, per the plan's literal task-4-then-5 step numbering — see Deviations below.
- File-intake failure HTTP status split exactly as the plan specified: `STORAGE_FAILED` → 500 (open/read/mkdir/write failures), every other guard code (`FILE_TOO_LARGE`, `INVALID_MIME_TYPE`, `IMAGE_DECODE_FAILED`, `IMAGE_DIMENSIONS_TOO_LARGE`, `IMAGE_TOO_MANY_PIXELS`, `GIF_TOO_MANY_FRAMES`, `THUMBNAIL_FAILED`) → 422.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Preview-candidate guard reordered ahead of file I/O**
- **Found during:** Task 1, initial implementation
- **Issue:** The plan's task text lists file-intake guards (step 4, which writes original/thumb files to a new asset directory) before the preview-candidate guard (step 5). Implemented literally, a `PREVIEW_NOT_ALLOWED_FOR_CATEGORY` rejection at step 5 would occur AFTER two files were already written to disk, requiring the same orphaned-file cleanup every other guard failure needs — but the plan's step-5 text did not call for that cleanup, since it assumed no files existed yet at that point.
- **Fix:** Moved the preview-candidate guard (a pure category/business-logic check with no dependency on the uploaded file's bytes) to run immediately after parsing the multipart form fields, before the file-intake guard sequence begins. This is functionally equivalent (same 422 `PREVIEW_NOT_ALLOWED_FOR_CATEGORY` response, same inputs) and structurally avoids ever needing to orphan-clean a rejected-for-unrelated-reasons file.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_replace.go`
- **Commit:** `b9c57618` (applied before the task's own commit, not a follow-up)

## Issues Encountered
- Same pre-existing container source-mount limitation documented in 144-01/02/03's SUMMARYs: `docker compose exec team4sv30-backend` sees stale, pre-edit source. All `go build`/`go vet`/`go test` verification in this plan ran via the same throwaway `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -v team4s-phase143-go-mod:/go/pkg/mod -v team4s-phase143-go-build:/root/.cache/go-build -w /workspace/backend golang:1.25-alpine` container that bind-mounts the live repo directly.
- The new handler file's first draft was 452 lines (2 over the 450-line cap); trimmed the file-level doc comment from 15 lines to 11 lines to bring it to 448 lines without removing any code or test coverage.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `PUT /admin/release-versions/:versionId/media/:relationId/file` is live, registered, documented in OpenAPI, and reuses every existing permission/validation/lifecycle primitive per the plan's `must_haves`. No backend work remains for Zielbild 1/2's HTTP surface.
- 144-06 (the frontend plan that adds the file-replace control + category field to the edit drawer) can now call this endpoint directly — no further backend/contract work needed for that plan's API surface.
- No blockers for the next wave. `admin_content_release_version_media.go` (1146/1148) and `release_version_media_repository.go` (681/450 baseline, unchanged from 144-01) were not touched by this plan and remain at their existing line counts; the new handler file (448/450) and its test file have full remaining budget.

---
*Phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen*
*Completed: 2026-09-02*

## Self-Check: PASSED

All 4 claimed source/config files plus this SUMMARY found on disk; all 3 claimed task commits (b9c57618, a49287b5, 6ded7b42) found in `git log --oneline --all`.
