# 56-03 Summary: Fansub Logo Crop Migration

## Status

Complete on automated evidence.

## What Changed

- Removed the inline logo cropper state, pointer handlers, local canvas export, and crop CSS from `MediaUpload`.
- Raster fansub logos now open `Team4sCropper` and upload the resulting 512x512 PNG through the existing `uploadFansubMedia` helper.
- SVG logo uploads stay on the existing direct upload path and are not silently rasterized.
- Banner upload behavior remains unchanged.

## Verification

- `npx vitest run src/components/admin/MediaUpload.test.tsx src/app/me/profile/page.test.tsx --reporter verbose` passed.
- `npm run typecheck` passed.
- Targeted eslint for touched files passed.

## Notes

- Fansub group media ownership remains `MediaUpload` plus `uploadFansubMedia`; no release, release-version, anime, or episode media flow was touched.
- Current-logo edit for SVG now reports that SVG logos cannot be cropped and suggests replacing with SVG directly or using a raster image.
