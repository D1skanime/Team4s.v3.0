---
phase: 138-effective-rights-administration-impact-ux
plan: 09
subsystem: ui
tags: [react, nextjs, typescript, permissions, admin-ui, effective-rights]

# Dependency graph
requires:
  - phase: 138-04
    provides: "getRoleAssignmentImpactPreview + GET .../role-assignment-impact backend endpoint"
  - phase: 138-06
    provides: "UserGroupRightsTab.tsx canonical per-group effective-rights inspection surface"
  - phase: 138-08
    provides: "activeFlow / loadData()-refresh conventions, GuidedGrantFlow/GuidedRevokeFlow modal patterns"
provides:
  - "RoleAssignmentImpactModal: preview-gated role assign/revoke modal (D-22)"
  - "GroupRolesSection: per-group 'Rollen in dieser Gruppe' mini-section with Entfernen/Rolle-zuweisen actions"
affects: [138-uat, 138-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse existing api.ts mutation functions instead of adding duplicate wrappers for the same endpoint"
    - "Client-side before/after diff arithmetic over already-resolved EffectiveRightState[] (no new precedence logic)"

key-files:
  created:
    - frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.tsx
    - frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.test.tsx
  modified:
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx

key-decisions:
  - "Reused the existing, already-live updateFansubAppMemberRole(fansubId, appUserId, {role, enabled}) mutation instead of adding a new setFansubGroupMemberRole function to frontend/src/lib/api.ts -- the plan's premise that no frontend consumption function existed for PUT .../roles was checked against the real code and found incorrect."
  - "Confirmed the real PUT .../roles backend semantics (backend/internal/handlers/app_auth.go + repository SetRole) are additive/removable multi-role via {role, enabled}, not a 'replace the member's single active role' model -- 'Rolle zuweisen'/'Rolle entfernen' map directly to enabled:true/false."

requirements-completed: [CAP-09]

# Metrics
duration: ~25min
completed: 2026-08-23
---

# Phase 138 Plan 09: Role-Assignment Impact Preview Summary

**Preview-gated role assign/revoke modal (RoleAssignmentImpactModal) wired into UserGroupRightsTab's per-group section, reusing the already-live `updateFansubAppMemberRole` mutation instead of adding a duplicate frontend function.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-23T18:10:03Z
- **Tasks:** 3 planned, 2 code tasks executed as written + 1 task re-scoped (Task 1 became a no-op after verification)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- D-22 closed: before any role assign/revoke, the admin sees a real before/after effective-rights diff (gained/lost/unchanged counts + a changed-only table) computed from `getRoleAssignmentImpactPreview`, and the mutation is only reachable once that preview has successfully loaded (D-18/D-20).
- The role-assignment action lives in the SAME canonical per-group section as the capability catalog and guided-revoke/grant flows (D-09/D-34) — no second, competing editor was created.
- Verified the real backend semantics of `PUT /admin/fansubs/:id/app-members/:appUserId/roles` (additive/removable multi-role via `{role, enabled}`) before wiring "Rolle entfernen", per the plan's explicit instruction not to assume.

## Task Commits

Each task was committed atomically:

1. **Task 1: setFansubGroupMemberRole consumption function** — no commit (re-scoped to a no-op; see Deviations). Verification of the real backend semantics was carried out and is documented in code comments in `RoleAssignmentImpactModal.tsx`.
2. **Task 2: RoleAssignmentImpactModal** — `6b8bef56` (feat)
3. **Task 3: Wire into UserGroupRightsTab's per-group section** — `f35eab65` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.tsx` - Preview-gated role assign/revoke modal; fetches `getRoleAssignmentImpactPreview`, computes gained/lost/unchanged diff client-side, renders a changed-only table, and calls the existing `updateFansubAppMemberRole` on confirm
- `frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.test.tsx` - 5 behavior-driven tests (loading gate, diff arithmetic, changed-only table, confirm gating + mutation wiring, locked preview-error copy)
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - New `GroupRolesSection` replaces the old inline role-badges row: each held role gets an "Entfernen" button (opens the modal in `change="revoke"`), plus an assignable-role `Select` + "Rolle zuweisen" button for roles not yet held; `ActiveFlow` gained a `roleAssignment` variant; `handleMutated`'s parameter is now optional so the modal (which calls `onMutated()` with no argument) and the existing Guided flows (which pass a `CapabilityOverrideMutationResult`) can share the same reload handler
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` - `makeMatrix()` extended with `assignable`/`contexts` fields on two roles; 3 new tests cover the assignable-role Select, the revoke wiring, and the full assign → confirm → reload round trip

## Decisions Made
- Reused `updateFansubAppMemberRole` rather than adding a duplicate `setFansubGroupMemberRole` function to `api.ts` (see Deviations below for full rationale).
- Confirmed the additive/removable multi-role `{role, enabled}` semantics via `backend/internal/handlers/app_auth.go`'s `setFansubGroupMemberRole` and the repository's `SetRole`, and documented this in a code comment at the top of `RoleAssignmentImpactModal.tsx` so the next reader does not have to re-derive it.
- `GroupRolesSection`'s assignable-role filter mirrors the existing conventions exactly: `role.assignable === true && role.role_kind !== 'global_app_role' && (role.contexts ?? []).includes('fansub_group')`, matching `FansubAppMembersSection.tsx`'s `orderForContext(...).filter(assignable)` and `GuidedRevokeFlow.tsx`'s `isFansubGroupCatalogRole` — no third, competing role-catalog filter was introduced.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug in plan's premise] Task 1's stated gap ("no frontend consumption function exists for PUT .../roles") was factually incorrect**
- **Found during:** Task 1 (setFansubGroupMemberRole consumption function)
- **Issue:** 138-09-PLAN.md's interfaces block asserted, based on a grep for the literal names `setFansubGroupMemberRole`/`SetFansubGroupMemberRole`, that "it was simply never called from any frontend surface today." A grep for the actual endpoint path (`app-members/:appUserId/roles`) found `updateFansubAppMemberRole(fansubId, appUserId, payload: FansubAppMemberRoleUpdateRequest)` already exists in `frontend/src/lib/api.ts`, already hits this exact `PUT` endpoint with the exact `{role, enabled}` body the real backend handler expects, and is already live in production, consumed by `frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.tsx` and `RoleAssignmentAfterClaim.tsx` (both with passing tests asserting the exact call shape).
- **Fix:** Did not add a second, differently-named function performing an identical `PUT` with an identical body to the same endpoint — that would be pure duplication with zero functional difference and would leave two call sites to maintain in lockstep. `RoleAssignmentImpactModal.tsx` imports and calls `updateFansubAppMemberRole` directly, with a code comment documenting the confirmed real backend semantics (additive/removable multi-role via `{role, enabled}`, not "replace the member's single active role") and the reason no new function was added.
- **Files modified:** `frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.tsx` (no change to `frontend/src/lib/api.ts` — that file is unmodified by this plan, unlike its `files_modified` frontmatter listing).
- **Verification:** `updateFansubAppMemberRole(1, 42, { role: 'co_leader', enabled: true })` call shape is asserted directly in `RoleAssignmentImpactModal.test.tsx` and in two of the three new `UserGroupRightsTab.test.tsx` cases; `tsc --noEmit` clean.
- **Committed in:** `6b8bef56` (Task 2 commit — the modal's implementation is where this decision materializes in code)

---

**Total deviations:** 1 auto-fixed (Rule 1 — corrected a factually incorrect plan premise before it could produce duplicate maintenance burden)
**Impact on plan:** No scope creep; the plan's functional intent (a preview-gated role assign/revoke surface calling the existing, already-authorized mutation) is fully delivered. The plan's literal acceptance criterion `grep -c "setFansubGroupMemberRole" RoleAssignmentImpactModal.tsx equals 1` does not hold as a result — the modal calls `updateFansubAppMemberRole` instead, which is the correct, non-duplicative implementation of the same intent. `frontend/src/lib/api.ts` is listed in the plan's `files_modified` frontmatter but was not actually touched, since no gap existed there to close.

## Issues Encountered
None beyond the Task 1 premise correction above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- D-22 is fully closed on the frontend: role assignment/revocation now goes through the same "no mutation without a computed preview" contract as capability overrides (D-18/D-20).
- No new backend surface was introduced; the existing `ActionFansubGroupMembersManage`-gated mutation and its audit logging are unchanged (see Threat Flags below).
- `UserGroupRightsTab.tsx` remains the single canonical per-group editor for both effective-rights inspection (Plan 138-06), capability override mutation (Plan 138-08), and now role assignment (this plan) — no competing editor surface exists.

## Threat Flags

None. This plan adds a client-side preview step ahead of the existing, already-authorized `PUT .../roles` mutation; no new endpoint, auth path, or trust boundary was introduced (matches the plan's own threat_model disposition T-138-19: accept).

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.tsx
- FOUND: frontend/src/app/admin/users/tabs/RoleAssignmentImpactModal.test.tsx
- FOUND commit: 6b8bef56
- FOUND commit: f35eab65
