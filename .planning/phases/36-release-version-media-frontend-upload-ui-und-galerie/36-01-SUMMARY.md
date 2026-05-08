---
phase: 36-release-version-media-frontend-upload-ui-und-galerie
plan: "01"
subsystem: frontend
tags: [release-version-media, types, api, hook, drawer, editor-tab]
dependency_graph:
  requires: [Phase 35 backend endpoints]
  provides: [ReleaseVersionMedia types, API helpers, useReleaseVersionMedia hook, drawer summary, editor Media/Assets tab]
  affects: [fansub release drawer, episode-version editor]
tech_stack:
  added: []
  patterns: [XHR upload with FormData, React useEffect data hook, CSS module tab extension]
key_files:
  created:
    - frontend/src/types/releaseVersionMedia.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/fansubs/[id]/edit/page.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditor.module.css
decisions:
  - Drawer media tab re-enabled (was disabled: true) to surface ReleaseVersionMediaDrawerSummary
  - versionId in drawer summary uses drawerRelease.release_id as the release-version context mapping
  - useReleaseVersionMedia uses reloadKey pattern for imperative reload without external trigger
metrics:
  duration: 4min
  completed: 2026-05-08
  tasks: 2
  files: 7
---

# Phase 36 Plan 01: Frontend Foundation — Types, Hook, Drawer Summary, Editor Tab Shell

Shared frontend foundation for release-version media: typed DTOs, XHR-based API helpers, one shared data hook, compact drawer summary (counts + mini-thumbnails + CTA only), and the Media/Assets tab shell wired into the episode-version editor with a visible context card.

## Tasks Completed

### Task 1: Types + API helpers
- Created `frontend/src/types/releaseVersionMedia.ts` with all Phase-35 DTOs: `ReleaseVersionMediaItem`, `ReleaseVersionMediaCategory`, `RELEASE_VERSION_MEDIA_CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_ALLOWS_PREVIEW`, `ReleaseVersionMediaListResponse`, `ReleaseVersionMediaUploadResponse`, `ReleaseVersionMediaUploadResult`, `ReleaseVersionMediaPatchRequest`, `ReleaseVersionMediaReorderRequest`
- Added five typed helpers to `api.ts`: `getReleaseVersionMedia`, `uploadReleaseVersionMedia`, `patchReleaseVersionMediaItem`, `deleteReleaseVersionMediaItem`, `reorderReleaseVersionMedia`
- Upload helper follows exact XHR+FormData pattern from `uploadAdminReleaseThemeAssetForRelease`
- Commit: b198b86b

### Task 2: Hook + Drawer Summary + Editor Tab Shell
- Created `useReleaseVersionMedia.ts`: fetches on mount and on `versionId` change, exposes `reload()` for post-upload/post-delete; no upload or patch logic yet
- Created `ReleaseVersionMediaDrawerSummary.tsx`: calls `useReleaseVersionMedia`, shows per-category counts (zero as "–"), up to 3 mini-thumbnails (32x32), preview status badge, and `<Link>` CTA to `/admin/episode-versions/${versionId}/edit/?tab=media`
- Wired drawer summary into `page.tsx` media tab panel (tab re-enabled from `disabled: true`)
- Extended `ActiveTab` union in editor with `'media'`, added "Media / Assets" tab button after "Segmente"
- Added media tab panel with context card showing `groupName` and `segmentVersion`
- `?tab=media` URL param sets initial active tab to media
- Added CSS classes: `mediaContextCard`, `mediaContextLabel`, `mediaContextValue`, `mediaUploadShell`, `mediaGalleryShell`
- Commit: 70a2af2e

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `mediaUploadShell` section in editor: placeholder text "Upload-Flow wird in Plan 02 verdrahtet." — intentional, filled by Plan 02
- `mediaGalleryShell` section in editor: placeholder text "Galerie wird in Plan 03 aufgebaut." — intentional, filled by Plan 03
- `useReleaseVersionMedia` hook: exposes only read operations — mutation helpers added by Plans 02/03 (intentional per plan spec)

## Self-Check: PASSED

Files exist:
- frontend/src/types/releaseVersionMedia.ts: FOUND
- frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts: FOUND
- frontend/src/app/admin/fansubs/[id]/edit/ReleaseVersionMediaDrawerSummary.tsx: FOUND

Commits:
- b198b86b: FOUND
- 70a2af2e: FOUND
