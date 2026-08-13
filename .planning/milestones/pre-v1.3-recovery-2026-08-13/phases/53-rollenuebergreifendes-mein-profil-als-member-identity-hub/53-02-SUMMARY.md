---
phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
plan: 02
subsystem: profile-ui-api
tags: [member-profile, avatar-upload, media-assets, app-shell, accessibility, openapi]

requires:
  - phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
    provides: authenticated member profile baseline from 53-01
provides:
  - release-native member profile hardening for avatar crop/source retention
  - honest profile field contracts for activity years, visibility, rich text, and contribution details
  - compact mobile app shell navigation and hidden admin navigation for non-admin users
affects: [member-profile, app-shell, media-upload, openapi, accessibility]

tech-stack:
  added: []
  patterns:
    - shared crop math/a11y helpers under frontend/src/components/media/crop
    - avatar source retention via media_files.variant=source_original while public avatar stays original

key-files:
  created:
    - frontend/src/components/media/crop/AvatarCropDialog.tsx
    - frontend/src/components/media/crop/AvatarCropDialog.module.css
    - frontend/src/components/media/crop/AvatarCropDialog.test.tsx
    - frontend/src/components/media/crop/mediaCropA11y.ts
    - frontend/src/components/media/crop/mediaCropA11y.test.ts
    - frontend/src/components/media/crop/mediaCropMath.ts
    - frontend/src/components/media/crop/mediaCropMath.test.ts
  modified:
    - backend/internal/handlers/app_profile.go
    - backend/internal/repository/member_profile_repository.go
    - frontend/src/app/me/profile/page.tsx
    - frontend/src/app/me/profile/components/MemberAvatarCard.tsx
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/lib/api.ts
    - shared/contracts/openapi.yaml

key-decisions:
  - "Avatar uploads keep the existing /me/profile/avatar endpoint and member avatar media path; cropped display is public original, source_original is retained but never exposed as avatar.public_url."
  - "Month/year activity ranges, third visibility value, TipTap persistence, and contribution detail views remain deferred until DB, backend, OpenAPI, DTO, and UI move together."
  - "Non-admin users do not see the Verwaltung navigation group at all; protected admin framing alone is not sufficient."

patterns-established:
  - "Shared crop helpers are reusable UI primitives only; they do not merge domain-specific upload ownership."
  - "Deferred profile actions must include nearby user-facing reasons via aria-describedby."

requirements-completed: [MEMBER-PROFILE-HUB-01]

duration: ~70min
completed: 2026-05-27
---

# Phase 53 Plan 02: Member Profile Hardening Summary

**Member profile hub hardened with cropped avatar display, retained source avatar media, honest profile contracts, and compact role-aware navigation**

## Performance

- **Duration:** ~70min
- **Started:** 2026-05-27T14:52:00Z
- **Completed:** 2026-05-27T16:02:00Z
- **Tasks:** 8
- **Files modified:** 27 code/contract files plus this summary

## Accomplishments

- Added a semantic profile avatar upload flow with keyboard-focusable trigger, crop dialog, JPG/PNG/WEBP contract, SVG rejection coverage, and retained `source_original` storage.
- Kept profile persistence honest: invalid years now block save inline instead of coercing to `null`; month/year, third visibility, and TipTap persistence were not faked.
- Hid the `Verwaltung` navigation group for users without admin access and added a compact mobile nav so profile content is reachable quickly.
- Added explicit reasons for deferred public profile and contribution-detail actions.

## Task Commits

