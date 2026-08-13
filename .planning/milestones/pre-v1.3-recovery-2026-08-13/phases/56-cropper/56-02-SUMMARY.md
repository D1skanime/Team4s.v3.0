# 56-02 Summary: Avatar Crop Migration

## Status

Complete on automated evidence.

## What Changed

- Replaced `AvatarCropDialog` internals with a compatibility wrapper around `Team4sCropper`.
- Preserved the existing `onApply({ sourceFile, croppedFile })` contract for `uploadOwnProfileAvatar`.
- Kept avatar output as 512x512 PNG with circular crop UI.
- Updated wrapper tests to prove source-file retention and cropped-file output naming/type.

## Verification

- `npx vitest run src/components/media/crop/Team4sCropper.test.tsx src/components/media/crop/AvatarCropDialog.test.tsx --reporter verbose` passed.
- `npx vitest run src/components/admin/MediaUpload.test.tsx src/app/me/profile/page.test.tsx --reporter verbose` passed.
- `npm run typecheck` passed.

## Notes

- `MemberAvatarCard` was not changed because it already loads `sourceAvatarURL` for existing-avatar recrop and continues to pass the source plus cropped file to the profile upload seam.
- No auth/token handling was changed.
