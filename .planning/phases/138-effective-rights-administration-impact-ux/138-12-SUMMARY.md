---
phase: 138-effective-rights-administration-impact-ux
plan: 12
subsystem: ui
tags: [nextjs, react, admin, rbac, fansub-groups]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "Plan 138-01's AuthzRepository.ListRoleHolders + GET /api/v1/admin/role-holders/:roleCode endpoint, listRoleHolders() in api.ts, RoleHolderEntry type"
provides:
  - "/admin/roles top-level route (D-07): role picker for fansub-group-context roles"
  - "RoleHoldersTable: Benutzer | Gruppe | Status | Rechte-Abweichungen | letzte Aktivität, bidirectionally navigable to the canonical user/group editors"
  - "Secondary link from each role to the existing /admin/role-capabilities?role= split-view"
affects: [admin-nav, effective-rights-ux]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role picker reuses the already-fetched listRoleCapabilities() matrix filtered to role_kind !== 'global_app_role' && contexts.includes('fansub_group') — no second, separately-fetched role catalog"
    - "RoleHoldersTable's own independent Loading/Error state triad, separate from the picker's own loading state (mirrors RoleCapabilityClient.tsx's master/detail independence)"
    - "D-32 narrow-viewport (<760px) Card-row collapse reusing ClaimsClient.tsx's exact useIsMobile/759px matchMedia breakpoint"
    - "statusVariant/statusLabel reused verbatim from UserDetailPageClient.tsx rather than a second, competing status-badge mapping"

key-files:
  created:
    - frontend/src/app/admin/roles/page.tsx
    - frontend/src/app/admin/roles/RolesClient.tsx
    - frontend/src/app/admin/roles/RoleHoldersTable.tsx
    - frontend/src/app/admin/roles/RoleHoldersTable.test.tsx
  modified: []

key-decisions:
  - "Benutzer/Gruppe cells use onClick + useRouter().push (ClaimsClient.tsx's established pattern from Plan 138-10), not Button href, for consistency with the most recent central-admin-list precedent."
  - "'letzte Aktivität' column renders '–' since RoleHolderEntry does not carry this field today (Plan 138-01's endpoint scope); not invented as a fake timestamp, per the plan's explicit instruction."
  - "Clicking a Benutzer cell navigates to /admin/users/:id (the existing 'Rollen & Rechte' tab already lists all of that user's groups) rather than building a second one-group-only deep-link view, satisfying D-07/D-09's 'canonical editor' requirement without a parallel surface."

patterns-established:
  - "Pattern: role picker as a Card-row list with a primary selection Button and a clearly secondary 'view standard capabilities' link Button as row siblings (not nested interactive elements)"

requirements-completed: []

# Metrics
duration: ~15min
completed: 2026-08-23
---

# Phase 138 Plan 12: /admin/roles Role-Holders Route Summary

**New `/admin/roles` top-level admin route with a fansub-group role picker and a bidirectionally-navigable "who holds this role" table, consuming Plan 138-01's role-holders endpoint.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-08-23T18:28:29Z
- **Completed:** 2026-08-23T18:33:25Z
- **Tasks:** 2 completed
- **Files modified:** 4 (all new)

## Accomplishments
- `/admin/roles` route answers D-07's "wer besitzt diese Rolle?" first, with the role's default capability set reachable only via a clearly secondary link
- `RoleHoldersTable` gives D-02/D-09 a real bidirectional navigation target: Benutzer and Gruppe cells are real `Button` navigation (not text) to the canonical `/admin/users/:id` and `/admin/fansubs/:id/edit` editors
- D-32's narrow-viewport (<760px) Card-row collapse implemented, mirroring the exact breakpoint/pattern already established in Plan 138-10's ClaimsClient

## Task Commits

Each task was committed atomically:

1. **Task 1: /admin/roles route + role picker** - `3ef15757` (feat)
2. **Task 2: RoleHoldersTable** - `19a6b293` (test, RED) → `c8925233` (feat, GREEN)

**Plan metadata:** (this commit)

_Note: Task 2 is TDD — test commit (RED, 5 failing-to-resolve tests) followed by feat commit (GREEN, 5/5 passing)._

## Files Created/Modified
- `frontend/src/app/admin/roles/page.tsx` - PlatformAdminGate-wrapped route entry, mirrors `admin/role-capabilities/page.tsx`
- `frontend/src/app/admin/roles/RolesClient.tsx` - Role picker (fansub-group-context roles only) + wires RoleHoldersTable on selection
- `frontend/src/app/admin/roles/RoleHoldersTable.tsx` - The D-07 holders table/card-collapse component
- `frontend/src/app/admin/roles/RoleHoldersTable.test.tsx` - 5 tests: empty state, Benutzer navigation, Gruppe navigation, Ja/Nein override indicator (both states)

## Decisions Made
- Reused `listRoleCapabilities()`'s already-fetched matrix for the role picker rather than adding a second role-list fetch (per the plan's interfaces block).
- Reused `UserDetailPageClient.tsx`'s exact `statusVariant`/`statusLabel` mapping for the Status badge rather than inventing a second mapping — even though `fansub_group_members.status` only has `'active'`/`'disabled'` today (migration 0073), the `'pending'` branch is kept for consistency with the original function it mirrors.
- Followed `ClaimsClient.tsx`'s (Plan 138-10) exact `useRouter().push()` navigation pattern for Benutzer/Gruppe cells rather than `Button href=` (both patterns exist in the codebase; the more recent central-admin-list precedent was chosen for consistency with sibling `/admin/claims` and `/admin/changes` routes).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/admin/roles` is live and reachable; no remaining Phase-138 work depends on this plan today per the roadmap.
- Known, explicitly-documented gap (not a blocker): "letzte Aktivität" renders `–` because `RoleHolderEntry` does not carry an activity timestamp yet. A follow-up could extend Plan 138-01's query if this needs closing — not one of the four hard-gate roadmap criteria for this phase.

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/roles/page.tsx
- FOUND: frontend/src/app/admin/roles/RolesClient.tsx
- FOUND: frontend/src/app/admin/roles/RoleHoldersTable.tsx
- FOUND: frontend/src/app/admin/roles/RoleHoldersTable.test.tsx
- FOUND commit: 3ef15757
- FOUND commit: 19a6b293
- FOUND commit: c8925233

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*
