---
created: 2026-05-28T11:13:46.3876306+02:00
completed: 2026-05-29T00:53:16+02:00
title: Global cropper library replacement
area: ui
files:
  - frontend/src/components/media/crop/AvatarCropDialog.tsx
  - frontend/src/components/media/crop/Team4sCropper.tsx
  - frontend/src/components/admin/MediaUpload.tsx
  - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
  - .planning/phases/56-cropper/56-UAT.md
---

## Problem

Phase 53 UAT 2 still reproduces a crop parity bug after local fixes: the avatar crop dialog preview looks acceptable, but the saved/displayed result does not match the selected circular area. The same class of cropper bug exists in the fansub group media/logo flow. The current in-house crop math, pointer handling, responsive viewport handling, and canvas export path are too fragile and should not be patched further.

## Solution

Phase 56 replaced the in-house crop geometry with `react-easy-crop` behind `Team4sCropper`, migrated profile avatar and fansub logo crop flows, preserved the existing domain-specific upload endpoints and media ownership rules, and kept SVG logos on the explicit direct-upload path.

## Verification

- Focused cropper, profile, and fansub media tests passed.
- Frontend typecheck passed.
- Targeted lint for changed files passed.
- Frontend build passed.
- `git diff --check` passed.
- Authenticated live UAT was reported successful on 2026-05-29.

## Remaining Gate

`$gsd-secure-phase 56` has not run yet, and security enforcement is enabled.
