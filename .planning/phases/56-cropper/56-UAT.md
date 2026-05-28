# Phase 56 UAT: Cropper

**Date:** 2026-05-28
**Result:** Partial. Automated and build checks pass; authenticated live crop parity UAT remains pending.

## Commands Run

- `npm install react-easy-crop`
- `npx vitest run src/components/media/crop/Team4sCropper.test.tsx src/components/media/crop/AvatarCropDialog.test.tsx --reporter verbose`
- `npx vitest run src/components/admin/MediaUpload.test.tsx src/app/me/profile/page.test.tsx --reporter verbose`
- `npm run typecheck`
- `npm run lint`
- `npx eslint src/components/media/crop/Team4sCropper.tsx src/components/media/crop/Team4sCropper.test.tsx src/components/media/crop/AvatarCropDialog.tsx src/components/media/crop/AvatarCropDialog.test.tsx src/components/admin/MediaUpload.tsx src/components/admin/MediaUpload.test.tsx`
- `npm run build`
- `git diff --check`

## Browser Smoke

- Started frontend dev server with `npm run dev -- -p 3000`.
- Opened `http://localhost:3000/me/profile` through Playwright.
- Observed expected unauthenticated state:
  - Page title: `Team4s v3.0`
  - Visible text included `Anmeldung erforderlich` and `Zur Anmeldung`.

## Automated Coverage Passed

- Shared cropper renders a dialog, cancels via Escape, receives pixel crop data from the cropper library boundary, and exports a configured `File`.
- Avatar wrapper keeps `sourceFile` and returns a PNG `croppedFile`.
- Profile avatar upload integration still keeps dirty fields, handles upload errors, refreshes avatar display from upload response, and reuses `source_original_url` for existing-avatar recrop.
- Fansub media upload still uses `uploadFansubMedia`, keeps progress behavior, deletes without token-shaped args, opens the shared cropper for raster logos, and uploads SVG logos directly without cropper conversion.

## Not Completed

- Live authenticated avatar new-upload crop preview/export/display parity.
- Live authenticated existing-avatar recrop from retained source original.
- Live authenticated fansub group logo crop preview/export/display parity.
- Mobile/touch UAT against real authenticated upload forms.

## Reason

No authenticated local browser session was available in this run. The protected profile route correctly stopped at the login-required state, so real upload surfaces were not reachable without credentials/session setup.

## Follow-Up

Use an authenticated local session and an asymmetric raster image to complete:

1. `/me/profile` new avatar crop.
2. `/me/profile` existing avatar recrop using source original.
3. Fansub edit/create logo crop through `MediaUpload`.
4. Mobile viewport check for no overlapping cropper controls.
