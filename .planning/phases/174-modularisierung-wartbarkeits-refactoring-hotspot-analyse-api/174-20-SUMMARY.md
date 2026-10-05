---
phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api
plan: 20
subsystem: api
tags: [go, gin, handlers, refactoring, release-version-media, permissions]

# Dependency graph
requires:
  - phase: 174-14
    provides: "the established rvm-prefix sibling-file split convention (_category.go, _display.go, _highlight.go, _reorder.go, _replace.go, _replace_display.go) extended by this plan"
provides:
  - "admin_content_release_version_media.go reduced from 1,358 lines to a 37-line package-level constants/allow-lists remainder"
  - "7 new rvm sibling files (upload, upload_process, permissions, list, patch, delete, capabilities) each under the project's 450-line ceiling"
  - "byte-for-byte-verified relocation of the rights-adjacent permission-annotation cluster (D-16, T-174-04-01)"
affects: [174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api]

# Tech tracking
tech-stack:
  added: []
  patterns: ["rvm-prefix sibling-file split by HTTP sub-concern within package handlers, extended to upload/permissions/list/patch/delete/capabilities"]

key-files:
  created:
    - backend/internal/handlers/admin_content_release_version_media_upload.go
    - backend/internal/handlers/admin_content_release_version_media_upload_process.go
    - backend/internal/handlers/admin_content_release_version_media_permissions.go
    - backend/internal/handlers/admin_content_release_version_media_list.go
    - backend/internal/handlers/admin_content_release_version_media_patch.go
    - backend/internal/handlers/admin_content_release_version_media_delete.go
    - backend/internal/handlers/admin_content_release_version_media_capabilities.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go

key-decisions:
  - "Split the upload cluster into two sibling files (upload.go + upload_process.go) instead of the plan's literal single-file instruction, because moving processOneRVMFile verbatim into one upload file would have produced 557 lines, violating CLAUDE.md's 450-line modularity ceiling"
  - "Left package-level consts/vars (rvmMaxFileSizeBytes, rvmMaxFilesPerUpload, rvmMaxImageWidth, rvmMaxImageHeight, rvmMaxGIFFrames, rvmThumbnailWidth, rvmAllowedMIMETypes, rvmValidCategories, rvmPreviewAllowedCategories) in the core file as the plan's anticipated 'small shared remainder', since they are used across upload.go, category.go, replace.go, and fansub_media_*.go"
  - "parseOptionalCaptionField/parseOptionalRVMStringField/parseOptionalRVMTitleField moved to the Patch cluster file (not Upload), confirmed via grep that their only in-file caller was PatchReleaseVersionMedia"

patterns-established:
  - "rvm sibling-file split: HTTP-parsing/validation/mapping/business-logic/persistence/response concerns separated per file, same package handlers, no new service layer, AdminContentHandler receiver kept"

requirements-completed: [D-16, D-17, D-02, D-19, D-22]

# Metrics
duration: 13min
completed: 2026-10-05
---

# Phase 174 Plan 20: Split admin_content_release_version_media.go remaining clusters Summary

**Split the 1,358-line `admin_content_release_version_media.go` into 7 sibling files by HTTP sub-concern (upload, upload-processing, permission-annotation, list, patch, delete, capabilities), with the rights-adjacent permission cluster verified byte-for-byte identical via diff.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-10-05T15:40:00Z
- **Completed:** 2026-10-05T15:53:00Z
- **Tasks:** 3
- **Files modified:** 8 (1 core file modified, 7 new sibling files created)

## Accomplishments
- `admin_content_release_version_media.go` reduced from 1,358 lines to 37 lines, holding only the package-level constants/allow-lists shared across multiple rvm sibling files (upload, category, replace)
- Upload cluster (`rvmImageMetadata`/`rvmFileResult` types, `imageExtFromMimeRVM`, `inspectRVMImage`, `generateRVMThumbnail`, `UploadReleaseVersionMedia`, `processOneRVMFile`, `buildRVMPublicURL`) relocated into two sibling files (`_upload.go` + `_upload_process.go`) to respect the 450-line ceiling
- Rights-adjacent permission-annotation cluster (`releaseVersionMediaHasAllScope`, `canMutateReleaseVersionMediaRelation`, `annotateReleaseVersionMediaItemPermissions`, `annotateReleaseVersionMediaItemPermissionsBatch`, etc.) relocated to `_permissions.go` with explicit byte-for-byte diff verification against the pre-move source (T-174-04-01)
- Confirmed `annotateReleaseVersionMediaItemPermissionsBatch`'s call site in `ListReleaseVersionMedia` remains a single batch call, not a per-item loop (D-17, T-174-04-02)
- List, patch, delete, and capabilities clusters each relocated into their own sibling file following the existing `_highlight.go`/`_category.go`/`_replace.go` convention (D-16)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the upload cluster** - `0ef264cd` (refactor)
2. **Task 2: Extract the permission-annotation and list clusters with explicit SQL/logic-diff verification** - `0730ca22` (refactor)
3. **Task 3: Extract patch, delete, and capabilities clusters, finalize, and run the full gate** - `fa404e24` (refactor, includes the additional 450-line-ceiling split of `processOneRVMFile`)

