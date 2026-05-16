---
phase: 36-release-version-media-frontend-upload-ui-und-galerie
plan: "06"
subsystem: frontend
tags:
  - media
  - gallery
  - preview
  - css
  - regression
key_files:
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css
    - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx
    - .planning/phases/36-release-version-media-frontend-upload-ui-und-galerie/36-UAT.md
metrics:
  completed_date: "2026-05-08"
  tasks: 2
  files: 6
---

# Phase 36 Plan 06: Image Ratio Preview Gap Summary

The release-version-media preview surfaces no longer force images through a square crop in the current source tree. Gallery thumbnails stay compact but use a contain-style stage, and the detail panel now shows the full image proportion instead of a 1:1 cutout.

## Tasks Completed

### Task 1: Gallery and detail preview ratio fix

Updated the preview seams in:
- `ReleaseVersionMediaGallery.tsx` / `ReleaseVersionMediaGallery.module.css`
- `ReleaseVersionMediaDetailPanel.tsx`
- `ReleaseVersionMediaSection.module.css`

Changes:
- Gallery thumbnails now render through a dedicated `thumbImage` class with non-cropping sizing.
- The square `aspect-ratio: 1` + `object-fit: cover` behavior was removed from both preview surfaces.
- Detail preview now uses a dedicated `detailPreviewImage` class and contain-style sizing so portrait images can remain fully visible.

### Task 2: Regression coverage and UAT follow-up

Extended `ReleaseVersionMediaSection.test.tsx` with explicit non-square preview regressions:
- gallery thumbnail uses the new non-crop preview seam
- detail preview uses the dedicated non-crop image seam and prefers the original URL

Updated `36-UAT.md` to track the new manual image-ratio check.

## Verification

Executed:
- `cd frontend && npx vitest run "src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx"`
- `cd frontend && npx tsc --noEmit`
- `git diff --check -- frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.tsx frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaGallery.module.css frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaDetailPanel.tsx frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.module.css frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`

All three checks passed.

## Deviations

### Fresh runtime live retest still pending

The running frontend on `http://127.0.0.1:3002` was still serving an older bundle while the source fix was already present locally. A Docker frontend rebuild timed out in this session, and a fallback local Next dev server was only partially usable for smoke automation. Because of that, `36-UAT.md` was updated to `partial` until the updated runtime is visually retested on the actual browser target.

## Self-Check: PASSED

Source fix implemented, targeted regression tests added, and type-check remains green. The only remaining step is a fresh-runtime browser retest against the rebuilt frontend.
