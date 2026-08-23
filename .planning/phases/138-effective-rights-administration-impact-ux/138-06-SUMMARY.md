---
phase: 138-effective-rights-administration-impact-ux
plan: 06
subsystem: ui
tags: [react, nextjs, typescript, vitest, admin-users, effective-rights, capability-provenance]

requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: ResolveGroupRights (backend/internal/permissions/effective_rights.go), the group-scoped
      inspection/mutation/history HTTP boundary (GET .../effective-rights, PUT/GET .../capability-overrides*),
      and the EffectiveRightState/CapabilityOverrideMutationRequest/CapabilityOverrideMutationResult/
      CapabilityOverrideAuditItem TS contracts in frontend/src/types/admin-capability.ts
provides:
  - Three new frontend/src/lib/api.ts functions (getEffectiveRights, mutateCapabilityOverride,
    listOverrideHistory) wiring the three already-shipped Phase-137 endpoints into the frontend for
    the first time
  - UserGroupRightsTab.tsx re-pointed at the real Phase-137 resolver: multi-group,
    category-grouped, provenance-capable effective-rights inspection surface
affects: [138-08 (guided grant/revoke flows and history panel extend this same file/state shape)]

tech-stack:
  added: []
  patterns:
    - "N calls for N group memberships (Promise.all), not one flattened cross-group call (D-11)"
    - "Controlled multi-instance Accordion sharing one parent-level openCategoryIds Set<string>
       across independent group sections, with all real categories auto-opened once on first
       settled load (matrix + rights resolved together) rather than starting collapsed"
    - "decisiveSourceLabel(state): pure function translating EffectiveRightProvenance into the
       locked D-13 German vocabulary instead of ever rendering raw resolver strings"
    - "Row-level progressive disclosure via a controlled Set<string> of '<groupId>:<actionCode>'
       keys, rendered as an extra <TableRow colSpan> detail row on toggle (Fragment-per-row,
       no bare Switch anywhere in this read-only surface, D-15/D-33)"

key-files:
  created: []
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx

key-decisions:
  - "Folded the previously-independent listRoleCapabilities() effect into the same loadData
     Promise.all as getAdminUserGroupMemberships/getEffectiveRights (still soft-failing to
     matrix=null via .catch(() => null) so a matrix-fetch failure never blocks the tab) --
     this was necessary because the matrix's all_actions is now load-bearing for D-12 category
     grouping (not just an optional cross-nav enhancement as before), and keeping it as a
     fully independent effect would create a render race where categories could still show
     'sonstige'/uncategorized the first time a group renders before the matrix resolves."
  - "Reused categoryDisplayLabel's existing capitalizeFirst fallback for the four categories not
     yet in CATEGORY_LABEL_MAP (gruppenmedien/gruppenseite/rechteverwaltung/review) rather than
     editing frontend/src/app/admin/role-capabilities/capabilityCategories.ts, since that file is
     outside this plan's files_modified list and the existing fallback already produces
     reasonable German-capitalized labels (\"Gruppenmedien\", \"Gruppenseite\",
     \"Rechteverwaltung\", \"Review\") with zero crash risk."
  - "Default-opened all real categories present per group on initial load (not collapsed-by-default
     Accordion) since D-12 explicitly calls for 'wichtige Bereiche standardmässig offen' and each
     group's catalog is small/bounded (not paginated) -- users can still collapse individual
     sections afterward via the existing Accordion toggle."

patterns-established:
  - "Pure decisiveSourceLabel/groupStatesByCategory/sortCategories helpers kept outside the
     component body so future plans (138-08) can reuse the same category grouping without
     duplicating logic."

requirements-completed: [UADM-01]

duration: 20min
completed: 2026-08-23
---

# Phase 138 Plan 06: Effective-Rights Inspector Wiring Summary

