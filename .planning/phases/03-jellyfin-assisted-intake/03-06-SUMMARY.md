---
phase: 03-jellyfin-assisted-intake
plan: 06
subsystem: jellyfin-takeover-state
tags: [react, nextjs, vitest, jellyfin]
requires:
  - phase: 03-05
    provides: corrected Jellyfin draft hydration contract
provides:
  - takeover-only review state after preview hydration
  - explicit restart path for choosing a different Jellyfin match
  - tests guarding hidden-candidate behavior
affects: [admin-anime-create, jellyfin-intake-ui]
tech-stack:
  added: []
  patterns: [takeover-state machine, explicit restart action, draft-first active surface]
key-files:
  modified:
    - frontend/src/app/admin/anime/hooks/internal/useJellyfinIntakeImpl.ts
    - frontend/src/app/admin/anime/hooks/useJellyfinIntake.ts
    - frontend/src/app/admin/anime/hooks/useJellyfinIntake.test.ts
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
key-decisions:
  - "Once preview hydration succeeds, competing candidates are no longer shown in the active create UI."
  - "Returning to Jellyfin candidate review is explicit via restart rather than implicit during normal drafting."
  - "Takeover-state changes do not introduce deferred upload controls."
requirements-completed: [JFIN-04, JFIN-05]
duration: 14 min
completed: 2026-03-31
---

# Phase 03 Plan 06: Takeover-Only View Summary

**After selecting a Jellyfin match, the shared create draft now becomes the active surface until the admin explicitly reopens candidate review.**

## Accomplishments

- Extended the intake review state with a hydrated takeover mode.
- Marked candidate selection as a real takeover transition after preview hydration instead of leaving the review surface permanently active.
- Added an explicit `Anderen Treffer waehlen` restart path so operators can reopen candidate review intentionally.
- Added regression coverage for takeover-only visibility and restart behavior.

## Verification

- `cd frontend && npm test -- src/app/admin/anime/hooks/useJellyfinIntake.test.ts src/app/admin/anime/create/page.test.tsx`

## Next Readiness

- The create route now matches the clarified Phase 03 UX: one active Jellyfin source after takeover, with alternate matches returning only on explicit restart.
