---
phase: 03-jellyfin-assisted-intake
plan: 01
subsystem: api
tags: [go, gin, jellyfin, admin, intake]
requires:
  - phase: 02-manual-intake-baseline
    provides: shared create draft and save-bar contract
provides:
  - phase 3 jellyfin intake search contract with candidate evidence
  - draft-only jellyfin intake preview endpoint
  - explicit asset-slot payloads with empty-state shape
affects: [phase-03-02, phase-03-03, phase-03-04, admin-anime-create]
tech-stack:
  added: []
  patterns: [draft-only intake contracts, advisory type-hint payloads, jellyfin proxy asset references]
key-files:
  created:
    - backend/internal/models/admin_jellyfin_intake.go
    - backend/internal/handlers/jellyfin_intake_helpers.go
    - backend/internal/handlers/jellyfin_intake_preview.go
    - backend/internal/handlers/jellyfin_search_test.go
    - backend/internal/handlers/jellyfin_intake_preview_test.go
    - backend/internal/repository/anime_metadata_repository.go
  modified:
    - backend/internal/handlers/jellyfin_client.go
    - backend/internal/handlers/jellyfin_search.go
    - backend/cmd/server/admin_routes.go
key-decisions:
  - "Phase 3 search stays compact-first but still emits full path, parent/library context, preview references, and advisory type hints."
  - "Jellyfin intake preview is a dedicated draft-only endpoint and does not reuse the persisted-anime sync preview payload."
  - "Jellyfin asset evidence uses Team4s media proxy URLs and explicit empty-slot payloads instead of browser-direct Jellyfin access."
patterns-established:
  - "Pattern 1: intake contracts return visible advisory hints with plain-language reasons instead of auto-assigning anime type."
  - "Pattern 2: draft asset slots always exist in payload shape, even when Jellyfin has no asset for that slot."
requirements-completed: [JFIN-01, JFIN-02, JFIN-04, JFIN-05, JFIN-06]
duration: 16 min
completed: 2026-03-25
---

# Phase 03 Plan 01: Jellyfin Intake Backend Contract Summary

**Draft-only Jellyfin intake contracts with ranked candidate evidence, proxy-backed preview assets, and advisory type-hint metadata**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-25T14:05:00+01:00
- **Completed:** 2026-03-25T14:20:41+01:00
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Added Phase-3-specific Jellyfin intake search and preview response structs instead of reusing the persisted-anime preview shape.
- Locked the candidate-evidence and draft-slot contract in focused backend tests for ranking, type-hint reasons, and explicit empty slots.
- Registered a new draft-only Jellyfin intake preview endpoint and enriched admin Jellyfin search responses with candidate-review data.

## Task Commits

Each task was committed atomically:

1. **Task 1: Lock the Phase 3 Jellyfin intake contracts in backend tests and response structs** - `ba2f137` (test)
2. **Task 2: Implement draft-safe Jellyfin search enrichment and the new intake preview endpoint** - `c86a713` (feat)

## Files Created/Modified

- `backend/internal/models/admin_jellyfin_intake.go` - Phase 3 search/preview structs and asset-slot payloads
- `backend/internal/handlers/jellyfin_intake_helpers.go` - candidate ranking, path evidence, advisory type hints, and asset-slot mapping
- `backend/internal/handlers/jellyfin_intake_preview.go` - draft-only intake preview endpoint for a chosen Jellyfin candidate
- `backend/internal/handlers/jellyfin_search_test.go` - coverage for ranked candidate evidence and preview references
- `backend/internal/handlers/jellyfin_intake_preview_test.go` - coverage for metadata hydration, slot presence, and explicit empty states
- `backend/internal/handlers/jellyfin_client.go` - Jellyfin detail/theme-video fetch helpers for intake preview
- `backend/internal/handlers/jellyfin_search.go` - enriched intake search mapping for Phase 3
- `backend/cmd/server/admin_routes.go` - admin intake preview route registration
- `backend/internal/repository/anime_metadata_repository.go` - compatibility shim to unblock handler-package compilation

## Decisions Made

- Search responses keep the old base identity fields and add richer evidence so existing consumers do not lose compatibility while Phase 3 frontend catches up.
- Asset previews are emitted as Team4s proxy URLs, keeping Jellyfin credentials out of the browser.
- Type inference remains advisory, with reasons carried directly in the payload for later UI display.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Registered the new admin intake route in `admin_routes.go` instead of `main.go`**
- **Found during:** Task 2
- **Issue:** The plan referenced `backend/cmd/server/main.go`, but admin route registration actually lives in `backend/cmd/server/admin_routes.go`.
- **Fix:** Hooked the new preview endpoint into `admin_routes.go`, preserving the real brownfield route structure.
- **Files modified:** `backend/cmd/server/admin_routes.go`
- **Verification:** Focused handler test slice passed and route file now contains the intake preview registration.
- **Committed in:** `c86a713`

**2. [Rule 3 - Blocking] Restored missing metadata repository compatibility for handler-package compilation**
- **Found during:** Task 2 verification
- **Issue:** An older metadata backfill service still referenced `AnimeMetadataRepository`, which no longer existed, blocking `go test ./internal/handlers`.
- **Fix:** Added `backend/internal/repository/anime_metadata_repository.go` as a compatibility shim with the legacy metadata methods.
- **Files modified:** `backend/internal/repository/anime_metadata_repository.go`
- **Verification:** `go test ./internal/handlers -run "Test.*Jellyfin.*(Search|IntakePreview)" -count=1` passed.
- **Committed in:** `c86a713`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were small brownfield corrections needed for real execution and did not widen the Phase 3 product scope.

## Issues Encountered

- The known compile blocker in `anime_metadata_backfill.go` was still active at first test run, but it turned out to be a small repository-compatibility drift and was resolved inline.

## User Setup Required

None - no new external service configuration was introduced beyond the already-required Jellyfin env values.

## Next Phase Readiness

- Wave 2 can now consume a stable backend contract for compact search, candidate review evidence, and draft hydration.
- The frontend next only needs to call the new search/preview seams and render the provided evidence rather than inventing payload shape.

---
*Phase: 03-jellyfin-assisted-intake*
*Completed: 2026-03-25*
