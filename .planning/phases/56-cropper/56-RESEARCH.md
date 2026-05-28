# Phase 56: Cropper - Research

**Researched:** 2026-05-28
**Status:** Complete

## Research Question

What do we need to know to plan a narrow replacement of Team4s' fragile in-house cropper for own-profile avatars and fansub group logos?

## Current Runtime Findings

- `frontend/src/components/media/crop/AvatarCropDialog.tsx` is a custom canvas cropper using local `mediaCropMath` and `mediaCropA11y` helpers.
- `frontend/src/components/admin/MediaUpload.tsx` contains another cropper surface for fansub logos, reusing the same helper files but keeping substantial inline crop UI/export code.
- `frontend/src/app/me/profile/components/MemberAvatarCard.tsx` already supports recropping the retained avatar source by loading `source_original_url`.
- `frontend/src/lib/api.ts` already has the right ownership seams:
  - `uploadOwnProfileAvatar({ sourceFile, croppedFile })`
  - `uploadFansubMedia({ fansubID, kind, file, onProgress })`
- The Phase 56 todo says the preview looked acceptable while the saved/displayed result did not match the selected circular area. This points to custom geometry/export parity risk, not an API ownership gap.

## Library Scan

### `react-advanced-cropper`

Official docs describe mobile support with built-in touch behavior and the ability to produce either a canvas or coordinates for server-side cropping. The component docs expose `getCanvas(options)`, `getCoordinates()`, stencil customization, image restrictions, and transform methods. This matches Team4s' need for:

- fixed 1:1/circle avatar behavior
- reusable cropper UI for profile and fansub logo
- deterministic canvas export for existing client-upload contracts
- possible future coordinate/server-crop path without designing it now

Risk: the API is broader than Team4s needs, so the implementation should wrap it behind a small Team4s adapter instead of leaking library concepts into profile/admin surfaces.

### `react-easy-crop`

Official docs describe drag, zoom, rotation, touch, keyboard, and precise crop output. It looks like a strong lightweight candidate for state-driven crop/zoom and can return pixel crop output via `onCropComplete`.

Risk: Team4s still has to own more canvas/export glue. It may be simpler than `react-advanced-cropper`, but the phase is specifically trying to reduce fragile custom export math.

### `react-image-crop`

The project README describes responsive crops, touch support, fixed aspect crops, keyboard accessibility, small footprint, and circular crop display. It is attractive for accessibility and small dependency footprint.

Risk: the README says browser preview/export is not part of the library and points to an example. That keeps more export parity responsibility inside Team4s, which is exactly where the current bug lives.

## Recommended Direction

Start with `react-advanced-cropper` behind a small Team4s component:

- `frontend/src/components/media/crop/Team4sCropper.tsx`
- `frontend/src/components/media/crop/Team4sCropper.module.css`
- `frontend/src/components/media/crop/Team4sCropper.test.tsx`

Expose a domain-neutral API such as:

```ts
type Team4sCropperProps = {
  file: File
  title: string
  shape: 'circle' | 'rectangle'
  aspectRatio: number
  output: { mimeType: 'image/png' | 'image/webp'; width: number; height: number; filename: string }
  onCancel: () => void
  onApply: (file: File) => Promise<void> | void
}
```

For the avatar surface, wrap this with `AvatarCropDialog` or replace it with a compatibility component that still calls `onApply({ sourceFile, croppedFile })`.

For the fansub logo surface, replace only the inline logo cropper in `MediaUpload`; keep validation, upload progress, errors, delete, and banner behavior in place.

## Implementation Constraints For Planning

- Add the dependency in a dedicated first plan and isolate the third-party API in one adapter component.
- Do not change backend media handlers unless implementation discovers that the client Blob cannot satisfy parity.
- Do not add schema migrations.
- Do not change upload endpoints.
- Keep SVG logo behavior explicit: SVG cannot be raster-cropped unless Team4s intentionally converts it; prefer existing direct SVG behavior or documented rejection for crop mode.
- Verify the actual rendered result in browser, not only jsdom tests.

## Verification Guidance

Automated:
- `cd frontend && npm test -- --run src/components/media/crop`
- `cd frontend && npm test -- --run src/app/me/profile/page.test.tsx src/components/admin/MediaUpload.test.tsx`
- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `git diff --check`

Manual/browser:
- Use an asymmetric test image with a visible mark near one edge.
- Crop to a recognizable off-center circle.
- Confirm saved avatar display matches crop preview.
- Recrop existing avatar from source original and confirm the prior cropped display is not used as source.
- Crop a fansub logo and confirm saved group logo preview matches crop preview.
- Test mobile viewport, keyboard arrows/tab/ESC, and pointer/touch drag.

## Sources

- React Advanced Cropper docs: mobile support, canvas/coordinate output, stencils, restrictions, methods.
- react-easy-crop docs: drag, zoom, rotation, touch, keyboard, precise crop output.
- react-image-crop README: responsive, touch, fixed aspect, keyboard accessibility, and separate browser preview/export example.

## RESEARCH COMPLETE