_Note: Task 3's commit includes the CLAUDE.md-driven upload/upload_process split described in Deviations below._

## Files Created/Modified
- `backend/internal/handlers/admin_content_release_version_media.go` - reduced to the shared rvm constants/allow-lists remainder (37 lines)
- `backend/internal/handlers/admin_content_release_version_media_upload.go` - image inspection/thumbnail helpers, `UploadReleaseVersionMedia`, `buildRVMPublicURL` (276 lines)
- `backend/internal/handlers/admin_content_release_version_media_upload_process.go` - `processOneRVMFile` (per-file upload processing: storage, DB tx, review-lifecycle submission) (296 lines)
- `backend/internal/handlers/admin_content_release_version_media_permissions.go` - the rights-adjacent permission-annotation cluster (235 lines)
- `backend/internal/handlers/admin_content_release_version_media_list.go` - `ListReleaseVersionMedia`, `loadReleaseVersionMediaResponseItem` (124 lines)
- `backend/internal/handlers/admin_content_release_version_media_patch.go` - PATCH body-parsing helpers + `PatchReleaseVersionMedia` (263 lines)
- `backend/internal/handlers/admin_content_release_version_media_delete.go` - `DeleteReleaseVersionMedia` (96 lines)
- `backend/internal/handlers/admin_content_release_version_media_capabilities.go` - `releaseVersionCapabilitiesResponse`, `GetReleaseVersionCapabilities` (110 lines)

## Decisions Made
- Package-level consts/vars (file size, image dimension, GIF frame, thumbnail width limits; MIME and category allow-lists) stayed in the core file rather than being folded into one of the new sibling files, because they are consumed by multiple existing files (`_category.go`, `_replace.go`, `fansub_media_upload.go`, `fansub_media_helpers.go`, `image_animated_webp.go`) outside this plan's scope — matching the plan's "small shared remainder" allowance.
- `parseOptionalCaptionField`/`parseOptionalRVMStringField`/`parseOptionalRVMTitleField` were placed in the Patch cluster file, not Upload, based on grep evidence that their only in-file caller was `PatchReleaseVersionMedia` (as the plan instructed verifying before placement).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - CLAUDE.md modularity ceiling] Split the upload cluster into two files instead of one**
- **Found during:** Task 3 (final gate check)
- **Issue:** The plan's Task 1 instructed moving the entire upload cluster (types, helpers, `UploadReleaseVersionMedia`, `processOneRVMFile`, `buildRVMPublicURL`) verbatim into a single `admin_content_release_version_media_upload.go`. Doing so literally produced a 557-line file, exceeding CLAUDE.md's hard "Production code files should stay at or below 450 lines" constraint, which takes precedence over plan instructions per the project's CLAUDE.md enforcement rule.
- **Fix:** Extracted `processOneRVMFile` (the long per-file upload-processing function: MIME/dimension/GIF-frame validation, thumbnail/display generation, storage writes, DB transaction, review-lifecycle submission) verbatim into a new sibling file `admin_content_release_version_media_upload_process.go`, leaving `admin_content_release_version_media_upload.go` at 276 lines and the new file at 296 lines — both under the ceiling. No logic was changed, only file placement; imports were trimmed per-file to only what each file's remaining content actually uses.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_upload.go`, `backend/internal/handlers/admin_content_release_version_media_upload_process.go` (new)
- **Verification:** `go build ./...` succeeds; `go test ./internal/handlers/... -run "ReleaseVersionMedia" -v` passes all upload-related tests unchanged; `wc -l` confirms both files are under 450 lines.
- **Committed in:** `fa404e24` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 CLAUDE.md modularity enforcement)
**Impact on plan:** Necessary to satisfy the project's hard file-size constraint; no behavior change, no scope creep — the plan's own objective text anticipated "6 new sibling files" might need adjustment and explicitly allowed a "small shared remainder," and this deviation is the file-size-driven corollary of the same instinct (one extra sibling file instead of a 557-line monolith).

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `admin_content_release_version_media.go` and its 7 (now effectively 8, counting the deviation split) sibling files are each well under the 450-line ceiling, with every cluster's boundary following the project's existing `rvm`-prefix naming convention.
- The rights-adjacent permission-annotation cluster was verified byte-for-byte unchanged, so no new authorization risk was introduced by the move.
- `go build ./...` and the full existing rvm test suite (`admin_content_release_version_media{,_title,_category,_highlight,_replace}_test.go`) pass unchanged; the pre-existing `TestPhase136ContractParity`/`openapi.yaml` duplicate-mapping-key test failures are unrelated to this plan's scope (shared/contracts/openapi.yaml parsing) and were not touched.

---
*Phase: 174-modularisierung-wartbarkeits-refactoring-hotspot-analyse-api*
*Completed: 2026-10-05*

## Self-Check: PASSED

All 8 created/modified files verified present on disk; all 4 commit hashes
(0ef264cd, 0730ca22, fa404e24, 0530c108) verified present in `git log`.
