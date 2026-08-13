---
phase: 32
researched: 2026-05-01
status: complete
---

# Phase 32 Research

## Question

What must be known to plan a Side Drawer that edits release Theme assets without inventing a new data model?

## Current Working Code

Frontend state already exists in `frontend/src/app/admin/fansubs/[id]/edit/page.tsx`:

- `ReleaseSegmentCard`
- `SelectedReleaseSegment`
- `releaseSegmentCards`
- `releaseSegmentLoading`
- `releaseSegmentErrors`
- `selectedReleaseSegment`
- `loadReleaseSegmentCards(release)`

The current release row has an `Edit` button and a subtle right-side chevron. The chevron opens the release preview/timeline. The `Edit` button currently toggles the same release preview and can become the drawer entry.

Current timeline segment click sets `selectedReleaseSegment`. Phase 32 can reuse that state, but should move the edit surface from inline panel to Side Drawer.

## Existing API Surface

Read endpoints:

- `GET /api/v1/admin/fansubs/:id/anime`
- `GET /api/v1/admin/fansubs/:id/anime/:animeId/releases`
- `GET /api/v1/admin/releases/:releaseId`
- `GET /api/v1/admin/releases/:releaseId/theme-assets`

Existing upload/delete helpers:

- `uploadAdminReleaseThemeAsset(options)` posts to `/api/v1/admin/fansubs/:fansubID/anime/:animeID/theme-assets`.
- `deleteAdminReleaseThemeAsset(releaseID, themeID, mediaID, authToken)` deletes `/api/v1/admin/releases/:releaseID/theme-assets/:themeID/:mediaID`.

Important mismatch:

- Delete is already direct release-scoped.
- List is already direct release-scoped.
- Upload is not direct release-scoped; it resolves the canonical release by fansub/anime.

## Existing DB/Repository Support

The table `release_theme_assets` exists with:

- `release_id BIGINT NOT NULL REFERENCES fansub_releases(id) ON DELETE CASCADE`
- `theme_id BIGINT NOT NULL REFERENCES themes(id) ON DELETE CASCADE`
- `media_id BIGINT NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE`
- primary key `(release_id, theme_id, media_id)`

The repository already has:

- `ListReleaseThemeAssets(ctx, releaseID)`
- `CreateReleaseThemeAsset(ctx, AdminReleaseThemeAssetCreateInput{ReleaseID, ThemeID, MediaID})`
- `DeleteReleaseThemeAsset(ctx, releaseID, themeID, mediaID)`

`CreateReleaseThemeAsset` checks that the release anime and theme anime match. That is the correct guard for direct release upload.

## Recommended Backend Slice

Add a direct upload route:

- `POST /api/v1/admin/releases/:releaseId/theme-assets`

Payload:

- multipart form field `theme_id`
- multipart form field `file`

Behavior:

- Require admin auth.
- Parse `releaseId` from route.
- Parse `theme_id` from form.
- Save upload via the existing media service path used by `UploadReleaseThemeAsset`.
- Create `media_assets` through existing media repository.
- Link with existing `CreateReleaseThemeAsset`.
- On create failure, delete the just-created media asset and file like the existing upload path.
- Reuse the same conflict/not found response semantics.

This is not a new model. It is the smallest missing HTTP seam for the DB/repository capability that already exists.

## Frontend Drawer Slice

The Side Drawer should be a component-level UI state in `page.tsx` first:

- `drawerRelease: AdminFansubRelease | null`
- `drawerSelectedSegment: ReleaseSegmentCard | null`
- optional upload state keyed by `theme_id`

The drawer should:

- open from the release row `Edit` button.
- load segment cards if not already loaded.
- show release context without making release number prominent.
- show Timeline preview using the existing card/segment mapping.
- show selected OP/ED/IN details.
- expose upload/delete only when the selected card is not Jellyfin/global locked.

## Validation Architecture

1. Backend direct-upload route registration is grep-verifiable in `backend/cmd/server/admin_routes.go`.
2. Handler method is grep-verifiable in `backend/internal/handlers/admin_content_release_theme_assets.go`.
3. Frontend API helper is grep-verifiable in `frontend/src/lib/api.ts`.
4. Drawer CSS/classes are grep-verifiable in `FansubEdit.module.css`.
5. The old inline `Segment bearbeiten` block should be removed or no longer be the active edit surface.
6. Backend tests must cover the new direct route or at minimum route/handler source presence plus repository create path.
7. Frontend TypeScript must pass.
8. Docker deploy must return HTTP 200 for `/admin/fansubs/17/edit`.

## Risks

- Direct upload route creates an uploaded media asset before linking. It must clean up media asset and file on link failure.
- The drawer must not imply timeline edit capability.
- If current media service accepts only videos, image/GIF support belongs to generic process media later, not this Theme asset slice.
- If product expects image upload for OP/ED cards, pause before implementation because current `UploadReleaseThemeAsset` uses `SaveVideoUpload`.
