---
phase: 32
plan: "01"
subsystem: backend-admin-release-theme-assets
tags: [fansub, releases, theme-assets, upload-api]
key_files:
  modified:
    - backend/cmd/server/admin_routes.go
    - backend/internal/handlers/admin_content_release_theme_assets.go
    - backend/internal/handlers/admin_content_fansub_releases_test.go
    - frontend/src/lib/api.ts
verification:
  - cd backend && go test ./internal/handlers ./internal/repository -count=1
  - cd frontend && npx tsc --noEmit
completed_date: "2026-05-01"
---

# Phase 32 Plan 01 Summary

Built the missing direct release-scoped Theme asset upload seam.

Implemented:

- `POST /api/v1/admin/releases/:releaseId/theme-assets`
- `UploadReleaseThemeAssetForRelease`
- `uploadAdminReleaseThemeAssetForRelease`
- route/source tests covering the direct route and handler

The new path reuses `media_assets`, uploaded media files, and `release_theme_assets`. It does not add schema and does not use `fansub_group_media`.

## Self-Check: PASSED

Backend handler/repository tests and frontend TypeScript passed.
