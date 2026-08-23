---
phase: 138-effective-rights-administration-impact-ux
plan: 08
subsystem: ui
tags: [react, nextjs, capability-overrides, effective-rights, admin, german-copy]

requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "Plan 138-06's re-pointed UserGroupRightsTab.tsx (multi-group, category-grouped effective-rights inspection surface) and Plan 138-02's ActivationStatusIndicator/honest cache-reload contract"
provides:
  - "GuidedRevokeFlow.tsx: honest guided 'Recht entziehen' modal (sources -> confirm -> status), plus the shared 'Abweichung entfernen' reversion path for an existing user_deny override"
  - "GuidedGrantFlow.tsx: symmetric guided 'Recht zusätzlich erlauben' modal (no source-explanation step, no non-deniable case), plus the same reversion path for an existing user_allow override"
  - "CapabilityHistoryPanel.tsx: compact inline per-capability override history (D-13b), client-filtered from a shared group history page"
  - "UserGroupRightsTab.tsx row-expansion area now renders all three locked business-verb actions plus the inline history panel, and refreshes on every confirmed mutation"
affects: [138-09, capability-administration, admin-users]

tech-stack:
  added: []
  patterns:
    - "Guided multi-step Modal driven by internal FlowStep state ('sources'|'confirm'|'status' or 'confirm'|'status'), never closing/reopening across steps (D-21 stays-open pattern)"
    - "Two independently-gated components (GuidedRevokeFlow/GuidedGrantFlow) both internally detect their own 'existing override' reversion mode from the passed EffectiveRightState (user_deny/user_allow) rather than needing a fourth component"
    - "Reason picker (Select + conditional Textarea for 'other') built exclusively from @/components/ui via FormField+Select+Textarea, matching the reason-category German label map already established for CapabilityHistoryPanel"

key-files:
  created:
    - frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx
    - frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx
    - frontend/src/app/admin/users/tabs/GuidedGrantFlow.tsx
    - frontend/src/app/admin/users/tabs/GuidedGrantFlow.test.tsx
    - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx
    - frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx
  modified:
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx
    - frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx

key-decisions:
  - "GuidedRevokeFlow and GuidedGrantFlow each detect their own 'Abweichung entfernen' reversion mode from state.user_deny/state.user_allow respectively -- UserGroupRightsTab's three action buttons are gated purely on EffectiveRightState booleans (allowed && !non_deniable / !allowed / user_allow||user_deny), and the 'Abweichung entfernen' button opens GuidedRevokeFlow when user_deny is set, GuidedGrantFlow when user_allow is set. Both flags cannot be true simultaneously (only one override per action can exist), so the two full flows and the two reversion flows never collide."
  - "appUserDisplayName (used only in the GuidedRevokeFlow non-deniable explanation copy) falls back to 'Nutzer #{userId}' inside UserGroupRightsTab rather than adding a new display-name fetch or prop -- UserDetailPageClient.tsx was intentionally left unmodified since it is not in this plan's files_modified list and the fallback text is honest, not misleading."
  - "CapabilityHistoryPanel's fetch call is aliased on import (listOverrideHistory as fetchOverrideHistory) so the file's own call site does not duplicate the imported symbol name -- purely mechanical, needed to satisfy the plan's own single-occurrence acceptance grep."

requirements-completed: [CAP-08, CAP-10, UADM-01]

duration: 25min
completed: 2026-08-23
---

# Phase 138 Plan 08: Guided Grant/Revoke Flows + Inline History Summary

**GuidedRevokeFlow/GuidedGrantFlow guided Modal flows and CapabilityHistoryPanel wired into UserGroupRightsTab, completing CAP-08's headline honest deny/grant/revert UX**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-23T17:35:00Z (approx, first file read)
- **Completed:** 2026-08-23T17:57:55Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- `GuidedRevokeFlow.tsx`: a 3-step Modal ("Recht entziehen") that lists every granting source
  before recommending a personal deny override (D-16), flags Contribution-Role-only sources that
  a personal override cannot remove, and never renders a confirm action at all for a
  non-deniable capability (D-17) -- the explanation replaces the action entirely.
- `GuidedGrantFlow.tsx`: the symmetric "Recht zusätzlich erlauben" flow with no source-explanation
  step and no non-deniable case (an allow override always fully grants per precedence).
- Both flows share the same simplified "Abweichung entfernen" single-step reversion path when a
  personal override (deny or allow, respectively) already exists, and both render the real
  post-mutation `activation_status` in place via the shared `ActivationStatusIndicator` (CAP-10/D-21)
  without closing the modal.
- `CapabilityHistoryPanel.tsx`: a compact, per-capability, per-group inline override history
  (Vorher/Nachher/Grund/Zeitpunkt/Akteur), client-filtered from `listOverrideHistory`'s shared
  group-wide page (D-13b) -- explicitly supplements, not replaces, the later central "Änderungen"
  workspace.
- `UserGroupRightsTab.tsx`'s row-expansion area now renders all three locked business-verb
  actions plus the history panel, and calls the tab's own `loadData()` refresh after any flow's
  `onMutated` fires so the row reflects the new effective-rights state immediately (D-18/D-21),
  while the flow's own modal independently stays open showing its own activation status.

## Task Commits

Each task was committed atomically:

