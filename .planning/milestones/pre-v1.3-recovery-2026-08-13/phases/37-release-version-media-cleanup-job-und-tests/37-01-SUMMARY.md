---
phase: 37-release-version-media-cleanup-job-und-tests
plan: "01"
subsystem: backend
tags:
  - cleanup
  - media
  - background-job
  - repository
  - services
dependency_graph:
  requires:
    - 34-01 (release_version_media schema with status columns on media_assets/media_files)
    - 35-01..04 (release_version_media handlers and repository)
  provides:
    - RVMCleanupService with three-pass cleanup (stale-processing, missing-file, soft-delete)
    - Repository seams for cleanup scans (SelectStaleProcessingRVMAssets, SelectMissingFileRVMCandidates, SelectSoftDeleteRVMCleanupCandidates)
  affects:
    - backend/internal/repository/release_version_media_cleanup.go (new)
    - backend/internal/services/release_version_media_cleanup.go (new)
    - backend/cmd/server/main.go (periodic ticker goroutine added)
tech_stack:
  added: []
  patterns:
    - "time.Ticker background goroutine in main.go for periodic cleanup"
    - "RVMCleanupStore interface decouples service from *MediaRepository for testability"
    - "Mock-based unit tests without DB access (consistent with media_upload_test.go pattern)"
key_files:
  created:
    - backend/internal/repository/release_version_media_cleanup.go
    - backend/internal/repository/release_version_media_cleanup_test.go
    - backend/internal/services/release_version_media_cleanup.go
    - backend/internal/services/release_version_media_cleanup_test.go
  modified:
    - backend/cmd/server/main.go
decisions:
  - "RVMCleanupStore interface defined in services package so the cleanup service does not depend directly on *MediaRepository — enables mock-based testing without DB"
  - "removeFileQuietly in services/release_version_media_cleanup.go reuses log-and-ignore pattern (not a shared helper) to avoid coupling across packages"
  - "HardDeleteRVMAndAsset uses a transaction to atomically remove media_files, release_version_media, and media_assets rows — prevents partial deletes"
  - "IsMediaAssetReferencedByOtherRVM is called at runtime by the cleanup service as a race-condition guard even though SelectSoftDeleteRVMCleanupCandidates already enforces this at SQL level"
  - "Periodic ticker goroutine in main.go does not use context cancellation for shutdown — cleanup is best-effort and the ticker fires infrequently enough that in-flight work completes before OS kills the process"
metrics:
  duration: "~25 minutes"
  completed_date: "2026-05-08"
  tasks: 2
  files: 5
---

# Phase 37 Plan 01: RVM Cleanup Foundation Summary

Periodic cleanup seam for release-version media using repository scan methods and a three-pass background service wired via time.Ticker into main.go.

## Tasks Completed

### Task 1: Repository Cleanup Seams (TDD)

Added four new query methods and three helper mutation methods to `*MediaRepository` via a dedicated file `release_version_media_cleanup.go`:

- `SelectStaleProcessingRVMAssets(ctx, staleAge)` — selects media_assets in status='processing' older than staleAge that are referenced by at least one release_version_media row
- `SelectMissingFileRVMCandidates(ctx)` — selects media_files rows for RVM-referenced assets not yet marked missing/deleted
- `SelectSoftDeleteRVMCleanupCandidates(ctx)` — selects soft-deleted RVM rows whose media_asset is NOT referenced by any other active RVM row (SQL-enforced via NOT EXISTS subquery)
- `IsMediaAssetReferencedByOtherRVM(ctx, assetID, excludeRelationID)` — runtime safety check for shared-asset guard
- `MarkMediaAssetStatusByID`, `MarkMediaFileMissing`, `HasReadyMediaFileForAsset`, `HardDeleteRVMAndAsset` — mutation helpers used by the cleanup service

Tests in `release_version_media_cleanup_test.go` verify struct fields, method signatures at compile time, and the no-shared-asset invariant contract.

**Commit:** `36550e4f`

### Task 2: Cleanup Service and Periodic Runner (TDD)

Created `backend/internal/services/release_version_media_cleanup.go` with `RVMCleanupService`:

- **Pass 1 — Stale Processing:** assets in 'processing' beyond 30 min → mark 'failed', remove staging file
- **Pass 2 — Missing Files:** absent physical files → mark file 'missing', escalate asset to 'failed' when no ready variant remains
- **Pass 3 — Soft Delete:** exclusively-owned soft-deleted RVM rows → remove original+thumb files, hard-delete DB rows; runtime reference check prevents deletion of shared assets

Added `time.Ticker` goroutine in `backend/cmd/server/main.go` that fires every 10 minutes.

Mock-based tests cover all four behavioural paths including the shared-asset skip case.

**Commit:** `34b0c199`

## Deviations from Plan

### Pre-existing Build Constraint

The `cmd/server` binary cannot be built on Windows because `admin_content_release_version_media.go` uses govips v2 API symbols (`vips.NewImportParams`, `vips.NewImageFromBuffer`, etc.) that are unavailable in the Windows govips build. This is a pre-existing condition inherited from Phase 35 and is not caused by this plan's changes. The planned verification command `go test ./internal/services/... ./cmd/server/... -count=1` was adapted to `go test ./internal/repository/... ./internal/services/... -count=1` which passes fully. The server is built and run exclusively in Docker (Linux with libvips installed).

**[Rule 2 - Missing functionality]** `HardDeleteRVMAndAsset` uses a transaction to atomically delete media_files, release_version_media, and media_assets. The plan described physical delete + DB cleanup but did not specify transaction scope. Added to ensure no partial-delete state is left on DB failure.

**[Rule 2 - Missing functionality]** `removeFileQuietly` is package-private in the services package (not using `cleanupStoragePath` from handlers package) to avoid introducing a cross-package dependency. Named consistently with the plan's reference to `removeFileQuietly`-style semantics.

## Verification

```
cd backend && go test ./internal/repository/... ./internal/services/... -count=1
```

Both packages pass:
- `ok team4s.v3/backend/internal/repository`
- `ok team4s.v3/backend/internal/services`

Cleanup-specific passing tests:
- TestStaleProcessingCleanupCandidateFields
- TestMissingFileCleanupCandidateFields
- TestSoftDeleteCleanupCandidateFields
- TestMediaRepositoryCleanupMethodSignatures
- TestSoftDeleteCandidateNoSharedAsset
- TestRVMCleanupService_StaleProcessing
- TestRVMCleanupService_MissingFile
- TestRVMCleanupService_MissingFile_ReadyVariantExists
- TestRVMCleanupService_SoftDelete
- TestRVMCleanupService_SoftDelete_SharedAsset
- TestRVMCleanupServiceConstructor

## Known Stubs

None — cleanup service is fully wired and all three passes are implemented.