**Wired the three shipped Phase-137 effective-rights endpoints (getEffectiveRights, mutateCapabilityOverride, listOverrideHistory) into api.ts, and rewrote UserGroupRightsTab.tsx from the old two-boolean `AdminGroupRightsSummary` heuristic into a multi-group, category-grouped, fully provenance-capable read surface sourced from the real Phase-137 resolver.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-23T17:20:00Z
- **Completed:** 2026-08-23T17:35:45Z
- **Tasks:** 2 completed (Task 2 is TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- `frontend/src/lib/api.ts` now exposes `getEffectiveRights`, `mutateCapabilityOverride`, and `listOverrideHistory` — zero of these existed anywhere in the frontend before this plan (confirmed by grep at plan-authoring time).
- `UserGroupRightsTab.tsx` is fully re-pointed: `getAdminUserGroupRights` and the old `AdminGroupRightsSummary` two-boolean shape are gone from this file entirely (only the still-live backend endpoint and its unused-elsewhere `api.ts` wrapper remain, per the plan's explicit "don't delete the backend endpoint" instruction).
- Per membership (group), the tab now shows the **complete** relevant capability catalog (not just previously-granted rights) grouped by the 7 real registry categories (`gruppe`, `gruppenmedien`, `gruppenseite`, `projekt`, `rechteverwaltung`, `release`, `review`), each row in the locked D-13 compact `Capability | Effektiv | Quelle` shape, expandable to the full provenance detail (`granting_roles`, `specialized_grants`, `user_allow`, `user_deny`, `non_deniable`, `reason_code`) — read-only, zero mutation controls, zero new client-side precedence logic (D-14).
- Two or more group memberships render as fully independent, non-flattened sections (D-11) — verified by a dedicated cross-contamination test.

## Task Commits

Each task was committed atomically:

1. **Task 1: api.ts — wire the three shipped Phase-137 effective-rights endpoints** - `48fa0d70` (feat)
2. **Task 2: UserGroupRightsTab becomes the canonical, multi-group, categorized inspection surface** - `c32c7e6a` (test, RED) → `2f9e5ac6` (feat, GREEN)

**Plan metadata:** (this commit, docs: complete plan)

_Note: Task 2 is a TDD task — RED (`c32c7e6a`) rewrote all 6 `<behavior>` cases against the target contract and confirmed all 6 failed against the old component; GREEN (`2f9e5ac6`) implemented the new component and all 6 passed with zero REFACTOR-phase changes needed._

## Files Created/Modified
- `frontend/src/lib/api.ts` - added `getEffectiveRights` (GET, `apiClientFetch`), `mutateCapabilityOverride` (PUT, `authorizedFetch`), `listOverrideHistory` (GET, `apiClientFetch`), matching the two established fetch conventions exactly per function kind
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - full rewrite: per-group `getEffectiveRights` fan-out, category-grouped `Accordion` sections, compact `Table` rows with expandable provenance detail, `decisiveSourceLabel` German vocabulary translation
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` - full rewrite: 6 new Vitest + Testing Library cases covering all 6 `<behavior>` bullets from the plan

## Decisions Made
- Folded the matrix (`listRoleCapabilities()`) fetch into the same `loadData` `Promise.all` as memberships/rights (soft-failing to `null` on error) instead of keeping it as a fully independent effect, to eliminate a render race now that the matrix is load-bearing for category grouping (previously it was only used for an optional cross-nav link).
- Left `capabilityCategories.ts`'s existing `capitalizeFirst` fallback in place for the four categories not yet in its explicit label map, rather than editing that file (out of this plan's declared `files_modified`); the fallback already produces safe, readable German-capitalized labels.
- Defaulted all real per-group categories to open on first render (per D-12 "wichtige Bereiche standardmässig offen"), since each group's catalog is small and fully relevant, not paginated; collapse remains available via the existing `Accordion` toggle.

## Deviations from Plan

None — plan executed exactly as written. No Rule 1-4 auto-fixes were needed; the only implementation judgment calls (matrix-load timing, category-label fallback, default-open state) are documented above under Decisions Made since they were genuinely undetermined by the plan text rather than a fix to broken/missing behavior.

## Issues Encountered
- Initial test fixture used the same German label ("Gruppe bearbeiten") for both the per-group navigation button and a capability row, causing a `getByText` multiple-match failure. Fixed by renaming the fixture's capability label to "Gruppendaten bearbeiten" (test-only fixture change, not a component bug) before the GREEN run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan 138-08 (guided grant/revoke flows, CAP-08, D-16/D-17) can extend `UserGroupRightsTab.tsx`'s existing expanded-row detail area with action buttons and a history panel (`listOverrideHistory` is already wired in `api.ts` and unused until then) without needing any further inspection-surface rework.
- `mutateCapabilityOverride` is wired in `api.ts` but has zero call sites yet — expected, since this plan is the INSPECTION half of UADM-01 only; the EDITING half is explicitly out of scope here (138-08).

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

- FOUND: frontend/src/lib/api.ts
- FOUND: frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
- FOUND: frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx
- FOUND: 48fa0d70 (Task 1 feat)
- FOUND: c32c7e6a (Task 2 test, RED)
- FOUND: 2f9e5ac6 (Task 2 feat, GREEN)
