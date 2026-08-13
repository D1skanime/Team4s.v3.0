---
phase: 35-release-version-media-backend-upload-service-and-api
plan: "04"
subsystem: backend
tags: [handler, route-registration, release-version-media, PATCH, DELETE, list, reorder, transaction]
dependency_graph:
  requires: [35-01, 35-02, 35-03]
  provides: [ListReleaseVersionMedia, PatchReleaseVersionMedia, DeleteReleaseVersionMedia, ReorderReleaseVersionMedia, all-5-routes-registered]
  affects:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/cmd/server/admin_routes.go
tech_stack:
  added: []
  patterns:
    - buildRVMPublicURL strips mediaStorageDir prefix to produce /media/... public URLs
    - D-14 CATEGORY_CHANGE_NOT_ALLOWED via raw JSON map key detection before typed parse
    - D-16 PREVIEW_NOT_ALLOWED_FOR_CATEGORY via rvmPreviewAllowedCategories map check
    - D-15 ClearPreviewCandidateForVersion called transactionally when is_preview_candidate=true
    - route ownership validated via GetReleaseVersionMediaRelation before any PATCH/DELETE side effects
    - ValidateReleaseVersionMediaOwnership called before ReorderReleaseVersionMedia transaction
    - /reorder registered before /:relationId for correct Gin literal-before-param matching
key_files:
  created: []
  modified:
    - backend/internal/handlers/admin_content_release_version_media.go
    - backend/cmd/server/admin_routes.go
decisions:
  - errors import added to handler file to support errors.Is(err, repository.ErrNotFound) and errors.Is(err, repository.ErrOwnershipMismatch)
  - buildRVMPublicURL appended as method on AdminContentHandler (not a package-level function) to access h.mediaStorageDir
  - D-14 implemented by unmarshalling to map[string]interface{} first to detect raw "category" key presence before typed binding
  - GetReleaseVersionMediaRelation used for both route ownership check and category lookup in PatchReleaseVersionMedia, sharing one DB round-trip
  - /reorder route registered before /:relationId in admin_routes.go per plan note about Gin literal-before-param matching
metrics:
  duration: "15 minutes"
  completed: "2026-05-08"
  tasks_completed: 2
  files_modified: 2
---

# Phase 35 Plan 04: List, Patch, Delete, Reorder Handlers + Route Registration Summary

4 remaining handler methods (List, Patch, Delete, Reorder) appended to the Plan 03 handler file, plus all 5 release-version media routes registered in admin_routes.go, completing the full backend API surface for release-version media.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement List, Patch, Delete, Reorder handler methods | 203c8b45 | backend/internal/handlers/admin_content_release_version_media.go |
| 2 | Register all 5 routes in admin_routes.go | 78efed4b | backend/cmd/server/admin_routes.go |

## What Was Built

### Task 1 — 4 remaining handler methods

**`buildRVMPublicURL` helper:**
- Method on `AdminContentHandler` — strips `h.mediaStorageDir` prefix from storage paths, normalizes backslashes, prepends `/media/`
- Used in `ListReleaseVersionMedia` to populate `ThumbnailURL` and `OriginalURL` on each item

**`ListReleaseVersionMedia` (GET /admin/release-versions/:versionId/media):**
- Calls `h.mediaRepo.ListReleaseVersionMedia(ctx, versionID)` to fetch non-deleted items ordered by sort_order
- Iterates items and sets `OriginalURL` and `ThumbnailURL` from storage paths via `buildRVMPublicURL`
- Returns `{"data": [...]}`

**`PatchReleaseVersionMedia` (PATCH /admin/release-versions/:versionId/media/:relationId):**
- Loads relation via `GetReleaseVersionMediaRelation` — provides route ownership check AND category lookup in one query
- D-14: detects `"category"` key in raw `map[string]interface{}` body → 422 `CATEGORY_CHANGE_NOT_ALLOWED`
- D-16: checks `rvmPreviewAllowedCategories[relationMeta.Category]` when `is_preview_candidate=true` → 422 `PREVIEW_NOT_ALLOWED_FOR_CATEGORY` for `fun_outtake` and `other`
- D-15: when setting preview, calls `ClearPreviewCandidateForVersion` + `PatchReleaseVersionMedia` in same transaction
- Non-preview updates also use a transaction for consistency

**`DeleteReleaseVersionMedia` (DELETE /admin/release-versions/:versionId/media/:relationId):**
- Route ownership check via `GetReleaseVersionMediaRelation` before soft-delete
- Calls `SoftDeleteReleaseVersionMedia(ctx, relationID, identity.UserID)` — sets `deleted_at` + `deleted_by_user_id`
- Returns `{"status": "deleted"}`

**`ReorderReleaseVersionMedia` (POST /admin/release-versions/:versionId/media/reorder):**
- Parses `{"items": [{"id": ..., "sort_order": ...}]}` body
- Calls `ValidateReleaseVersionMediaOwnership` BEFORE any transaction — returns 404 if any ID belongs to wrong version
- Executes `ReorderReleaseVersionMedia(ctx, tx, items)` in a single transaction

### Task 2 — 5 route registrations in admin_routes.go

All 5 routes appended after the existing `DeleteReleaseThemeAsset` registration:

```
POST   /admin/release-versions/:versionId/media             → UploadReleaseVersionMedia
GET    /admin/release-versions/:versionId/media             → ListReleaseVersionMedia
POST   /admin/release-versions/:versionId/media/reorder     → ReorderReleaseVersionMedia
PATCH  /admin/release-versions/:versionId/media/:relationId → PatchReleaseVersionMedia
DELETE /admin/release-versions/:versionId/media/:relationId → DeleteReleaseVersionMedia
```

`/reorder` registered before `/:relationId` per plan note on Gin literal-before-param matching.

## Build Constraint Note

Same CGO constraint as Plan 03: the handlers package uses govips which requires CGO + libvips (only available in Docker with `CGO_ENABLED=1` + `vips-dev`). Local Windows builds fail with govips symbol undefined errors. This is expected and documented in Plan 01/RESEARCH.md.

The CGO-free packages (repository, models) build cleanly. Full backend build including govips succeeds in Docker.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — all 4 handler methods are fully implemented with business rules D-14, D-15, D-16, route ownership validation, and transaction management. All 5 routes are registered.

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| backend/internal/handlers/admin_content_release_version_media.go (List method) | FOUND |
| backend/internal/handlers/admin_content_release_version_media.go (Patch method) | FOUND |
| backend/internal/handlers/admin_content_release_version_media.go (Delete method) | FOUND |
| backend/internal/handlers/admin_content_release_version_media.go (Reorder method) | FOUND |
| CATEGORY_CHANGE_NOT_ALLOWED in Patch | FOUND |
| PREVIEW_NOT_ALLOWED_FOR_CATEGORY in Patch | FOUND |
| ClearPreviewCandidateForVersion in Patch | FOUND |
| GetReleaseVersionMediaRelation in Patch and Delete | FOUND |
| ValidateReleaseVersionMediaOwnership in Reorder | FOUND |
| buildRVMPublicURL in ListReleaseVersionMedia | FOUND |
| No DB2 direct pool access | CONFIRMED |
| 5 release-versions routes in admin_routes.go | FOUND (grep count = 5) |
| reorder before :relationId in routes | CONFIRMED (line 107 vs 108-109) |
| Commit 203c8b45 (List/Patch/Delete/Reorder handlers) | FOUND |
| Commit 78efed4b (5 route registrations) | FOUND |
</content>
</invoke>