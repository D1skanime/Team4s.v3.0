---
phase: 138-effective-rights-administration-impact-ux
plan: 17
subsystem: admin-frontend
tags: [gap-closure, admin-users, guided-revoke-flow, regression-test]
dependency-graph:
  requires: []
  provides:
    - "exported, clock-skew-safe formatRelativeDate in AdminUsersClient.tsx"
    - "automated WR-01 regression coverage for GuidedRevokeFlow's non_deniable+user_deny branch"
  affects:
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx
tech-stack:
  added: []
  patterns:
    - "Math.max(0, diff) clamp before Math.floor for relative-time display, guarding against client/server clock skew"
key-files:
  created: []
  modified:
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/AdminUsersClient.test.tsx
    - frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx
decisions:
  - "GAP-03's WR-01 branch order (isNonDeniable && !isRemoveMode) was already correct in production code (137-08-era fix) -- Task 2 is tests-only, no GuidedRevokeFlow.tsx change was needed"
  - "ClaimManagementPanel.tsx's 'Der Link läuft in 7 Tagen ab.' is confirmed static link-expiry copy, unrelated to formatRelativeDate -- no parallel clamp fix needed there"
metrics:
  duration: "~25 minutes"
  completed: "2026-08-24"
---

# Phase 138 Plan 17: GAP-01 negative relative-time clamp + GAP-03 WR-01 regression test Summary

One-liner: Clamped `formatRelativeDate`'s millisecond diff to `>= 0` so future/now timestamps always render "Heute" instead of "vor -N Tagen", and added a 7th automated test to `GuidedRevokeFlow.test.tsx` pinning the already-correct non_deniable+user_deny branch order that previously only had human-verified coverage.

## What Was Built

**Task 1 (GAP-01):** `formatRelativeDate` in `AdminUsersClient.tsx` now computes `Math.max(0, Date.now() - new Date(isoDate).getTime())` before deriving `days`, guaranteeing any timestamp at or after "now" (including future timestamps from client/server clock skew) falls into the `days === 0` → `'Heute'` branch. The function was also exported so it can be unit-tested directly rather than only through a full component render. Three new tests in `AdminUsersClient.test.tsx` cover: a +60s future timestamp, an exact-now timestamp, and a negative-output regex guard across both cases.

**Task 2 (GAP-03):** Investigated `GuidedRevokeFlow.tsx`'s `isNonDeniable && !isRemoveMode` guard (lines 85-88, 157-169) and confirmed it already handles `non_deniable: true` + `user_deny: true` correctly — since `isRemoveMode` is `true` in that combination, the dead-end explanation branch is skipped and the flow proceeds to the "Abweichung entfernen" confirm/status path. Added a new 7th test to the existing `describe('GuidedRevokeFlow', ...)` block asserting: no dead-end text renders, the "Abweichung entfernen" button is present and enabled, clicking it calls `mutateCapabilityOverride` with `effect: null` (removal semantics), and the real `activation_status` ("Gespeichert und sofort aktiv.") resolves afterward. No production code was changed — the plan's minimal-fix escape hatch was not needed since the new assertions passed on the first run against existing code.

## Verification

- `AdminUsersClient.test.tsx`: 5/5 tests pass (2 pre-existing D-06 URL round-trip + 3 new GAP-01 tests).
- `GuidedRevokeFlow.test.tsx`: 7/7 tests pass (6 pre-existing including the non_deniable-without-user_deny counter-test, unmodified + 1 new WR-01 test).
- `grep -n "export function formatRelativeDate"` confirms the export.
- `grep -c "isNonDeniable && !isRemoveMode"` still returns `1` — branch condition unchanged.
- Full `src/app/admin` sweep: 758/782 tests pass across 92/96 files. The 4 failing files (`UserContributionsTab.test.tsx`, `fansubs/[id]/edit/page.test.tsx`, `FansubAppMembersSection.test.tsx`, `useGroupMembersTab.test.ts`) all match the plan's documented pre-existing/unrelated failure list and were not touched by this plan. No regressions introduced.

## Deviations from Plan

None - plan executed exactly as written. Task 2's `<action>` block explicitly anticipated the "no fix needed" outcome ("If (and only if) the new assertions fail... apply the minimal corrective change") and that branch was not triggered.

## Known Stubs

None.

## Threat Flags

None - both tasks are display-formatting and test-only changes; no new endpoints, auth paths, or trust-boundary surface introduced, matching the plan's own `<threat_model>` disposition (`accept` for both threat IDs).

## Self-Check: PASSED

- FOUND: frontend/src/app/admin/users/AdminUsersClient.tsx (export function formatRelativeDate present at line 29)
- FOUND: frontend/src/app/admin/users/AdminUsersClient.test.tsx (new describe block present, 5/5 tests pass)
- FOUND: frontend/src/app/admin/users/tabs/GuidedRevokeFlow.test.tsx (7th test present, 7/7 tests pass)
- FOUND commit 30800135: fix(138-17): clamp negative relative-time display in admin user list (GAP-01)
- FOUND commit bbf29163: test(138-17): pin WR-01 non_deniable+user_deny regression in GuidedRevokeFlow (GAP-03)
