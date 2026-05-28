---
created: 2026-05-28T11:13:46.3876306+02:00
title: Global cropper library replacement
area: ui
files:
  - frontend/src/components/media/crop/AvatarCropDialog.tsx
  - frontend/src/components/admin/MediaUpload.tsx
  - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
  - .planning/phases/53-rollenuebergreifendes-mein-profil-als-member-identity-hub/53-HUMAN-UAT.md
---

## Problem

Phase 53 UAT 2 still reproduces a crop parity bug after local fixes: the avatar crop dialog preview looks acceptable, but the saved/displayed result does not match the selected circular area. The same class of cropper bug exists in the fansub group media/logo flow. The current in-house crop math, pointer handling, responsive viewport handling, and canvas export path are too fragile and should not be patched further.

## Solution

Plan a new narrow phase for a global Team4s cropper component backed by a maintained modern library instead of more custom geometry. The phase should evaluate current React cropper libraries, with `react-advanced-cropper` as an initial candidate because its official documentation covers mobile/touch support, fixed aspect-ratio/stencil customization, and canvas/coordinate output. Replace both own-profile avatar cropping and fansub group logo/image cropping with the same shared component, preserving the existing domain-specific upload endpoints and media ownership rules.

## 2026-05-28 Implementation Note

Phase 56 implementation replaced the in-house crop geometry with `react-easy-crop` behind `Team4sCropper`, migrated profile avatar and fansub logo crop flows, and passed focused tests/typecheck/build. The todo remains pending because authenticated browser UAT for live preview/export/display parity still needs to be completed with a local logged-in session.
