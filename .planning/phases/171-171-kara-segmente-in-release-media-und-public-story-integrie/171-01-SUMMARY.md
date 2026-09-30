---
phase: 171-kara-segmente-in-release-media-und-public-story-integrie
plan: 01
subsystem: api
tags: [postgres, go, release-version, story-order, kara, openapi, typescript]

requires:
  - phase: 169-release-medienrechte-projektleiter-preview-highlights-und-bi
    provides: release-version media reorder rights, preview/highlight orthogonality, public visibility gates
provides:
  - Typed release-version story-order projection referencing existing media or theme-segment assignments
  - Mixed admin reorder request and public release story DTO contracts
  - Public projection ordering that preserves media highlight metadata without resorting highlights
affects: [171-02, 171-03, 171-04, release-version-admin, public-release-story]

tech-stack:
  added: []
  patterns:
    - Composite foreign keys enforce same-release-version typed story targets
    - Transactional projection normalization and complete-list replacement
    - Discriminated media/Kara API items with legacy images/segments retained for compatibility

key-files:
  created:
    - database/migrations/0174_release_version_story_order.up.sql
    - database/migrations/0174_release_version_story_order.down.sql
    - backend/internal/models/release_version_story_order.go
    - backend/internal/repository/release_version_story_order_repository.go
  modified:
    - backend/internal/handlers/admin_content_release_version_media_reorder.go
    - backend/internal/handlers/admin_content_release_version_media_test.go
    - backend/internal/repository/release_detail_public_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - shared/contracts/admin-content.yaml
    - shared/contracts/openapi.yaml
    - frontend/src/types/releaseVersionMedia.ts
    - frontend/src/types/releaseDetail.ts
    - frontend/src/lib/api.ts

key-decisions:
  - "The story-order table is a projection only; release_version_media and theme_segment_assignments remain the ownership sources."
  - "The existing media reorder endpoint carries typed media/Kara items instead of introducing a parallel endpoint."
  - "Public story order is authoritative, while preview/highlight fields remain orthogonal media metadata."

patterns-established:
  - "A media item is identified by type=media plus media_id; Kara is identified by type=kara plus theme_segment_id."
  - "Missing projection rows are appended deterministically; stale rows are removed inside normalization."

requirements-completed: [PH171]

metrics:
  duration: ~35 min
  completed: 2026-09-30
---

# Phase 171 Plan 01: Canonical mixed story order Summary

**A reversible typed story-order projection now drives release-version media/Kara ordering across the existing admin reorder seam and public release DTO contracts.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-09-30T20:20:00Z
- **Completed:** 2026-09-30
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments

- Added migration 0174 with typed target checks, same-release composite foreign keys, uniqueness, deterministic initial ordering, and reversible down migration.
- Extended the existing release-version reorder handler and repository with complete-list validation, canonical 10-step normalization, and transactional projection replacement.
- Added the public `story` projection and synchronized Go, OpenAPI, admin contract, TypeScript, and central API helper documentation while leaving highlight flags independent from story position.

## Task Commits

1. **Task 1: Persist typed story order** - `8b7c19eb` (feat)
2. **Task 2: Extend reorder/public contracts** - `58a37763` (feat)

## Files Created/Modified

- `database/migrations/0174_release_version_story_order.up.sql` / `.down.sql` - reversible typed order projection and deterministic seed.
- `backend/internal/models/release_version_story_order.go` - domain item type constants.
- `backend/internal/repository/release_version_story_order_repository.go` - normalization, listing, complete-list validation, and atomic replacement.
- `backend/internal/handlers/admin_content_release_version_media_reorder.go` - typed request parsing and existing release-version permission seam.
- `backend/internal/repository/release_detail_public_repository.go` and `..._helpers.go` - public mixed story DTO and order projection.
- `shared/contracts/admin-content.yaml`, `shared/contracts/openapi.yaml` - synchronized admin and public contracts.
- `frontend/src/types/releaseVersionMedia.ts`, `releaseDetail.ts`, `frontend/src/lib/api.ts` - synchronized discriminated types and helper seam.
- `backend/internal/handlers/admin_content_release_version_media_test.go` - reorder regression payload updated to the typed contract.

## Decisions Made

The implementation follows D-01, D-02, D-03, and D-16: one typed order projection, exact public consumption, no Kara/media ownership mixing, and centralized auth/API handling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed value comparison for typed nullable IDs**
- **Found during:** Task 1
- **Issue:** Pointer-valued media/segment IDs would compare by pointer identity rather than numeric ID.
- **Fix:** Converted story-order identity keys to value-based media/segment ID fields.
- **Files modified:** `backend/internal/repository/release_version_story_order_repository.go`
- **Verification:** Repository package compile/test command passed.
- **Committed in:** `8b7c19eb`

**2. [Rule 1 - Contract regression] Updated the existing reorder regression fixture**
- **Found during:** Task 2
- **Issue:** The existing focused handler test still sent the removed untyped `id` field.
- **Fix:** Updated both cross-version and same-version cases to send typed `media_id` items.
- **Files modified:** `backend/internal/handlers/admin_content_release_version_media_test.go`
- **Verification:** `TestReleaseVersionMedia_ReorderRequiresVersionOwnership` passed.
- **Committed in:** `58a37763`

**Total deviations:** 2 auto-fixed. Both were directly required by the contract change; no UI or unrelated scope was added.

## Issues Encountered

- The project wrapper exposes the GSD CLI's newer top-level command layout; the legacy `query` verb from the executor reference was unavailable. Code and commit verification were completed directly on the canonical checkout, and pre-existing planning edits were preserved.
- The running backend image did not mount source files, so the focused checks rebuilt the backend image before executing tests.

## Checks Executed

- `docker run --rm -v /home/d1sk/team4s/backend:/src golang:1.25-alpine gofmt -w ...`
- `docker compose run --rm --no-deps team4sv30-backend go test ./internal/repository -run "TestReleaseVersionMedia_ReorderOwnershipValidationExists|TestReleaseVersionMediaTypes" -count=1`
- `docker compose run --rm --no-deps team4sv30-backend go test ./internal/handlers -run "TestReleaseVersionMedia_ReorderRequiresVersionOwnership" -count=1`
- `docker compose run --rm --no-deps team4sv30-backend go test ./internal/repository -run "TestGetPublicReleaseDetail_ResponseFieldsPresent|TestReleaseDetailPublicSegments" -count=1`
- `git diff --check`

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 171-01 is ready for downstream admin/public integration plans. The remaining Phase 171 plans should consume `story` and the typed reorder items rather than introduce another order or asset-ownership seam.

---
*Phase: 171-kara-segmente-in-release-media-und-public-story-integrie*
*Completed: 2026-09-30*

## Self-Check: PASSED

- Summary file exists.
- Task commits 8b7c19eb and 58a37763 are present in git history.
- git diff --check passed after verification.
