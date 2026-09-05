---
phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen
plan: 03
subsystem: ui
tags: [react, typescript, role-catalog, fansubs-admin]

# Dependency graph
requires:
  - phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen (plan 01)
    provides: role_code threaded through public note repositories (unrelated data path, same phase)
provides:
  - useGroupMembersTab.ts's roleSummary now resolves labels via the shared labelForRole(historyRoleOptions, code) catalog path instead of a second hardcoded ROLE_LABELS map
  - historyRoleOptions threading contract from GroupMembersTab.tsx into useGroupMembersTab.ts (state declared before the hook call)
affects: [any future admin fansub group-member/role UI work touching useGroupMembersTab.ts or GroupMembersTab.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns: [catalog-driven role label resolution via labelForRole(rows, code) instead of a local hardcoded map]

key-files:
  created: []
  modified:
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts

key-decisions:
  - "roleSummary resolves labels via labelForRole(historyRoleOptions, role.role_code), the same catalog path GroupMembersTab.tsx already uses for GroupHistRoleDialog/GroupMembersHistTable/GroupMemberFormModals"
  - "historyRoleOptions is threaded into useGroupMembersTab as a new required hook option, fed by GroupMembersTab.tsx's already-loaded state (no second catalog fetch introduced)"
  - "The new regression test captures historicalIdentityOptions via the hook's onActionsChange callback (not result.current), since the hook exposes that field only through onActionsChange, not its direct return value"

patterns-established:
  - "Pattern: any hook that needs role_definitions labels should accept a RoleDefinitionOption[] catalog slice as a prop/option and call labelForRole(rows, code), never invent a local label map"

requirements-completed: [HC-02]

# Metrics
duration: 12min
completed: 2026-09-05
---

# Phase 147 Plan 03: Migrate useGroupMembersTab onto the shared role-catalog path Summary

**Removed the second parallel role-label registry (`ROLE_LABELS`/`roleLabelForCode`) from `useGroupMembersTab.ts` and converged `roleSummary` onto the already-live `labelForRole(historyRoleOptions, code)` catalog path used elsewhere in the same feature area.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-05T14:39:00Z
- **Completed:** 2026-09-05T14:51:03Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Deleted the stale 20-entry `ROLE_LABELS` map and exported `roleLabelForCode` function from `useGroupMembersTab.ts` (had 5 codes that never existed in `role_definitions` and no `karaoke_fx` entry)
- `historicalIdentityOptions`'s `roleSummary` now resolves each open role's label via `labelForRole(historyRoleOptions, role.role_code)`, the one canonical catalog-driven path `GroupMembersTab.tsx` already used for three other UI surfaces
- Threaded `historyRoleOptions: RoleDefinitionOption[]` into `UseGroupMembersTabOptions`, reusing `GroupMembersTab.tsx`'s already-loaded state (no second fetch of the role catalog)
- Reordered `GroupMembersTab.tsx` so the `historyRoleOptions` state/`useEffect` declaration precedes the `useGroupMembersTab(...)` call that now consumes it
- Replaced the removed-function unit test with a real `renderHook`-driven proof that `roleSummary` resolves through the live catalog path with a `RoleDefinitionOption[]` fixture

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate useGroupMembersTab.ts onto labelForRole and thread historyRoleOptions from GroupMembersTab.tsx** - `86cc3781` (feat)
2. **Task 2: Replace the removed-function unit test with a real historicalIdentityOptions call** - `3c0c3b7a` (test)

**Plan metadata:** (this commit) `docs(147-03): complete plan`

## Files Created/Modified
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts` - removed `ROLE_LABELS`/`roleLabelForCode`, added `labelForRole` import and `historyRoleOptions` option, `roleSummary` now catalog-driven (512 → 485 lines)
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx` - moved `historyRoleOptions`/`historyRoleLoadError` state and its `useEffect` above the `useGroupMembersTab(...)` call, passed `historyRoleOptions` into the hook call
- `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts` - removed the `roleLabelForCode` describe block, added a `renderHook`-based test with a mocked `@/lib/api` module and a `RoleDefinitionOption[]` fixture, kept `findDuplicateMemberMatches` suite unchanged

## Decisions Made
- Followed the plan's recommended (non-mandatory) approach exactly: `historyRoleOptions` state declared before the hook call, threaded in as a new required option, no second catalog fetch inside the hook.
- The plan's test action text implied `result.current.historicalIdentityOptions` is directly readable from the hook's return value. Verified during implementation that the hook only exposes `historicalIdentityOptions` through the `onActionsChange({ ... })` callback (see the hook's own `useEffect` at the bottom of the file), not in its `return { ... }` object. The test was written against the hook's actual, unchanged public contract: it passes an `onActionsChange` callback, captures the emitted actions object, and asserts `capturedActions.historicalIdentityOptions.find(...).roleSummary`. This required no production code change — `onActionsChange` was already the hook's real API for this data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the test's access path to historicalIdentityOptions**
- **Found during:** Task 2 (writing the renderHook-based regression test)
- **Issue:** The plan's task text specified asserting against `result.current.historicalIdentityOptions`, but the hook (unchanged by this plan) only exposes that computed value via the `onActionsChange` callback parameter, not via its direct return object. Asserting on `result.current.historicalIdentityOptions` throws `TypeError: Cannot read properties of undefined (reading 'find')`.
- **Fix:** Test now passes an `onActionsChange` callback into `useGroupMembersTab(...)`, captures the emitted `GroupMembersTabActions` object in a local variable, and asserts `capturedActions.historicalIdentityOptions.find(...).roleSummary` instead. No production code was changed — this is purely a corrected test-harness access path against the hook's real, pre-existing public contract.
- **Files modified:** `frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts`
- **Verification:** `npx vitest run "src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts"` — 6/6 tests pass
- **Committed in:** `3c0c3b7a` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, test-only)
**Impact on plan:** No production code or scope impact. The fix only corrects how the new test reaches the value the plan already intended to assert on; the underlying behavior proof (real catalog-driven label resolution via a `RoleDefinitionOption[]` fixture, no direct call to a removed function) is delivered exactly as specified.

## Issues Encountered
None beyond the test-access-path correction documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HC-02 is fully closed: `useGroupMembersTab.ts` carries no parallel role-label registry; `roleSummary` is driven entirely by `role_definitions` via the shared `labelForRole` catalog helper.
- `useGroupMembersTab.ts` remains at 485 lines, still above CLAUDE.md's 450-line modularity limit (pre-existing debt per `147-CONTEXT.md`'s explicit note; this plan reduced it from 512 lines and did not introduce new overage). Splitting the file is out of scope for this plan and remains tracked as separate technical debt.
- Full `frontend/src/app/admin/fansubs/[id]/edit/` test suite re-run clean: 34 test files, 226 tests passed, no regressions.
- `npx tsc --noEmit` and `npx eslint` on all three touched files report zero errors.
- No blockers for the remaining phase 147 plans (147-01 already complete; HC-01/HC-03/HC-09 tracked in other plans of this phase).

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/GroupMembersTab.tsx
- FOUND: frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.test.ts
- FOUND: 86cc3781 (Task 1 commit)
- FOUND: 3c0c3b7a (Task 2 commit)

---
*Phase: 147-rollen-registry-letzte-parallelkataloge-aufl-sen*
*Completed: 2026-09-05*
