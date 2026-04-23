---
phase: 21-fansub-group-chip-mapping-and-collaboration-wiring
plan: 01
subsystem: backend
tags: [go, postgres, fansub-groups, episode-import, release-persistence]
requires: []
provides:
  - explicit `fansub_groups` payload support for import mappings and manual version DTOs
  - deterministic backend collaboration resolution from selected member groups
  - idempotent anime-level fansub link follow-through from persisted release truth
affects: [21-02, 21-03, manual-version-editor, episode-import-workbench]
tech-stack:
  added: []
  patterns:
    - shared selected-group DTOs across import and manual version write contracts
    - backend-owned collaboration canonicalization and anime-link follow-through
key-files:
  created: [.planning/phases/21-fansub-group-chip-mapping-and-collaboration-wiring/21-01-SUMMARY.md]
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/models/episode_version.go
    - backend/internal/handlers/admin_episode_import_validation.go
    - backend/internal/handlers/episode_version_validation.go
    - backend/internal/handlers/fansub_test.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_import_repository_test.go
    - frontend/src/types/episodeImport.ts
key-decisions:
  - "Explicit `fansub_groups` lists are now the preferred write contract; singular `fansub_group_id` and `fansub_group_name` remain compatibility fallbacks."
  - "Selected member groups are canonicalized by backend identity before collaboration lookup or creation so chip order cannot create divergent collaboration records."
  - "Release-version group persistence now also inserts missing `anime_fansub_groups` rows for the effective collaboration and each member group."
patterns-established:
  - "DTO Pattern: carry selected fansub chips as `{id,name,slug}` items instead of screen-local flat strings."
  - "Persistence Pattern: write one effective release group, then mirror the same truth to anime-level relations with idempotent inserts."
requirements-completed: [P21-SC2, P21-SC3, P21-SC5]
duration: 32min
completed: 2026-04-23
---

# Phase 21 Plan 01: Fansub group payload and collaboration persistence summary

**Selected fansub chip payloads now persist through one backend resolver that creates stable collaborations and keeps anime-level group links aligned with release writes.**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-23T09:40:00Z
- **Completed:** 2026-04-23T10:12:00Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Import mappings and manual version DTOs now accept explicit `fansub_groups` arrays with `{id,name,slug}` items.
- Episode import persistence resolves selected member groups deterministically and derives one stable collaboration regardless of chip order.
- Release-version group writes now follow through into `anime_fansub_groups` for the effective collaboration and member groups without duplicate inserts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add explicit selected-group payload support to import and manual version DTOs** - `cfa9ee6` (feat)
2. **Task 2: Resolve member groups and collaborations deterministically in one backend helper** - `8a4f8b7` (feat)
3. **Task 3: Keep anime-level group links aligned with release persistence** - `aca4b74` (feat)

**Plan metadata:** recorded in the final docs commit for this plan.

## Files Created/Modified
- `backend/internal/models/episode_import.go` - adds the shared selected-group payload shape to import mappings.
- `backend/internal/models/episode_version.go` - adds selected-group fields to manual create and patch DTOs.
- `backend/internal/handlers/admin_episode_import_validation.go` - validates explicit selected-group payloads for import apply requests.
- `backend/internal/handlers/episode_version_validation.go` - validates explicit selected-group payloads for manual version create and patch requests.
- `backend/internal/handlers/fansub_test.go` - covers the new validation paths.
- `backend/internal/repository/episode_import_repository_release_helpers.go` - canonicalizes selected groups, resolves collaborations, and mirrors persisted groups to anime-level links.
- `backend/internal/repository/episode_import_repository_test.go` - locks deterministic collaboration naming and idempotent anime-link behavior.
- `frontend/src/types/episodeImport.ts` - exposes the same explicit `fansub_groups` contract to the import workbench.

## Decisions Made

- Preferred the explicit selected-group list when present while preserving singular fallback fields for rollout compatibility.
- Kept collaboration authority fully in the backend so manual editor and import workbench can converge on one persistence contract.
- Inserted anime-level links with `ON CONFLICT DO NOTHING` rather than trying to infer removals from historical release state in this plan.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- A staged commit initially raced the index during parallel execution, so the task files were restaged and committed sequentially.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Import and manual version write contracts now share the same selected-group payload shape.
- The next Phase 21 plan can wire frontend chip UIs to the explicit list without inventing client-side collaboration identities.

## Self-Check

PASSED

---
*Phase: 21-fansub-group-chip-mapping-and-collaboration-wiring*
*Completed: 2026-04-23*