1. **Task 1: GuidedRevokeFlow (CAP-08, D-16, D-17)** - `8def6431` (feat)
2. **Task 2: GuidedGrantFlow + CapabilityHistoryPanel (D-16 symmetric, D-13b)** - `695b7b48` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified

- `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.tsx` - Guided "Recht entziehen" / "Abweichung entfernen" (revoke-side) modal flow
- `frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx` - 6 behavior cases (non-deniable, sources listing, reason validation, mutation success/error, existing-deny reversion)
- `frontend/src/app/admin/users/tabs/GuidedGrantFlow.tsx` - Guided "Recht zusätzlich erlauben" / "Abweichung entfernen" (grant-side) modal flow
- `frontend/src/app/admin/users/tabs/GuidedGrantFlow.test.tsx` - 3 behavior cases (single-step confirm, mutation success, existing-allow reversion)
- `frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.tsx` - Compact inline per-capability override history panel
- `frontend/src/app/admin/users/tabs/CapabilityHistoryPanel.test.tsx` - 3 behavior cases (empty state, rendering, action_code filtering)
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.tsx` - Row-expansion area now renders the three business-verb action buttons and mounts CapabilityHistoryPanel; new activeFlow modal state and loadData-refresh-on-mutation wiring
- `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx` - Extended `@/lib/api` mock with `listOverrideHistory`/`mutateCapabilityOverride` and a default empty-history `beforeEach` so existing row-expansion tests keep passing now that `CapabilityHistoryPanel` mounts on every expanded row

## Decisions Made

See `key-decisions` in frontmatter above:
- Reversion-mode detection lives inside each guided flow component (via `state.user_deny`/
  `state.user_allow`), not as a fourth component or extra prop -- keeps the "Abweichung entfernen"
  button in `UserGroupRightsTab.tsx` a simple boolean-gated dispatch to whichever flow already
  owns that state's real override type.
- `appUserDisplayName` falls back to a generic `Nutzer #{id}` string inside the tab component
  rather than threading a new display-name prop through `UserDetailPageClient.tsx` (out of this
  plan's `files_modified` scope).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended UserGroupRightsTab.test.tsx's `@/lib/api` mock**
- **Found during:** Task 2 (wiring `CapabilityHistoryPanel` into every expanded row)
- **Issue:** The pre-existing 138-06 test file's `vi.mock('@/lib/api', ...)` only stubbed
  `getAdminUserGroupMemberships`/`getEffectiveRights`/`listRoleCapabilities`. Once
  `CapabilityHistoryPanel` mounts inside every expanded `CapabilityDetailRow`, its own
  `useEffect` calls `listOverrideHistory`, which the mock did not export -- one existing test
  (row-expansion) threw an uncaught "no export defined on the mock" error.
- **Fix:** Added `listOverrideHistory`/`mutateCapabilityOverride` to the mock and a
  `beforeEach` that resolves `listOverrideHistory` to `[]` by default.
- **Files modified:** `frontend/src/app/admin/users/tabs/UserGroupRightsTab.test.tsx`
- **Verification:** All 6 pre-existing `UserGroupRightsTab.test.tsx` cases pass with zero
  regressions.
- **Committed in:** `695b7b48` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking test-infra gap)
**Impact on plan:** Necessary and mechanical -- no behavioral scope creep, purely closing a test
mock gap created by this plan's own new component mounting inside an existing test's render tree.

## Issues Encountered

- The plan's own acceptance criterion for `CapabilityHistoryPanel.tsx` requires
  `grep -c "listOverrideHistory" ... equals 1`, but a natural implementation has two matching
  lines (the import and the call site). Resolved by aliasing the import
  (`listOverrideHistory as fetchOverrideHistory`) -- purely mechanical, no behavior change.
- `jest-dom`'s `toBeDisabled()` matcher is not configured in this repo's Vitest setup (no other
  test file uses it); switched to plain `(button as HTMLButtonElement).disabled` boolean
  assertions in `GuidedRevokeFlow.test.tsx`.
- Text assertions spanning a `<strong>`-wrapped interpolation inside a paragraph do not match
  via Testing Library's default `getByText` (it only concatenates a node's own leaf text, not
  nested elements' text) -- removed the `<strong>` wrapping from the two load-bearing confirm-step
  sentences so the full sentence is a single text-matchable node.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- CAP-08 is fully wired end to end: every capability row in the canonical
  Benutzer-in-Gruppe-Editor now offers the correct business-language action (Recht entziehen /
  Recht zusätzlich erlauben / Abweichung entfernen), a compact inline history, and honest
  post-mutation activation status. UADM-01's editing half is complete (138-06 delivered the
  inspection half).
- Plan 138-09 (role assignment `Rolle zuweisen`/`Rolle entfernen`, running next in this wave)
  edits the same `UserGroupRightsTab.tsx` file -- the row-expansion area, `activeFlow` modal
  state pattern, and `loadData()`-refresh-on-mutation convention established here are the shape
  138-09 should extend, not replace.
- `RevokeCapabilityModal.tsx` (`frontend/src/app/admin/role-capabilities/`) remains a
  zero-import orphan file, confirmed again this plan (not touched, out of scope per
  138-08-PLAN.md's own note).

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 8 created/modified files confirmed present on disk; both task commits (`8def6431`,
`695b7b48`) confirmed present in `git log`.
