---
phase: 59-ffentliches-fansub-member-profil
plan: 05
subsystem: profile-background-upload
tags: [go, nextjs, upload, cropper, member-profile]

requires:
  - phase: 59-01
    provides: members.background_media_id and background_image DTO
  - phase: 59-02
    provides: public profile aggregate with background_image
provides:
  - POST /api/v1/me/profile/background
  - Own-profile background_image read support
  - ProfileBackgroundCard with 16:9 shared cropper
  - Shared hero background rendering
affects: [phase-59-public-member-profile, member-profile, profile-media]

key-files:
  created:
    - frontend/src/app/me/profile/components/ProfileBackgroundCard.tsx
    - .planning/phases/59-ffentliches-fansub-member-profil/59-05-SUMMARY.md
  modified:
    - backend/internal/handlers/app_profile.go
    - backend/internal/handlers/app_auth_test.go
    - backend/internal/repository/member_profile_repository.go
    - backend/internal/models/member_profile.go
    - backend/cmd/server/main.go
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/page.module.css
    - frontend/src/app/me/profile/page.test.tsx
    - frontend/src/app/members/[slug]/page.tsx
    - frontend/src/components/profile/MemberProfileHero.tsx
    - frontend/src/components/profile/profile.module.css
    - frontend/src/lib/api.ts
    - frontend/src/types/profile.ts

requirements-completed: [D-09]
completed: 2026-05-29
---

# Phase 59 Plan 05: Background Upload Summary

Implemented the own-profile background image upload slice.

## Accomplishments

- Added `POST /api/v1/me/profile/background` behind `authMiddleware`.
- Reused the existing profile media seam: `media_assets`, `media_files`, `members.background_media_id`, and controlled filesystem cleanup.
- Added `background_image` to own-profile responses and the TypeScript DTO.
- Added `ProfileBackgroundCard` on `/me/profile` with the shared `Team4sCropper` configured as 16:9 rectangle output.
- Added `uploadOwnProfileBackground` to the central API client.
- Updated the shared profile hero and `/members/[slug]` route so saved backgrounds render as the profile banner.
- Added a focused `/me/profile` test for background upload refresh behavior.
- Updated the existing handler test stub so backend handler tests compile with the expanded profile store interface.

## Deviations

- The plan text referenced an older `media` wording in places. Runtime code uses the current canonical `media_assets` and `media_files` pattern, matching the avatar implementation and Phase 59-01 migration.
- No new capability field was added; the UI gates background upload on `can_edit_own_profile`, while the backend enforces authenticated, non-disabled users.
- The shared hero was updated in addition to the narrow plan file list because otherwise uploaded background images would be stored but not visible on the public profile.

## Checks

- `cd backend && go build ./...` passed.
- `cd backend && go test ./internal/handlers ./internal/repository` passed after adding the background attach method to the handler test stub.
- `cd frontend && npm run typecheck` passed.
- `cd frontend && npx eslint src/app/me/profile/page.tsx src/app/me/profile/components/ProfileBackgroundCard.tsx src/components/profile/MemberProfileHero.tsx src/app/members/[slug]/page.tsx src/lib/api.ts src/types/profile.ts` passed.
- `cd frontend && npx vitest run src/app/me/profile/page.test.tsx` passed: 17 tests.
- `cd frontend && npm run build` passed and includes `/members/[slug]`.
- `git diff --check` on touched Phase 59 files passed with CRLF warnings only.
- German UI-copy scan over touched profile files found no mojibake or ASCII umlaut replacements.

## Known Issues

- No live browser upload UAT was run in this plan.
- Full `npm run lint` is still known to fail on unrelated pre-existing files from earlier work; this plan used targeted ESLint for touched files.
