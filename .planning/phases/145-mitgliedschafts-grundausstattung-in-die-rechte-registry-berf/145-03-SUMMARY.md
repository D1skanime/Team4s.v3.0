---
phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf
plan: 03
subsystem: frontend
tags: [admin-ui, capability-matrix, roles, react, vitest]

# Dependency graph
requires:
  - phase: 145-02
    provides: "role_kind: \"reserved_baseline\" now emitted by ListCapabilityMatrix for the pseudo-role"
provides:
  - "RoleRail.tsx roleKindLabel() branch for role_kind === 'reserved_baseline'"
  - "RolesClient.tsx handleSelectRole() defaults the reserved pseudo-role to the Standardrechte tab and never calls listRoleHolders() for it"
  - "RoleCapabilityDetail.tsx membershipBaselineCodes filter now conditional on role_kind !== 'reserved_baseline'; deep-link Button on every other role"
  - "RoleDetailPanel.tsx holderCountText() '–' fallback for the reserved pseudo-role (exported); Inhaber tab static explanation branch"
affects: [145-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "role_kind === 'reserved_baseline' branch precedes role_kind === 'global_app_role' in every conditional this phase touches, mirroring the UI-SPEC's locked placement order"

key-files:
  created: []
  modified:
    - frontend/src/app/admin/roles/RoleRail.tsx
    - frontend/src/app/admin/roles/RoleRail.test.tsx
    - frontend/src/app/admin/roles/RolesClient.tsx
    - frontend/src/app/admin/roles/RolesClient.test.tsx
    - frontend/src/app/admin/roles/RoleCapabilityDetail.tsx
    - frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx
    - frontend/src/app/admin/roles/RoleDetailPanel.tsx
    - frontend/src/app/admin/roles/RoleDetailPanel.test.tsx

key-decisions:
  - "The static explanatory sentence on every other capability-editable role uses the Unicode right double quotation mark (”, U+201D... actually U+201C) instead of a straight ASCII quote after 'Mitgliedschafts-Grundausstattung', matching the project's existing „...\" German-quote typography convention and avoiding a react/no-unescaped-entities lint error the straight quote would have introduced."
  - "holderCountText() is now exported from RoleDetailPanel.tsx (was previously module-private) so the plan's required direct unit test could import it without a render-based workaround."

requirements-completed: [SC-3, SC-5]

# Metrics
duration: ~15min
completed: 2026-09-03
---

# Phase 145 Plan 03: Reserved Pseudo-Role in the Capability Matrix UI Summary

**The `group_member` reserved pseudo-role is now a fully normal row in `/admin/roles`: correctly labeled, defaulting to its Standardrechte tab with no holder fetch, its 3 baseline actions editable through the exact same accordion/Switch machinery as any other role, and every other role's static baseline sentence now deep-links to it.**

## Performance

- **Duration:** ~15 min (15:23-15:29 UTC)
- **Started:** 2026-09-03T15:23:00Z
- **Completed:** 2026-09-03T15:29:03Z
- **Tasks:** 3
- **Files modified:** 8 (0 created, 8 modified)

## Accomplishments
- `RoleRail.tsx`'s `roleKindLabel()` returns `'Grundausstattung aller aktiven Mitglieder'` for `role_kind === 'reserved_baseline'`, placed before the `global_app_role` check per the UI-SPEC's locked placement order — no rail-grouping change needed since the pseudo-role already falls into `groupRoles`.
- `RolesClient.tsx`'s `handleSelectRole()` treats `role_kind === 'reserved_baseline'` identically to `global_app_role` for tab-default purposes (defaults to `'caps'`) and explicitly excludes it from the `loadHolders()` call, so `listRoleHolders('group_member')` is never invoked.
- `RoleCapabilityDetail.tsx`'s `membershipBaselineCodes` filter is now conditional (`isReservedBaseline ? role.actions : role.actions.filter(...)`) — the pseudo-role's 3 baseline actions flow through the unmodified category/accordion/`Switch` rendering pipeline, with zero special-cased rendering path. Every other capability-editable role now renders the updated sentence plus a `Button variant="ghost" size="sm"` deep-linking to `/admin/roles?role=group_member&tab=caps`; the pseudo-role itself renders a caution-line paragraph instead (no button — it is the link's target).
- `RoleDetailPanel.tsx`'s `holderCountText()` gained a `role_kind === 'reserved_baseline'` branch returning `'–'` (now exported for direct unit testing) — a genuine bug-fix: without it, selecting the pseudo-role would have displayed a stale holder count left over from whichever role was previously selected, since `loadHolders()` is skipped for it and `holders` state is never reset on role change. The "Inhaber" tab renders a static explanatory paragraph (no button, no `RoleHoldersTable`) for the pseudo-role.

## Task Commits

Each task was committed atomically:

1. **Task 1: Role rail label + selection/tab-default wiring** - `01f0d66e` (feat)
2. **Task 2: RoleCapabilityDetail.tsx — conditional baseline-codes filter + deep-link sentence** - `0ae525b6` (feat)
3. **Task 3: RoleDetailPanel.tsx — Inhaber-tab explanation branch + holderCountText fallback fix** - `ccca240e` (fix)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `frontend/src/app/admin/roles/RoleRail.tsx` - new `roleKindLabel()` branch for `reserved_baseline`
- `frontend/src/app/admin/roles/RoleRail.test.tsx` - direct unit test asserting the exact caption string
- `frontend/src/app/admin/roles/RolesClient.tsx` - `handleSelectRole()` tab-default + `loadHolders()` exclusion for `reserved_baseline`
- `frontend/src/app/admin/roles/RolesClient.test.tsx` - new "Test B2" case (`?role=group_member`) mirroring the existing `?role=platform_admin` pattern
- `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx` - conditional `membershipBaselineCodes` filter, new `Button` import, split caution-line/deep-link paragraph rendering
- `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` - two new cases covering both the reserved-role (all 3 actions as normal `Switch` rows) and normal-role (deep-link `Button` + updated sentence) branches
- `frontend/src/app/admin/roles/RoleDetailPanel.tsx` - `holderCountText()` `'–'` branch (exported), Inhaber-tab `isReservedBaseline` content branch
- `frontend/src/app/admin/roles/RoleDetailPanel.test.tsx` - direct `holderCountText` unit test + render-based Inhaber-tab test

## Decisions Made
- The updated static sentence's closing German quote after „Mitgliedschafts-Grundausstattung uses the Unicode typographic right double quotation mark instead of a straight ASCII `"`, matching the project's existing German-quote convention (`„...`) and resolving a `react/no-unescaped-entities` lint error the straight quote introduced — a Rule 1 auto-fix found while running the plan's own eslint verification step.
- `holderCountText()` is exported from `RoleDetailPanel.tsx` (previously module-private) so the plan's required direct unit test (per `<action>`) could assert it without a render-based workaround, as instructed by the plan text itself ("check whether `holderCountText` is currently exported... and export it if not").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed `react/no-unescaped-entities` lint error from a straight ASCII closing quote**
- **Found during:** Task 2, running the plan's own required `npx eslint . --rule '{"no-restricted-syntax":"error"}'` verification step (broadened to a full `npx eslint` run of the touched file to confirm zero new errors of any kind, not just the named rule)
- **Issue:** The new deep-link sentence's copy (`„Mitgliedschafts-Grundausstattung"`) used a straight ASCII `"` as its closing quote, which JSX/ESLint's `react/no-unescaped-entities` rule flags as an error (not just a style nit) since it can visually mismatch the browser's rendering of a raw `"` character.
- **Fix:** Replaced the straight closing quote with the Unicode right double quotation mark character, matching the opening „ and the project's existing German-quote typography elsewhere in the codebase.
- **Files modified:** `frontend/src/app/admin/roles/RoleCapabilityDetail.tsx`, `frontend/src/app/admin/roles/RoleCapabilityDetail.test.tsx` (test assertion string updated to match)
- **Verification:** `npx eslint src/app/admin/roles/RoleCapabilityDetail.tsx` shows 0 errors (only the pre-existing, untouched `react-hooks/exhaustive-deps` warning remains); all 8 tests in the file still pass.
- **Committed in:** `0ae525b6` (Task 2 commit — fixed before commit, not a separate follow-up commit)

**Total deviations:** 1 auto-fixed (pre-commit lint fix, no separate commit needed)
**Impact on plan:** No scope creep — the fix only changed one character's Unicode codepoint in production copy and its mirrored test assertion string; no behavior, structure, or additional file was touched.

## Issues Encountered
None beyond the lint fix documented above.

## User Setup Required
None — no external service configuration required. All verification ran against the existing `team4sv30-frontend` container.

## Next Phase Readiness
- ROADMAP.md Success Criterion 3's UI half is now true: the pseudo-role's 3 baseline actions render through the identical accordion/Switch machinery as any other role's capabilities, with zero special-cased rendering path (proven by `RoleCapabilityDetail.test.tsx`'s new reserved-role case asserting exactly 3 `Switch` elements, all checked).
- ROADMAP.md Success Criterion 5's UI half is now true: the pseudo-role is visible (first row under "Gruppenrollen", per migration 0160's `sort_order = -10` from Plan 145-01 — no client-side sort needed), correctly labeled, capability-editable, and never appears as an assignable role (its Inhaber tab shows a static explanation, never a holder fetch or table); every other role's static baseline-explanation sentence now deep-links to it.
- Full `src/app/admin/roles/` suite is green: 7 files, 55 tests, 0 regressions. `tsc --noEmit` shows no new errors in the 4 touched component files. `eslint` shows zero new `no-restricted-syntax` findings and zero new errors of any kind in the touched files (one pre-existing, untouched `react-hooks/exhaustive-deps` warning in `RoleCapabilityDetail.tsx` remains, unrelated to this plan's diff).
- Plan 145-04 (the phase's closing, non-autonomous, live-UAT plan) can proceed: the Capability Matrix UI is now ready for a human operator to toggle one of the pseudo-role's 3 baseline actions off in the browser and confirm the effect on a real active fansub-group member's effective rights.
- No blockers identified for continuing to 145-04.

---
*Phase: 145-mitgliedschafts-grundausstattung-in-die-rechte-registry-berf*
*Completed: 2026-09-03*

## Self-Check: PASSED

All 8 listed key-files found on disk; all 3 task commit hashes (01f0d66e, 0ae525b6, ccca240e) found in git history.
