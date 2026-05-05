---
phase: 32
plan: "02"
subsystem: frontend-admin-fansub-release-drawer
tags: [fansub, releases, side-drawer, theme-assets, deploy]
key_files:
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/FansubEdit.module.css
    - frontend/src/lib/api.ts
verification:
  - cd backend && go test ./internal/handlers ./internal/repository -count=1
  - cd frontend && npx tsc --noEmit
  - docker compose build --progress=plain team4sv30-backend team4sv30-frontend
  - docker compose up -d team4sv30-backend team4sv30-frontend
  - Invoke-WebRequest http://127.0.0.1:3002/admin/fansubs/17/edit
completed_date: "2026-05-01"
---

# Phase 32 Plan 02 Summary

Built the Fansub Release Side Drawer.

Implemented:

- Release row `Edit` opens a right Side Drawer.
- Row chevron remains the subtle release preview expander.
- Drawer has `Details`, `Theme Assets`, and `Historie` tabs.
- `Theme Assets` shows the release timeline context and selected OP/ED/IN details.
- Timeline timings are read-only.
- Global/Jellyfin slots show locked copy and no upload override action.
- Missing/release-specific slots can upload through `uploadAdminReleaseThemeAssetForRelease`.
- Release-specific assets can be removed through `deleteAdminReleaseThemeAsset`.

No Anime edit action was added. No new DB table was added. The drawer uses `release_theme_assets` plus existing media upload storage.

## Self-Check: PASSED

Automated checks, Docker build, Docker deploy, and HTTP smoke test passed. Manual browser UAT is still recommended for visual polish and upload behavior.
