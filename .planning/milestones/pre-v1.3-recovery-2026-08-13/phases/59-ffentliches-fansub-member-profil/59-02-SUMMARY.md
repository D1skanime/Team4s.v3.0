---
phase: 59-ffentliches-fansub-member-profil
plan: 02
subsystem: profile-api
tags: [go, gin, postgres, public-profile, optional-auth]

requires:
  - phase: 59-01
    provides: PublicMemberProfile Go DTOs, PublicMemberProfileData TypeScript types, and members.background_media_id migration
provides:
  - GET /api/v1/members/:slug runtime endpoint
  - Public member profile repository lookup with slug and numeric-ID fallback
  - Backend members_only visibility gate for anonymous requests
affects: [phase-59-public-member-profile, member-profile, public-api]

tech-stack:
  added: []
  patterns:
    - Public profile reads use a separate handler and public-safe DTO
    - Optional auth middleware gates visibility without requiring login for public profiles

key-files:
  created:
    - backend/internal/handlers/app_public_profile.go
    - .planning/phases/59-ffentliches-fansub-member-profil/59-02-SUMMARY.md
  modified:
    - backend/internal/repository/member_profile_repository.go
    - backend/cmd/server/main.go

key-decisions:
  - "The public endpoint returns the existing PublicMemberProfile DTO directly because it excludes app_user_id, display_name, email, keycloak_subject, and account roles by construction."
  - "The public avatar response exposes only public_url; source_original_url is intentionally not populated for public profiles."
  - "OpenAPI documentation is deferred to Plan 59-06, which explicitly owns shared/contracts/openapi.yaml for this endpoint."

patterns-established:
  - "GET /api/v1/members/:slug uses authOptionalMiddleware and returns {visible:false,reason:members_only} instead of leaking profile data for anonymous members_only requests."
  - "Release media activity still resolves anime through release_version_media -> release_versions -> fansub_releases -> episodes -> anime."

requirements-completed: [D-01, D-03, D-04, D-05, D-06, D-07, D-08]

duration: 35min
completed: 2026-05-29
---

# Phase 59 Plan 02: Public Member Profile Backend Summary

**Public member profile backend endpoint with slug lookup, optional-auth visibility gating, and public-safe serialization**

## Performance

- **Duration:** 35 min
- **Started:** 2026-05-29T11:55:00Z
- **Completed:** 2026-05-29T12:30:20Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `MemberProfileRepository.GetPublicMemberProfile(ctx, slug)` with normalized fansub-name lookup, numeric ID fallback, profile media URLs, memberships, recent media, and recent contributions.
- Added `AppPublicProfileHandler.GetPublicMemberProfile` with 400/404/error handling and the `members_only` anonymous visibility response.
- Registered `GET /api/v1/members/:slug` with `authOptionalMiddleware` in `backend/cmd/server/main.go`.
- Kept public serialization free of Keycloak/account fields and did not expose source avatar URLs.

## Task Commits

No task commits were created. The user explicitly requested uncommitted worktree changes for orchestrator integration.

## Files Created/Modified

- `backend/internal/handlers/app_public_profile.go` - New public member profile handler, constructor, and store interface.
- `backend/internal/repository/member_profile_repository.go` - Adds public lookup method, slug normalization helpers, and public aggregate loading.
- `backend/cmd/server/main.go` - Reuses `memberProfileRepo` and registers `GET /api/v1/members/:slug` with optional auth.
- `.planning/phases/59-ffentliches-fansub-member-profil/59-02-SUMMARY.md` - Execution summary.

## Decisions Made

- Used `media_assets.file_path` for avatar/background public URLs because Plan 59-01 established `background_media_id BIGINT REFERENCES media_assets(id)` and the existing avatar flow stores the canonical path on `media_assets`.
- Added an application-side normalized-slug fallback after the planned SQL lookup so Unicode-normalized names with accents can still resolve consistently.
- Left OpenAPI untouched because Plan 59-06 explicitly owns `shared/contracts/openapi.yaml`; this summary records the temporary contract deferral.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used the active media_assets schema instead of the older media wording**
- **Found during:** Task 1
- **Issue:** Plan 59-02 referenced `media`, but Plan 59-01 and the current schema use `media_assets` for `avatar_media_id` and `background_media_id`.
- **Fix:** Joined `media_assets` for avatar/background URLs.
- **Files modified:** `backend/internal/repository/member_profile_repository.go`
- **Verification:** `go build ./internal/repository/...` and `go build ./...` passed.

**2. [Rule 1 - Bug] Added Unicode-safe slug fallback**
- **Found during:** Task 1
- **Issue:** PostgreSQL `REGEXP_REPLACE` on stored nicknames cannot match every Go NFD-normalized slug, especially accented names.
- **Fix:** Kept the planned SQL lookup for normal ASCII slugs and numeric ID fallback, then added a deterministic Go-normalized fallback ordered by member ID.
- **Files modified:** `backend/internal/repository/member_profile_repository.go`
- **Verification:** Repository and full backend builds passed; grep confirms `normalizeMemberProfileSlug` and fallback lookup exist.

**Total deviations:** 2 auto-fixed
**Impact on plan:** Both deviations preserve the plan goal and avoid incorrect profile lookup or schema mismatch. No frontend or plan 59-03 files were touched by this execution.

## Contract Deferral

`shared/contracts/openapi.yaml` was not updated in this plan because the user constrained the write scope and Phase 59 Plan 06 explicitly owns the OpenAPI contract for `GET /api/v1/members/{slug}` and `POST /api/v1/me/profile/background`.

## Known Stubs

None in the files created or modified for this plan.

## Issues Encountered

- Existing unrelated dirty files remain in the worktree, including `.codex/skills/*`, Phase 59-01 artifacts, and frontend files assigned outside this plan. They were not edited, staged, committed, or reverted.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd backend && go build ./internal/repository/...` passed.
- `cd backend && go build ./...` passed.
- `rg -n "GetPublicMemberProfile|normalizeMemberProfileSlug|findPublicMemberProfileByNormalizedSlug" backend/internal/repository/member_profile_repository.go` found the repository method and slug helpers.
- `rg -n "AppPublicProfileHandler|NewAppPublicProfileHandler|visible.*members_only|mitglied nicht gefunden" backend/internal/handlers/app_public_profile.go` found the handler, constructor, hidden response, and 404 branch.
- `rg -n "members/:slug|authOptionalMiddleware|NewAppPublicProfileHandler" backend/cmd/server/main.go` found the route registered with optional auth.
- `git diff --check -- backend/internal/repository/member_profile_repository.go backend/internal/handlers/app_public_profile.go backend/cmd/server/main.go .planning/phases/59-ffentliches-fansub-member-profil/59-02-SUMMARY.md` passed with line-ending warnings only.

## Next Phase Readiness

Plan 59-03 can globalize the profile components without waiting on backend wiring. Plan 59-04 can consume `GET /api/v1/members/:slug`, and Plan 59-06 remains responsible for documenting the endpoint in OpenAPI.

## Self-Check: PASSED

- Found `backend/internal/handlers/app_public_profile.go`.
- Found `backend/internal/repository/member_profile_repository.go`.
- Found `backend/cmd/server/main.go`.
- Found `.planning/phases/59-ffentliches-fansub-member-profil/59-02-SUMMARY.md`.
- No commits were expected or created because the user requested uncommitted worktree changes.

---
*Phase: 59-ffentliches-fansub-member-profil*
*Completed: 2026-05-29*
