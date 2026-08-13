---
phase: 35-release-version-media-backend-upload-service-and-api
plan: "02"
subsystem: backend/repository
tags: [repository, media, release-version, go, sql]
dependency_graph:
  requires: []
  provides:
    - release_version_media_repository.go with all Wave-1 repository methods
    - ErrOwnershipMismatch sentinel error
  affects:
    - Plans 03 and 04 depend on all exported methods from this plan
tech_stack:
  added: []
  patterns:
    - pgx.Tx passed by caller (handlers own transaction lifecycle)
    - COALESCE in UPDATE for partial patch without dynamic SQL
    - Soft delete with deleted_at + deleted_by_user_id pattern
    - Two-query ownership validation (count by version vs total count)
key_files:
  created:
    - backend/internal/repository/release_version_media_repository.go
    - backend/internal/repository/release_version_media_repository_test.go
  modified: []
decisions:
  - ErrOwnershipMismatch added to repository package (not in errors.go since it is RVM-specific)
  - UpdateMediaAssetStatusRVMTx and UpdateMediaFileStatusRVMTx named with Tx suffix per must_haves exports list
  - CreateMediaAssetWithStatusTx added alongside CreateMediaAssetWithStatus — Tx variant delegates to tx.QueryRow, pool variant delegates to r.db.QueryRow
  - ValidateReleaseVersionMediaOwnership uses two queries to distinguish ErrNotFound (row missing/deleted) from ErrOwnershipMismatch (row exists, wrong version)
  - TestMediaRepositoryMethodSignatures references 17 methods (plan listed 14 in exports but implementation covers all including Tx variants and GetReleaseVersionMediaRelation/ValidateReleaseVersionMediaOwnership)
metrics:
  duration: 3min
  completed: "2026-05-08"
  tasks_completed: 2
  files_changed: 2
---

# Phase 35 Plan 02: Release-Version-Media Repository Methods Summary

**One-liner:** All Wave-1 release_version_media repository methods on *MediaRepository — transaction support, soft-delete, preview-candidate enforcement, ownership validation, and status-aware inserts.

## What Was Built

Added `backend/internal/repository/release_version_media_repository.go` extending the existing `*MediaRepository` type with 17 methods required by Plans 03 and 04 upload handlers.

### Input/Output Types

- `ReleaseVersionMediaCreateInput` — INSERT fields for release_version_media
- `ReleaseVersionMediaPatchInput` — partial-patch struct with nil=no-change semantics
- `ReleaseVersionMediaReorderItem` — relation ID + new sort_order pair
- `ReleaseVersionMediaItem` — read model with OriginalFilePath/ThumbFilePath from JOIN
- `ReleaseVersionMediaRelationMeta` — ownership check result (relation ID + version ID + category)

### Methods Implemented

| Method | Purpose |
|--------|---------|
| `BeginTx` | Starts pgx transaction, caller owns commit/rollback |
| `CreateReleaseVersionMediaAsset` | INSERT release_version_media, returns new ID |
| `CreateMediaAssetWithStatusTx` | INSERT media_assets with explicit status inside tx |
| `CreateMediaAssetWithStatus` | INSERT media_assets with explicit status via pool |
| `UpdateMediaAssetStatusRVMTx` | UPDATE media_assets.status inside tx |
| `UpdateMediaFileStatusRVMTx` | UPDATE media_files.status inside tx |
| `ListReleaseVersionMedia` | SELECT with media_files LEFT JOIN, non-deleted, sorted |
| `PatchReleaseVersionMedia` | UPDATE caption + is_preview_candidate via COALESCE |
| `SoftDeleteReleaseVersionMedia` | SET deleted_at + deleted_by_user_id |
| `ReorderReleaseVersionMedia` | Per-item sort_order UPDATE inside tx |
| `ClearPreviewCandidateForVersion` | SET is_preview_candidate=false WHERE id!=exclude (D-15) |
| `InsertMediaFileWithStatus` | INSERT media_files with explicit status column |
| `GetMaxRVMSortOrder` | COALESCE(MAX(sort_order), 0) for new upload sort position |
| `ReleaseVersionExistsForRVM` | EXISTS check on release_versions |
| `GetRVMCategory` | Returns category or ErrNotFound for PATCH preview validation |
| `GetReleaseVersionMediaRelation` | Returns ownership meta or ErrNotFound |
| `ValidateReleaseVersionMediaOwnership` | Count-based check returning ErrNotFound or ErrOwnershipMismatch |

### New Error Sentinel

`ErrOwnershipMismatch` — returned when relation IDs exist but belong to a different release version. Allows handlers to return a meaningful 403/422 instead of a generic 404.

## Tests

`release_version_media_repository_test.go` provides compile-time structural verification:
- `TestReleaseVersionMediaTypes` — verifies all struct fields are accessible
- `TestMediaRepositoryMethodSignatures` — verifies all 17 methods exist on *MediaRepository (compile-time check, no DB needed)
- `TestClearPreviewCandidateExists` — verifies ClearPreviewCandidateForVersion signature

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

**Minor adaptations (not deviations):**
- Test file uses `UpdateMediaAssetStatusRVMTx` and `UpdateMediaFileStatusRVMTx` (with Tx suffix) matching must_haves.artifacts.exports list, rather than the shorter names in the plan's test stub example
- `TestClearPreviewCandidateExists` kept from plan; `TestMediaRepositoryMethodSignatures` covers all 17 methods including the ones added beyond the plan's 14-item list

## Verification

```
cd backend && go build ./internal/repository/... 2>&1
# EXIT 0

cd backend && go test ./internal/repository/... -run "TestReleaseVersionMedia|TestMediaRepositoryMethod" -v 2>&1
# PASS: TestReleaseVersionMediaTypes
# PASS: TestMediaRepositoryMethodSignatures
```

## Known Stubs

None. All methods are fully implemented. Handlers in Plans 03/04 will call these methods directly.

## Self-Check: PASSED

- `backend/internal/repository/release_version_media_repository.go` — FOUND
- `backend/internal/repository/release_version_media_repository_test.go` — FOUND
- Commit `17551f73` (feat) — FOUND
- Commit `a8b2c4c6` (test) — FOUND
