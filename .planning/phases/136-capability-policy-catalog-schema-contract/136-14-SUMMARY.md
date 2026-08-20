---
phase: 136-capability-policy-catalog-schema-contract
plan: 14
subsystem: backend-authorization
tags: [go, authorization, fansub-groups, history, bola]
requires:
  - phase: 136-08
    provides: narrow role-default capability enforcement seams
provides:
  - event-type-aware founding-history authorization
  - lifecycle-safe fansub group patch authorization
  - regression coverage for cross-type history and mixed patch action classification
affects: [phase-137, fansub group administration, capability overrides]
tech-stack:
  added: []
  patterns: [payload-aware permission selection, all-actions-required mixed patches]
key-files:
  created: []
  modified:
    - backend/internal/handlers/fansub_group_history_handler.go
    - backend/internal/handlers/fansub_groups.go
    - backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go
key-decisions:
  - "Only founding-to-founding history writes use fansub_group_page.founding_history_edit; every operation involving another event type requires fansub_group.members.manage."
  - "Status and group_type remain behind fansub_group.edit while name and country use the narrow general-edit capability."
patterns-established:
  - "Permission action selection derives from both persisted and requested effective history event types before mutation."
requirements-completed: [CAP-13]
duration: 18min
completed: 2026-08-20
---

# Phase 136 Plan 14: Narrow Founder and Lifecycle Authorization Summary

**Founder history rights are now limited to founding events, while status and group-type patches require the stronger group-edit authority even inside mixed requests.**

## Performance

- **Duration:** 18 min
- **Completed:** 2026-08-20
- **Tasks:** 2 TDD tasks
- **Files modified:** 3

## Accomplishments

- Moved create-history authorization behind event parsing so the submitted event selects the required capability.
- Loaded and scoped the stored history row before PATCH authorization, then evaluated both stored and requested effective event types.
- Removed status and group type from the co-leader general-edit class and preserved all-actions-required mixed patch enforcement.
- Added regression coverage for every non-founding event, both cross-type directions, lifecycle fields, and mixed action sets.

## Task Commits

1. **RED: Specify narrow history and lifecycle authorization** — `2c89d6f1`
2. **GREEN: Enforce event-aware and lifecycle-safe permissions** — `c04c2cbe`

## Files Created/Modified

- `backend/internal/handlers/fansub_group_history_handler.go` — selects founding or stronger history authority from stored/requested event types.
- `backend/internal/handlers/fansub_groups.go` — maps status and group type to `fansub_group.edit`.
- `backend/internal/handlers/phase136_narrow_role_defaults_enforcement_test.go` — verifies event and patch action classification.

## Decisions Made

- The existing `fansub_group.members.manage` authority remains the stronger history-management seam, matching history deletion behavior.
- A history type transition involving any non-founding type requires the stronger authority; founder-only permission cannot smuggle either transition direction.
- Mixed group patches retain deterministic deduplicated action ordering and are rejected before repository update when any action is denied.

## Deviations from Plan

None - plan executed within the existing handler and permission-service seams.

## Issues Encountered

- The Linux host has no standalone Go toolchain by design; formatting and tests ran inside the backend Compose service.
- The repository contained unrelated concurrent migration edits and pre-existing user/runtime dirt; only this plan's three handler files were staged.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, schema, file-access, or authentication surface was introduced.

## User Setup Required

None.

## Next Phase Readiness

- D-17 through D-19 now enforce the intended narrow defaults without introducing Phase-137 override resolution.
- The legacy anime/group releases route and deferred Findings #33/#34 were not touched.

## Self-Check: PASSED

- All three modified files exist.
- Commits `2c89d6f1` and `c04c2cbe` exist.
- Focused handler tests and `git diff --check` passed.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-20*

