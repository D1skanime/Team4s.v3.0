---
phase: 136-capability-policy-catalog-schema-contract
plan: 26
subsystem: authorization
tags: [react, typescript, capabilities, media]
requires:
  - phase: 136-25
    provides: exact five-action narrow group capability projection
provides:
  - narrow-capability workspace and tab admission
  - media-list visibility gated by read capability
affects: [136-27, group-admin-workspace]
tech-stack:
  added: []
  patterns: [read-prerequisite UI gating, independent narrow capability predicates]
key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx
key-decisions:
  - "Media-list visibility requires can_view_group_media or platform admin even when mutation rights exist."
  - "can_edit_group_general remains independent from broad can_edit_group while admitting Basic as the default tab."
patterns-established:
  - "Narrow workspace capabilities map to exact usable tabs without synthesizing broad edit authority."
requirements-completed: [CAP-12, CAP-13, QUAL-01]
duration: 5min
completed: 2026-08-21
---

# Phase 136 Plan 26: Narrow Workspace Admission Summary

**Narrow group roles now enter only usable workspace areas, with read-gated media visibility and Basic as the explicit general-editor default.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-21T10:31:00Z
- **Completed:** 2026-08-21T10:35:52Z
- **Tasks:** 1 TDD task
- **Files modified:** 4

## Accomplishments

- Admitted general-edit-only actors to Basic without converting their right into broad group edit.
- Admitted founding-history actors only to group history and narrow link actors to the existing Basic/link surface.
- Prevented upload, update, reorder, delete, or broad-edit rights from exposing a media list unless the actor can actually view group media.
- Added focused general-only, broad-only, combined narrow, all-false, founding, link, and mutation-only media coverage.

## Task Commits

1. **Task 1 RED:** `4c7295d0` — specify narrow workspace access.
2. **Task 1 GREEN:** `778f16fe` — admit only usable narrow workspace areas.

## Files Created/Modified

- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.ts` — exact narrow tab and workspace predicates.
- `frontend/src/app/admin/fansubs/[id]/edit/fansubEditAccess.test.ts` — focused narrow-role access matrix.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` — read-prerequisite media rendering.
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` — mutation-only media regression.

## Decisions Made

- Media mutation rights remain available only inside a list the actor can read; they do not independently make the Media tab visible.
- General-edit, technical-link, and group-link update rights admit the existing Basic surface, while founding-history admits only Gruppengeschichte.
- Workspace admission enumerates usable surfaces explicitly instead of accepting any truthy response property.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- Focused frontend access/media suites: PASS, 29 tests.
- Focused backend direct-enforcement and capability suites: PASS.
- ESLint on all four plan-owned files: PASS.
- `git diff --check HEAD~2..HEAD`: PASS.
- Frontend typecheck: plan-owned files PASS; the command remains blocked by the pre-existing generated `.next/dev/types` route declarations documented in 136-25.

## Known Stubs

None.

## Threat Review

- UI gating mirrors server decisions and does not replace mutation authorization.
- Broad `can_edit_group` is not synthesized from any narrow capability.
- The existing refresh-capable central API client and auth-session gate remain unchanged.

## Deferred Issues

- Existing generated Next.js route type errors remain outside Plan 136-26 scope.

## Self-Check: PASSED

- All four plan-owned files exist.
- Commits `4c7295d0` and `778f16fe` exist in Git history.
- No tracked files were deleted by either task commit.

---
*Phase: 136-capability-policy-catalog-schema-contract*
*Completed: 2026-08-21*
