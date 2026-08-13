---
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
plan: 03
subsystem: api
tags: [go, typescript, postgres, episode-version, fansub-groups, verification]
requires:
  - phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
    provides: backend-selected-group resolver and anime_fansub_groups follow-through from 21-01
provides:
  - manual episode-version saves now submit selected fansub groups to the backend
  - release-native manual create/update/get repository paths resolve groups through the shared backend helper
  - one operator runbook verifies import persistence, manual-editor persistence, and anime fansub follow-through together
affects: [episode-version-editor, episode-import, fansub-collaboration, anime-fansub-links]
tech-stack:
  added: []
  patterns: [backend-authoritative selected fansub groups, shared release-version group resolution, SQL-backed verification runbook]
key-files:
  created:
    - .planning/phases/21-fansub-group-chip-mapping-and-collaboration-wiring/21-VERIFICATION.md
  modified:
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
    - frontend/src/types/episodeVersion.ts
    - backend/internal/repository/episode_version_repository.go
key-decisions:
  - "Manual episode-version saves now submit fansub_groups directly and let the backend own collaboration identity."
  - "Manual release-version writes reuse the import-era selected-group resolver so release_version_groups and anime_fansub_groups stay aligned."
patterns-established:
  - "Manual and import write surfaces both persist member-group selections and rely on backend collaboration resolution."
  - "Phase verification for fansub collaboration work should prove release_version_groups, fansub_collaboration_members, and anime_fansub_groups together."
requirements-completed: [P21-SC3, P21-SC5]
duration: 28min
completed: 2026-04-23
---

# Phase 21 Plan 03: Manual Collaboration Wiring Summary

**Manual episode-version saves now use backend-owned fansub group selection, release-native repository writes, and a shared SQL verification runbook**

## Performance

- **Duration:** 28 min
- **Started:** 2026-04-23T09:00:00Z
- **Completed:** 2026-04-23T09:28:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Removed frontend-authored collaboration creation from the manual episode-version editor save path.
- Implemented release-native manual `GetByID`, `Create`, and `Update` repository writes using the shared selected-group resolver and anime-link follow-through.
- Replaced the plan-audit placeholder with a live verification runbook covering import reuse, new collaboration creation, and manual editor save checks.

## Task Commits

1. **Task 1: Remove frontend-authored collaboration identity from the manual editor save path** - `52322cc` (`feat`)
2. **Task 2: Wire manual create/update repository writes through the same group resolver used by import** - `683b0ac` (`feat`)
3. **Task 3: Capture one verification script for import, manual editor, and anime-fansub consistency** - `05a17e3` (`docs`)

## Files Created/Modified

- `frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts` - stops mutating collaboration groups before save and sends `fansub_groups` in the patch payload
- `frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts` - removes collaboration slug/name generation from the persistence path
- `frontend/src/types/episodeVersion.ts` - adds typed `fansub_groups` support to manual create/update requests
- `backend/internal/repository/episode_version_repository.go` - implements release-native manual get/create/update and reuses the shared group resolver
- `.planning/phases/21-fansub-group-chip-mapping-and-collaboration-wiring/21-VERIFICATION.md` - documents exact UI and SQL checks across import, collaboration creation, and manual save

## Decisions Made

- Manual editor persistence now treats the selected group list as the only authoritative client input; collaboration IDs remain backend-derived.
- Manual repository writes reuse the import helper layer instead of adding a second collaboration/linking implementation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced remaining manual episode-version repository stubs**
- **Found during:** Task 2
- **Issue:** `GetByID`, `Create`, and `Update` in `backend/internal/repository/episode_version_repository.go` still returned Phase-20 deferred errors, which would leave the manual editor contract non-functional even after the frontend payload change.
- **Fix:** Implemented release-native read/write behavior, stream/source updates, and selected-group syncing through the existing import helper seam.
- **Files modified:** `backend/internal/repository/episode_version_repository.go`
- **Verification:** `cd backend && go test ./internal/repository ./internal/handlers -count=1`
- **Committed in:** `683b0ac`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for correctness. No architectural scope change.

## Issues Encountered

- Frontend-wide `npm.cmd exec tsc --noEmit` still fails in unrelated pre-existing anime-create test files. No failures were tied to the episode-version editor files touched by this plan.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness

- Import and manual episode-version writes now share the same backend collaboration contract.
- `21-VERIFICATION.md` can be used for live UAT to confirm persistence through both write surfaces.

## Self-Check

PASSED

- Found `.planning/phases/21-fansub-group-chip-mapping-and-collaboration-wiring/21-03-SUMMARY.md`
- Found `.planning/phases/21-fansub-group-chip-mapping-and-collaboration-wiring/21-VERIFICATION.md`
- Found task commits `52322cc`, `683b0ac`, and `05a17e3`
