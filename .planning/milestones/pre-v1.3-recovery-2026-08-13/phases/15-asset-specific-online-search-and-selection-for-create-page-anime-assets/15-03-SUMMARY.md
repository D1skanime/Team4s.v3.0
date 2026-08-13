---
phase: 15-asset-specific-online-search-and-selection-for-create-page-anime-assets
plan: 03
subsystem: ui
tags: [nextjs, react, vitest, asset-search, create-flow]
provides:
  - "Per-slot `Online suchen` entry points on the anime create page"
  - "Source-aware asset chooser dialog with loading and selection states"
  - "Remote candidate adoption into the existing staged upload seam"
affects: [admin-create-flow, admin-ui, asset-search]
key-files:
  created:
    - frontend/src/app/admin/anime/create/CreateAssetSearchDialog.tsx
  modified:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
    - frontend/src/app/admin/anime/create/createAssetUploadPlan.ts
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.module.css
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateWorkspace.tsx
    - frontend/src/app/admin/anime/components/ManualCreate/ManualCreateAssetUploadPanel.tsx
    - frontend/src/app/admin/anime/create/createAssetUploadPlan.test.ts
    - frontend/src/app/admin/anime/create/page.test.tsx
requirements-completed: [phase-15-ui-adoption]
completed: 2026-04-13
---

# Phase 15 Plan 03 Summary

Finished the operator-facing flow on `/admin/anime/create`: every relevant slot now keeps manual upload, but also gets a dedicated online search path that feeds back into the same staged asset upload seam.

## Accomplishments
- Added `Online suchen` actions for `cover`, `banner`, `logo`, and `background`.
- Built a chooser dialog with visible source labels, preview images, busy state, and single- vs multi-select behavior by slot.
- Converted selected remote candidates into staged `File` objects locally, so the existing post-create upload/linking flow stays the single persistence path.

## Verification
- `cd frontend && npm test -- src/app/admin/anime/create/createAssetUploadPlan.test.ts src/app/admin/anime/create/page.test.tsx src/lib/api.admin-anime.test.ts`
- `cd frontend && npm run build`
