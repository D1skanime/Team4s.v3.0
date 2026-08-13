---
phase: 59-ffentliches-fansub-member-profil
plan: 01
subsystem: profile
tags: [postgres, go, typescript, public-profile, media-assets]

requires:
  - phase: 58-profil-hub-content-membership-cards-activity-preparation
    provides: Recent profile media and contribution DTOs reused by public profile types
provides:
  - members.background_media_id migration for profile background media
  - PublicMemberProfile Go DTO without Keycloak account fields
  - PublicMemberProfileData and PublicMemberProfileResponse TypeScript exports
affects: [phase-59-public-member-profile, member-profile, media-assets]

tech-stack:
  added: []
  patterns:
    - Public profile DTOs are separate from authenticated own-profile DTOs
    - Member profile background media follows the existing media_assets FK seam

key-files:
  created:
    - database/migrations/0080_member_profile_background.up.sql
    - database/migrations/0080_member_profile_background.down.sql
    - .planning/phases/59-ffentliches-fansub-member-profil/59-01-SUMMARY.md
  modified:
    - backend/internal/models/member_profile.go
    - frontend/src/types/profile.ts

key-decisions:
  - "background_media_id references media_assets(id) as BIGINT to match the existing avatar_media_id/media_assets schema."
  - "PublicMemberProfile uses a narrow MemberProfileAvatar DTO instead of MediaAsset to avoid exposing broader media metadata on public profiles."

patterns-established:
  - "Public member profile types exclude app_user_id, display_name, email, and keycloak_subject by construction."
  - "Public profile background image DTO exposes only public_url."

requirements-completed: [D-09, D-08]

duration: 24min
completed: 2026-05-29
---

# Phase 59 Plan 01: Typdefinitions-Fundament Summary

**Public member profile foundation with background media migration, safe Go DTOs, and aligned frontend response types**

## Performance

- **Duration:** 24 min
- **Started:** 2026-05-29T12:00:00Z
- **Completed:** 2026-05-29T12:24:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Added migration 0080 to store an optional `members.background_media_id`.
- Added public-safe Go DTOs for member profile reads, including background image and public avatar shapes.
- Added TypeScript exports for `PublicMemberProfileData` and the `{ data } | { visible: false }` public response union.

## Task Commits

No task commits were created. The user explicitly requested uncommitted worktree changes for orchestrator integration.

## Files Created/Modified

- `database/migrations/0080_member_profile_background.up.sql` - Adds nullable `background_media_id` to `members`.
- `database/migrations/0080_member_profile_background.down.sql` - Drops `background_media_id`.
- `backend/internal/models/member_profile.go` - Adds public-safe member profile, avatar, and background image DTOs.
- `frontend/src/types/profile.ts` - Adds public member profile data and response union exports.
- `.planning/phases/59-ffentliches-fansub-member-profil/59-01-SUMMARY.md` - Execution summary.

## Decisions Made

- Used `BIGINT REFERENCES media_assets(id)` for `background_media_id` because the current schema has `media_assets`, not `media`, and existing profile avatar storage uses `avatar_media_id BIGINT REFERENCES media_assets(id)`.
- Added a narrow `MemberProfileAvatar` DTO because the plan referenced it as existing, but current code only had broader `MediaAsset`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected background media FK to the actual media schema**
- **Found during:** Task 1
- **Issue:** The plan specified `UUID REFERENCES media(id)`, but the active migration chain has no `media` table and uses `media_assets(id)` with `BIGINT` IDs.
- **Fix:** Created `background_media_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL`.
- **Files modified:** `database/migrations/0080_member_profile_background.up.sql`
- **Verification:** Schema search confirmed existing `media_assets` references; migration content check passed.

**2. [Rule 3 - Blocking] Added missing public avatar DTO**
- **Found during:** Task 2
- **Issue:** The plan referenced `MemberProfileAvatar` as an existing struct, but it was absent; using `MediaAsset` would expose broader media fields than the public profile contract needs.
- **Fix:** Added `MemberProfileAvatar` with only `public_url` and optional `source_original_url`.
- **Files modified:** `backend/internal/models/member_profile.go`
- **Verification:** `go build ./internal/models/...` passed and the public struct contains no `AppUserID`, `Email`, or `KeycloakSubject`.

**Total deviations:** 2 auto-fixed
**Impact on plan:** Both deviations preserve the plan goal while aligning with the current schema and public-data boundary.

## Issues Encountered

- None remaining.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `go build ./internal/models/...` passed.
- `npx tsc --noEmit --project tsconfig.json` passed.
- Migration content checks found `background_media_id` in both 0080 up/down files.
- Public Go struct scan confirmed `AppUserID`, `Email`, and `KeycloakSubject` are absent.
- Public TypeScript interface scan confirmed `display_name`, `email`, and `keycloak_subject` are absent.
- `git diff --check -- database/migrations/0080_member_profile_background.up.sql database/migrations/0080_member_profile_background.down.sql backend/internal/models/member_profile.go frontend/src/types/profile.ts` passed with line-ending warnings only.
- Migration runner status check was attempted with `go run ./cmd/migrate status -dir ../database/migrations`, but it could not run because `DATABASE_URL` was not configured in this shell.

## Next Phase Readiness

Plan 59-02 can now implement `GET /api/v1/members/:slug` against a public-safe backend model and frontend response shape. The background media column exists for later upload/display work in Phase 59.

## Self-Check: PASSED

- Found all created/modified plan files.
- No commits were expected or created because the user requested an uncommitted worktree.
- Verification artifact `frontend/tsconfig.tsbuildinfo` was restored after `tsc` updated it.

---
*Phase: 59-ffentliches-fansub-member-profil*
*Completed: 2026-05-29*
