---
phase: 54-globale-nav-drawer-und-layout-verdrahtung
plan: 02
subsystem: ui
tags: [nextjs, react, auth-session, app-shell, profile-avatar]

requires:
  - phase: 49
    provides: token-free frontend auth/API client boundary
  - phase: 53
    provides: member profile data and own-profile API seam
provides:
  - AppShellClientWrapper client boundary for future root-layout integration
  - token-free auth session mode mapping for AppShell
  - own-profile avatar URL and admin capability mapping for AppShell props
affects: [phase-54, app-shell, root-layout, profile]

tech-stack:
  added: []
  patterns:
    - client wrapper around AppShell for Server Component layout use
    - useAuthSession hasAccessToken/hasRefreshToken mode derivation
    - getOwnProfile avatar public_url resolved through resolveApiUrl

key-files:
  created:
    - frontend/src/components/layout/AppShellClientWrapper.tsx
  modified: []

key-decisions:
  - "AppShellClientWrapper uses the central token-free auth session seam and does not pass auth tokens to AppShell."
  - "Avatar URLs are resolved from profile.avatar.public_url via resolveApiUrl, matching the existing profile page pattern."
  - "Rendered shell props are derived from the active auth session so stale profile/admin data is not exposed after logout."

patterns-established:
  - "Root-layout-ready client wrapper: read auth state in a client component, then pass mode/currentPath/user/canAccessAdmin to AppShell."
  - "Profile fetches are gated by isClientInitialized and hasAuthSession before getOwnProfile is called."

requirements-completed: [D-13, D-16, D-17, D-15]

duration: 26min
completed: 2026-05-28
---

# Phase 54 Plan 02: AppShell Client Wrapper Summary

**Token-free AppShell client wrapper that maps auth session state, current route, profile avatar URL, and admin nav capability into AppShell props.**

## Performance

- **Duration:** 26 min
- **Started:** 2026-05-28T19:40:00Z
- **Completed:** 2026-05-28T20:06:14Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `AppShellClientWrapper` with `'use client'` as the first line.
- Gated `getOwnProfile()` behind `isClientInitialized && hasAuthSession`.
- Mapped `hasAccessToken || hasRefreshToken` to AppShell `mode`.
- Resolved `profile.avatar?.public_url` through `resolveApiUrl`.
- Derived `canAccessAdmin` from `account_global_roles` containing `platform_admin` or `admin`.
- Passed `currentPath` from `usePathname()` to AppShell without introducing token props.

## Task Commits

1. **Task 1: AppShellClientWrapper.tsx anlegen** - `0058a921` (feat)

## Files Created/Modified

- `frontend/src/components/layout/AppShellClientWrapper.tsx` - Client boundary wrapper for AppShell auth mode, profile avatar, current path, and admin capability props.

## Decisions Made

- Used `useAuthSession()` as the only auth-state input in UI code, preserving the central auth/API boundary.
- Kept avatar resolution aligned with the profile page by using `resolveApiUrl(d.avatar?.public_url || '')`.
- Derived render props from `activeProfile = hasAuthSession ? profile : null` so a stale fetched profile cannot keep admin nav visible after logout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Prevented stale profile/admin props after session changes**
- **Found during:** Task 1
- **Issue:** A pending profile request could resolve after auth state changed and repopulate profile/admin props.
- **Fix:** Added a cancellation guard and derived rendered shell props from the current `hasAuthSession` state.
- **Files modified:** `frontend/src/components/layout/AppShellClientWrapper.tsx`
- **Verification:** `npx tsc --noEmit`, targeted ESLint, and `AppShell.test.tsx` pass.
- **Committed in:** `0058a921`

**2. [Rule 1 - Lint/React Hooks] Avoided synchronous setState in effect guard**
- **Found during:** Task 1 targeted lint
- **Issue:** The planned synchronous `setProfile(null)` inside the effect guard violated `react-hooks/set-state-in-effect`.
- **Fix:** Kept the guard before `getOwnProfile()`, but queued the profile clear asynchronously and used `activeProfile` for immediate render safety.
- **Files modified:** `frontend/src/components/layout/AppShellClientWrapper.tsx`
- **Verification:** `npx eslint src/components/layout/AppShellClientWrapper.tsx` passes.
- **Committed in:** `0058a921`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 lint/correctness)
**Impact on plan:** Both changes preserve the planned behavior while satisfying project auth and lint boundaries.

## TDD Gate Compliance

Plan task 1 was marked `tdd="true"`, but the executor write scope for this plan only allowed `AppShellClientWrapper.tsx` plus summary/state docs. No new red test file was created. Verification used the plan's static checks plus the existing `AppShell.test.tsx` suite.

## Known Stubs

None.

## Threat Flags

None - the wrapper introduces no new endpoint, file access path, schema change, or auth-token propagation surface beyond the plan threat model.

## Issues Encountered

- TypeScript initially surfaced an AppShell drawer ref type issue from Plan 54-01. That was resolved by the already-landed Phase 54-01 follow-up before the 54-02 task commit; the 54-02 commit only contains the wrapper.
- Targeted lint against the wrapper found the React hooks set-state-in-effect issue documented above.

## User Setup Required

None - no external service configuration required.

## Verification

- `cd frontend && npx tsc --noEmit` - passed
- `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` - passed, 14 tests
- `cd frontend && npx eslint src/components/layout/AppShellClientWrapper.tsx` - passed
- `git diff --check -- frontend/src/components/layout/AppShellClientWrapper.tsx frontend/src/components/layout/AppShell.tsx` - passed
- Static assertions: first line is `'use client'`; `avatar?.public_url`, `isClientInitialized`, `account_global_roles`, and `usePathname` are present; `authToken` is absent from the wrapper.

## Next Phase Readiness

Plan 54-03 can import `AppShellClientWrapper` into `frontend/src/app/layout.tsx` without converting the root layout to a client component.

## Self-Check: PASSED

- `frontend/src/components/layout/AppShellClientWrapper.tsx` exists.
- `.planning/phases/54-globale-nav-drawer-und-layout-verdrahtung/54-02-SUMMARY.md` exists.
- Task commit `0058a921` exists in git history.

---
*Phase: 54-globale-nav-drawer-und-layout-verdrahtung*
*Completed: 2026-05-28*
