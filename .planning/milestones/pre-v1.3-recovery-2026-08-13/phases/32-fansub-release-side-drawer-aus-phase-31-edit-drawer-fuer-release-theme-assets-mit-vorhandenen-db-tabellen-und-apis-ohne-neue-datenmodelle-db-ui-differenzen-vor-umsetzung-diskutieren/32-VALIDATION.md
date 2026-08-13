---
phase: 32
created: 2026-05-01
status: ready
---

# Phase 32 Validation Strategy

## Invariants

- No new DB tables are added.
- No authoritative runtime path uses `fansub_group_media` for release Theme assets.
- Theme assets write through `release_theme_assets`.
- Generic process media remains deferred.
- Fansub page does not expose Anime edit actions.
- Fansub users/admins cannot edit timeline timings in this drawer.

## Required Checks

- `Select-String -Path backend/cmd/server/admin_routes.go -Pattern "/admin/releases/:releaseid/theme-assets"` finds the direct release upload/list/delete route group.
- `Select-String -Path backend/internal/handlers/admin_content_release_theme_assets.go -Pattern "UploadReleaseThemeAssetForRelease"` finds the direct upload handler.
- `Select-String -Path frontend/src/lib/api.ts -Pattern "uploadAdminReleaseThemeAssetForRelease"` finds the frontend helper.
- `Select-String -Path frontend/src/app/admin/fansubs/[id]/edit/page.tsx -Pattern "fansubEditReleaseDrawer"` finds the drawer surface.
- `Select-String -Path frontend/src/app/admin/fansubs/[id]/edit/page.tsx -Pattern "Anime bearbeiten"` does not find an action in the Fansub release drawer.
- `cd backend && go test ./internal/handlers ./internal/repository -count=1` exits 0.
- `cd frontend && npx tsc --noEmit` exits 0.
- `docker compose build team4sv30-backend team4sv30-frontend` exits 0 if backend and frontend changed.
- `docker compose up -d team4sv30-backend team4sv30-frontend` exits 0.
- `curl.exe -I --max-time 20 http://127.0.0.1:3002/admin/fansubs/17/edit` returns `HTTP/1.1 200 OK` or status code `200`.

## Manual UAT

Use `http://127.0.0.1:3002/admin/fansubs/17/edit`.

Expected:

- `Anime & Releases` shows `11eyes`.
- Anime cards are collapsed by default.
- Opening `11eyes` shows release rows.
- Clicking row chevron opens the timeline preview.
- Clicking `Edit` opens a right Side Drawer.
- Drawer shows concrete release context.
- Drawer lets the user select OP/ED/IN context without editing timings.
- Upload/delete controls are only active for missing or release-specific slots, not Jellyfin/global locked slots.
