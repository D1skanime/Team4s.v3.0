---
phase: 99-ffentliches-fansub-member-profil-redesign
plan: "01"
subsystem: public-member-profile
tags: [go, openapi, typescript, public-profile, release-version-media]
requires:
  - "99-00 RED tests for public member profile projection invariants"
provides:
  - "Additive GET /api/v1/members/:slug public profile DTO fields"
  - "Public current project, latest contribution, and previous contribution projections"
  - "OpenAPI and TypeScript public profile DTO alignment"
affects: [member-profile-repository, public-profile-contract, frontend-profile-types]
tech-stack:
  added: []
  patterns:
    - "Public latest media stays release-version-scoped via release_version_media + media_assets + media_files"
    - "Public media owner mapping requires verified member_claims and app_users.legacy_user_id"
key-files:
  created:
    - ".planning/phases/99-ffentliches-fansub-member-profil-redesign/99-01-SUMMARY.md"
  modified:
    - "backend/internal/models/member_profile.go"
    - "backend/internal/repository/member_profile_repository.go"
    - "shared/contracts/openapi.yaml"
    - "frontend/src/types/profile.ts"
key-decisions:
  - "Latest public media contributions are exposed only when release_version_media.uploaded_by_user_id maps to the member through a verified claim and app_users.legacy_user_id."
  - "Previous public contribution rows require ac.ended_year IS NOT NULL and rows without period evidence are excluded from both rows and count."
metrics:
  duration: 18min
  tasks: 3
  files: 5
completed: 2026-07-07T17:31:53Z
---

# Phase 99 Plan 01: Public Member Profile Projection Summary

Additive public profile projection for current projects, latest public contributions, and previous contribution history without new endpoints or schema changes.

## Accomplishments

- Added Go DTOs and `PublicMemberProfile` fields for `current_projects`, `latest_contributions`, `previous_contributions`, and `previous_contributions_count`.
- Extended `GetPublicMemberProfile` through private repository loaders on the existing member profile repository seam.
- Implemented current projects from confirmed, public `anime_contributions` using `ended_year IS NULL`.
- Implemented latest contributions as one SQL-level `UNION ALL` over public/published `release_version_notes` and public/approved/ready `release_version_media`.
- Implemented previous contributions from confirmed, public `anime_contributions` with `ended_year IS NOT NULL`.
- Updated `shared/contracts/openapi.yaml` and `frontend/src/types/profile.ts` for the additive public DTO fields.

## Files Modified

- `backend/internal/models/member_profile.go`
- `backend/internal/repository/member_profile_repository.go`
- `shared/contracts/openapi.yaml`
- `frontend/src/types/profile.ts`

## Verification

- `rg -n "current_projects|latest_contributions|previous_contributions_count|PublicMemberLatestContribution" backend/internal/models/member_profile.go shared/contracts/openapi.yaml frontend/src/types/profile.ts` - passed.
- `cd backend; go test ./internal/repository -run "PublicMember(Profile|Latest|Previous|Current|Media)"` - passed.
- `rg -n 'json:"current_projects|current_projects:|current_projects$|latest_contributions|previous_contributions_count' backend/internal/models/member_profile.go shared/contracts/openapi.yaml frontend/src/types/profile.ts` - passed.
- `cd frontend; npm run typecheck` - passed.
- `git diff --check -- backend/internal/models/member_profile.go backend/internal/repository/member_profile_repository.go backend/internal/repository/member_profile_repository_test.go shared/contracts/openapi.yaml frontend/src/types/profile.ts` - passed with Git CRLF warnings only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Kept TypeScript additive fields optional for pre-UI fixtures**
- **Found during:** Task 3 verification
- **Issue:** `npm run typecheck` failed because existing Phase 99 route/component test fixtures and preview adapter objects do not populate the new fields yet.
- **Fix:** Kept backend/OpenAPI emitting the additive fields, but marked the TypeScript additions optional so existing UI fixtures compile until Plans 99-02/99-03 consume the new fields.
- **Files modified:** `frontend/src/types/profile.ts`

### Workflow Deviations

- `.planning/STATE.md` and roadmap metadata were not updated because `.planning/STATE.md` was dirty before execution and the user explicitly requested committing only Plan 99-01 changes.

## Known Stubs

None. No placeholder production data was added.

## Threat Flags

None. The only new exposure is additive public response data on the existing public member profile endpoint, filtered at repository level.

## Security Notes

- Latest text contributions require `release_version_notes.visibility = 'public'`, `status = 'published'`, `deleted_at IS NULL`, and non-empty text or HTML.
- Latest media contributions require `release_version_media`, real `release_version_id`, `media_assets.status = 'ready'`, `visibilities.name = 'public'`, `review_statuses.code = 'approved'`, and a ready `media_files` row.
- Media ownership is restricted through verified `member_claims` plus `app_users.legacy_user_id` matching `release_version_media.uploaded_by_user_id`.
- `release_media` and `episode_media` are not used as substitutes.

## Self-Check: PASSED

- Verified summary, model, repository, OpenAPI, and TypeScript files exist on disk.
- Verified the current commit exists: `feat(99): add public member profile projection`.
- Verified the commit contains no tracked file deletions.
