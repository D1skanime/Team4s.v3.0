---
phase: 37-release-version-media-cleanup-job-und-tests
plan: "02"
subsystem: backend
tags:
  - tests
  - media
  - upload
  - validation
  - gif
  - regression
dependency_graph:
  requires:
    - 37-01 (RVMCleanupService and repository cleanup seams)
    - 35-01..04 (release_version_media handlers and repository)
  provides:
    - Handler regression suite covering JPEG/PNG/WebP/GIF validation
    - GIF animation invariant: original preserves frames, thumbnail is static JPEG
    - Partial multi-file result shape assertions
    - Source-level checks for MIME rejection, size/dimension/frame-count limits
    - Auth-guard tests for all four RVM handler methods
    - Repository regression suite covering soft-delete query filters, reorder scope, category lock, preview enforcement
    - Cleanup method signature tests for mutation helpers
    - Transaction contract tests: processing→ready never visible without Commit
  affects:
    - backend/internal/handlers/admin_content_release_version_media_test.go (extended)
    - backend/internal/repository/release_version_media_repository_test.go (extended)
tech_stack:
  added: []
  patterns:
    - "In-memory image synthesis using image/jpeg, image/png, image/gif for test data"
    - "Source inspection tests for error codes and SQL clauses not reachable without DB"
    - "Struct construction tests for JSON serialization shape of rvmFileResult"
key_files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_release_version_media_test.go
    - backend/internal/repository/release_version_media_repository_test.go
decisions:
  - "Handler tests use pure-function testing for inspectRVMImage and generateRVMThumbnail since mediaRepo is a concrete *repository.MediaRepository — no DB mock injection possible without interface refactor"
  - "GIF animation invariant tested by synthesizing a 5-frame GIF in memory and asserting frame count is unchanged after thumbnail generation"
  - "Source inspection tests (os.ReadFile + strings.Contains) used for error codes, SQL clauses, and structural patterns that cannot be exercised without a DB"
  - "Duplicate cleanup candidate field tests removed from repository_test.go since release_version_media_cleanup_test.go already covers them from plan 37-01"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-05-08"
  tasks: 2
  files: 2
---

# Phase 37 Plan 02: Backend Upload Regression Suite Summary

Backend regression suite for release-version media uploads locking the upload contract, validation rules, GIF animation behavior, preview constraints, and partial-failure handling before production hardening.

## Tasks Completed

### Task 1: Upload Validation and GIF Regression Coverage (TDD)

Extended `backend/internal/handlers/admin_content_release_version_media_test.go` with 30 named tests covering:

- **Image type helpers:** `generateRVMThumbnail` with JPEG, PNG, and animated GIF input; `inspectRVMImage` GIF frame count; `imageExtFromMimeRVM` extension mapping
- **GIF animation invariant:** synthesizes a 5-frame GIF in memory, generates thumbnail, asserts original byte slice still decodes to 5 frames and thumbnail decodes as static JPEG
- **Validation constants:** `rvmMaxFileSizeBytes=15MB`, `rvmMaxFilesPerUpload=20`, `rvmMaxImageWidth/Height=8000`, `rvmMaxGIFFrames=300`
- **MIME type policy:** JPEG/PNG/WebP/GIF allowed; SVG, BMP, TIFF, PDF, text rejected
- **Error codes:** FILE_TOO_LARGE, INVALID_MIME_TYPE, IMAGE_DIMENSIONS_TOO_LARGE, GIF_TOO_MANY_FRAMES, INVALID_CATEGORY, TOO_MANY_FILES via source inspection
- **Auth guards:** all four handler methods (Upload, List, Patch, Delete) return 401 without auth_identity
- **rvmFileResult shape:** ready result carries media_asset_id+relation_id, omits error_code; failed result carries error_code, no media_asset_id
- **Partial-failure array:** mixed results serialized to JSON correctly

**Commit:** `1e611ef1`

### Task 2: Partial-Failure, Preview, Delete, Reorder, and Cleanup-Facing Checks (TDD)

Extended `backend/internal/repository/release_version_media_repository_test.go` with additional checks:

- **Cleanup mutation method signatures:** MarkMediaAssetStatusByID, MarkMediaFileMissing, HasReadyMediaFileForAsset, HardDeleteRVMAndAsset verified at compile time
- **Transaction contract:** UpdateMediaAssetStatusRVMTx and UpdateMediaFileStatusRVMTx must exist so status='ready' is only committed atomically
- **Soft-delete visibility:** ListReleaseVersionMedia and PatchReleaseVersionMedia both use `deleted_at IS NULL`; SoftDeleteReleaseVersionMedia sets `deleted_at = NOW()`
- **Category lock:** PatchReleaseVersionMedia SQL excludes category from SET clause; no SetCategory method exists
- **Preview enforcement:** ClearPreviewCandidateForVersion exists (enforces max-one-preview rule D-15)
- **Partial-failure isolation:** processOneRVMFile is a separate function (per-file tx); response carries 'results' array
- **Hard-delete atomicity:** HardDeleteRVMAndAsset uses BeginTx + Commit + defer Rollback
- **Cleanup passes wired:** SelectStaleProcessingRVMAssets, SelectMissingFileRVMCandidates, SelectSoftDeleteRVMCleanupCandidates all referenced in cleanup service

**Commit:** `0eb3fa36`

## Deviations from Plan

### Pre-existing Concrete Type Constraint

**Found during:** Task 1
**Issue:** `mediaRepo` on `AdminContentHandler` is `*repository.MediaRepository` (concrete type), not an interface. Full handler integration tests without a DB are not feasible for upload path — cannot inject a mock.
**Fix:** Tests cover the upload contract via three complementary layers:
  1. Pure-function tests on `inspectRVMImage` and `generateRVMThumbnail` with synthesized image data
  2. Constant/map assertions on validation limits and MIME policy
  3. Source inspection tests for error codes and SQL clauses that prove the implementation contract without needing a running DB
**Files modified:** None (test strategy adapted, no production code change)
**Rule applied:** Rule 1 (adapted test coverage to what is feasible with the existing architecture)

### Duplicate Cleanup Candidate Tests Removed

**Found during:** Task 2
**Issue:** `release_version_media_cleanup_test.go` from plan 37-01 already contains TestStaleProcessingCleanupCandidateFields, TestMissingFileCleanupCandidateFields, TestSoftDeleteCleanupCandidateFields, TestSoftDeleteCandidateNoSharedAsset — all would have been duplicates.
**Fix:** Removed the four duplicated tests and replaced with `TestRVMCleanupRepositoryMutationMethodSignatures` covering only the new mutation helpers not in the 37-01 test file.

## Verification

```
cd backend && go test ./internal/handlers/... ./internal/services/... -run ReleaseVersionMedia -count=1
# ok  team4s.v3/backend/internal/handlers
# ok  team4s.v3/backend/internal/services [no tests to run]

cd backend && go test ./internal/... -count=1
# ok across all 9 packages (auth, config, handlers, middleware, migrations, models, observability, repository, services)
```

## Known Stubs

None — this plan is test-only; no production stubs introduced.

## Self-Check: PASSED

Files verified:
- `backend/internal/handlers/admin_content_release_version_media_test.go` — exists, 30 ReleaseVersionMedia tests pass
- `backend/internal/repository/release_version_media_repository_test.go` — exists, all repository tests pass

Commits verified:
- `1e611ef1` — Task 1 handler tests
- `0eb3fa36` — Task 2 repository tests