1. **Tasks 1-5a: avatar crop/upload contract, source retention, activity validation, honest contracts, dirty/error tests** - `47c4aa16` (feat)
2. **Tasks 5b-6: mobile shell, admin nav visibility, deferred action reasons** - `638ea526` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `backend/internal/handlers/app_profile.go` - accepts `source_file` + `cropped_file`, validates avatar MIME explicitly, stores cropped display and retained source.
- `backend/internal/repository/member_profile_repository.go` - attaches avatar media through existing member avatar ownership and records `source_original`.
- `backend/internal/handlers/app_auth_test.go` - covers SVG rejection and source/cropped avatar upload payloads.
- `backend/internal/repository/member_profile_repository_test.go` - asserts `source_original` variant and previous avatar cleanup behavior.
- `frontend/src/components/media/crop/*` - shared crop math, a11y helpers, crop dialog, and tests.
- `frontend/src/components/admin/MediaUpload.tsx` - reuses shared crop helpers instead of admin-local copies.
- `frontend/src/app/me/profile/*` - profile avatar crop wiring, inline year validation, deferred-action reasons, and scoped dirty/error tests.
- `frontend/src/components/layout/AppShell.*` - role-aware nav filtering and mobile compact nav.
- `frontend/src/lib/api.ts` - keeps `uploadOwnProfileAvatar` transport while adding source/cropped payload support.
- `shared/contracts/openapi.yaml` - documents avatar MIME/variant contract and plain-text story defer.
- `.gitignore` - allows tracked source files under `frontend/src/components/media/crop` despite the root `media/` upload-storage ignore.

## Decisions Made

- Avatar source retention uses `media_files.variant='source_original'`; public avatar reads remain on the cropped `original` variant and `media_assets.file_path`.
- Rich TipTap profile persistence was deferred because implementing it correctly requires DB columns/migration, backend DTOs, OpenAPI, frontend DTOs, and UI changes together.
- Month/year activity periods and a third visibility option were not introduced because the current DB/backend contract only supports year-only and two visibility states.
- Contribution detail views remain disabled with nearby reasons until a real contribution detail endpoint/contract exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Unignored shared crop source files**
- **Found during:** Task 1 avatar crop extraction
- **Issue:** The root `media/` ignore rule hid `frontend/src/components/media/crop/*`, which would have left required source files untracked.
- **Fix:** Added narrow `.gitignore` exceptions for `frontend/src/components/media/crop/**`.
- **Files modified:** `.gitignore`
- **Verification:** `git status --short --untracked-files=all` showed the new source files as trackable.
- **Committed in:** `47c4aa16`

---

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** No functional scope creep; the exception was required so the planned shared crop implementation could be committed.

## Issues Encountered

- Full frontend lint still fails on pre-existing out-of-scope files:
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.test.tsx`
  - `frontend/src/app/dev/ui-system/page.tsx`
  - `frontend/src/components/auth/PlatformAdminGate.tsx`
  - `frontend/tmp-live-full-flow*.js`
- Focused ESLint on the changed frontend files passed.

## Known Stubs

- None blocking this plan's goal.
- Intentional defers are explicitly surfaced in UI/contract text: public profile route, contribution detail views, TipTap profile persistence, month-level activity dates, and a third visibility option.

## Auth Gates

None.

## Verification

- `cd frontend && npm run test -- --run "src/app/me/profile/page.test.tsx" "src/components/layout/AppShell.test.tsx"` - passed
- `cd frontend && npm test -- --run src/components/media/crop/mediaCropMath.test.ts src/components/media/crop/mediaCropA11y.test.ts src/components/media/crop/AvatarCropDialog.test.tsx` - passed
- `cd frontend && npm test -- --run src/components/editor/RichTextEditor.test.tsx` - passed
- `cd frontend && npm run typecheck` - passed
- `cd frontend && npx eslint ...changed files...` - passed
- `cd frontend && npm run lint` - failed on pre-existing out-of-scope files listed above
- `cd backend && go test ./internal/handlers ./internal/repository` - passed
- `cd backend && go test ./internal/services ./internal/handlers ./internal/repository ./internal/migrations` - passed
- `git diff --check` - passed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Member profile avatar handling now has a concrete source/cropped contract and regression tests.
- Next cleanup slice can safely focus on one deferred contract at a time: rich story persistence, public profile route, contribution detail endpoint, or richer activity-period schema.

## Self-Check: PASSED

- Created files exist under `frontend/src/components/media/crop`.
- Code commits `47c4aa16` and `638ea526` exist in git history.
- No untracked generated files remain from the plan execution.

---
*Phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub*
*Completed: 2026-05-27*
