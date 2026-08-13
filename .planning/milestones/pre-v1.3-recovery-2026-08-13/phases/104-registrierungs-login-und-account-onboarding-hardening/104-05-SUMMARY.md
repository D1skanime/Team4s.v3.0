---
phase: 104-registrierungs-login-und-account-onboarding-hardening
plan: 05
subsystem: auth
tags: [react, next-router, ui-primitives, accessibility]

requires:
  - phase: 104-04
    provides: AppShell hasProjectAssignments-gated nav wiring this plan builds on without modifying its eligibility logic
  - phase: 104-03
    provides: AppShell 5-state shell model (uninitialized/anonymous/profile-loading/profile-error/ready) and the additive 'loading' mode this plan preserves untouched
provides:
  - One canonical "Mein Account"/"Mein Profil" navigation destination — the duplicate "Account & Sicherheit" settings entry (same /me/profile href, separate "Einstellungen" nav group) is removed (D-17)
  - Shared drawer-close-on-navigation seam (onActivate/onNavigate) used by every real nav link (fixed items, group items, membership links) so the mobile drawer closes on first-tap activation instead of leaving a stale open drawer after client-side navigation
  - Drawer auto-closes on any currentPath change (covers browser back/forward and any navigation not triggered by a click inside the drawer itself), adjusted during render rather than in an effect
  - Single-shot, ref-guarded logout transition: a second logout activation within the same synchronous tick is blocked, the drawer closes immediately, an aria-busy "Melde ab..." state is shown, and navigation to /login is initiated right after local session cleanup completes (D-24)
affects: []

tech-stack:
  added: []
  patterns:
    - "Drawer-close-on-navigation uses a single closeDrawer callback (useCallback) threaded through AppShellNavGroups/AppShellAnonNavGroups down to AppShellNavItemView's onActivate and the inline membership Link's onClick — one shared seam, not per-link handlers"
    - "Route-change drawer close is derived during render (compare currentPath to a renderedPath state mirror, call setDrawerOpen(false) synchronously if it changed) instead of in a useEffect, following React's documented 'adjusting state when a prop changes' pattern — avoids the project's react-hooks/set-state-in-effect lint rule and a cascading extra render"
    - "Logout single-shot guard uses a synchronous ref (loggingOutRef) in addition to the existing isLoggingOut state, so a second click landing before React flushes the state update in the same tick is still blocked"
    - "Logout navigates to /login immediately after invoking (not awaiting) logoutAuthSession(), relying on the fact that logoutAuthSession's local session cleanup (clearAuthSession()) runs synchronously before its first await — no separate delayed-navigation step needed"

key-files:
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.test.tsx
    - .planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md

key-decisions:
  - "Removed the entire 'Einstellungen' nav group rather than keeping an empty/renamed group — its only entry was the duplicate Account & Sicherheit link to /me/profile; no other settings destination exists yet."
  - "Route-change drawer-close is implemented as a render-time state adjustment (comparing currentPath against a tracked renderedPath) instead of a useEffect, because the project's ESLint config enforces react-hooks/set-state-in-effect as an error, not a warning."
  - "The existing isLoggingOut state check was upgraded to a loggingOutRef synchronous guard rather than replaced, so the button's disabled/aria-busy render state (isLoggingOut) and the call-blocking guard (loggingOutRef) are decoupled — the ref can never lag behind a batched state update."
  - "Kept navigating to /login synchronously right after calling logoutAuthSession() (not after awaiting it) because logoutAuthSession()'s local cleanup (clearAuthSession()) executes synchronously before its first await; waiting for the full promise (including the best-effort remote Keycloak/revoke call) would delay navigation for no correctness benefit."

requirements-completed: [P104-NAV-1]

duration: ~35min
completed: 2026-07-17
---

# Phase 104 Plan 05: Consolidate Account navigation and deterministic drawer/logout interaction Summary

**Removed the duplicate "Account & Sicherheit" nav entry, added a shared drawer-close-on-navigation seam covering every real link plus any route change, and hardened logout into a synchronously single-shot, observable transition — all inside the existing AppShell without touching Plan 104-03/104-04's shell-mode or nav-eligibility logic.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2 completed
- **Files modified:** 3 (2 code/test files touched by both tasks in sequence, 1 deferred-items note)

## Accomplishments

- `AppShell.tsx`'s `AppShellNavGroups` no longer renders a separate "Einstellungen" group with a duplicate "Account & Sicherheit" link to `/me/profile` — "Mein Account"/"Mein Profil" (the existing `fixedMyItems` entry) is now the one canonical Account destination (D-17). The now-unused `Settings` icon import was removed.
- A single `closeDrawer` callback (`useCallback`) is threaded as `onNavigate`/`onActivate` through `AppShellNavGroups`, `AppShellAnonNavGroups`, `AppShellNavItemView`, and the inline "Meine Gruppen" membership `Link` — every real drawer link closes the drawer on its first activation via one shared seam, not per-link handlers.
- The drawer also closes on any `currentPath` change (covers browser back/forward or any navigation not initiated by a click inside the drawer), implemented as a render-time state adjustment (`renderedPath` mirror + conditional `setDrawerOpen(false)` during render) rather than a `useEffect`, because the project's ESLint config enforces `react-hooks/set-state-in-effect` as a hard error.
- `handleLogout` is now guarded by a synchronous `loggingOutRef` (in addition to the existing `isLoggingOut` state used for the button's disabled/`aria-busy` render), so a second click landing in the same synchronous tick — before React flushes the state update — is still blocked from invoking `useLogoutAuthSession()` twice.
- The logout button now also carries `aria-busy={isLoggingOut}` alongside its existing `disabled` state and German "Melde ab..." copy, while navigation to `/login` continues to fire right after invoking (not awaiting) `logoutAuthSession()` — consistent with that function's synchronous local-cleanup-before-first-await behavior.
- Escape, backdrop-click, focus-trap, focus-restoration, and desktop navigation behavior are all unchanged and covered by the pre-existing 22+ tests, which remain green.

## Task Commits

1. **Task 1: Consolidate Account navigation and centralize drawer close-on-navigation** - `6acb17b4` (feat)
2. **Task 2: Make logout a single, observable transition** - `ba508307` (feat)

**Plan metadata:** _pending_ (docs: complete plan)

## Files Created/Modified

- `frontend/src/components/layout/AppShell.tsx` - removed duplicate Account settings entry + unused `Settings` import; added `onActivate`/`onNavigate` drawer-close seam threaded through all nav render paths; added render-time `currentPath`-change drawer close; added `loggingOutRef` synchronous logout guard + `aria-busy` on the logout button. Net result: 409 → 444 lines (kept under the CLAUDE.md 450-line limit by trimming comment verbosity rather than deferring a file split).
- `frontend/src/components/layout/AppShell.test.tsx` - 7 new tests: one canonical Account link / no duplicate Account & Sicherheit (D-17); first-tap drawer close for a membership link and the fixed Account link; drawer closes on `currentPath` change via `rerender`; drawer stays open across an unrelated re-render; rapid double logout activation (single invocation, drawer closes immediately); pending logout transition copy/disabled/`aria-busy` state; safe cleanup and continued navigation when `logoutAuthSession()` rejects.
- `.planning/phases/104-registrierungs-login-und-account-onboarding-hardening/deferred-items.md` - re-confirms (does not newly discover) the same pre-existing `api.no-token-boundary.test.ts` and `anime/[id]/group/[groupId]`/`fansubprojekt`-area baseline failures already logged under Plans 104-01/104-02, and records that `AppShell.tsx` stayed under the 450-line CLAUDE.md limit without needing a deferred split.

## Decisions Made

See `key-decisions` in frontmatter. Most consequential: implementing the route-change drawer close as a render-time state adjustment instead of a `useEffect`, required by this repo's `react-hooks/set-state-in-effect` ESLint error rule rather than a stylistic preference.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `useEffect`-based drawer close on route change failed ESLint (`react-hooks/set-state-in-effect`)**
- **Found during:** Task 1, post-implementation lint pass
- **Issue:** The initial implementation closed the drawer on `currentPath` change inside a `useEffect(() => { setDrawerOpen(false) }, [currentPath])`. This repo's ESLint config enforces `react-hooks/set-state-in-effect` as an **error** (not a warning), which flagged the synchronous `setState` call inside the effect body as a cascading-render risk, failing `npx eslint`.
- **Fix:** Replaced the effect with React's documented "adjusting state when a prop changes" pattern: track a `renderedPath` state mirror of `currentPath`, and when they diverge during render, synchronously call `setRenderedPath`/`setDrawerOpen(false)` in the render body itself (not in an effect) so the closed-drawer state lands in the same render pass as the new `currentPath` instead of triggering a follow-up cascading render.
- **Files modified:** `frontend/src/components/layout/AppShell.tsx`
- **Verification:** `npx eslint src/components/layout/AppShell.tsx src/components/layout/AppShell.test.tsx` clean; `npx vitest run src/components/layout/AppShell.test.tsx` (33/33 pass, including the new route-change-closes-drawer and stays-open-across-unrelated-rerender tests).
- **Committed in:** `6acb17b4` (Task 1 commit)

**2. [Rule 1 - Bug] `AppShell.tsx` crossed the CLAUDE.md 450-line limit after both tasks' additions**
- **Found during:** Task 2, post-implementation line-count check
- **Issue:** After implementing both tasks' full doc-comment-heavy version, `AppShell.tsx` reached 456 lines — 6 over the project's hard 450-line production-file limit (CLAUDE.md "Modularity" constraint), which takes precedence over the plan's own instructions per this session's enforcement rules.
- **Fix:** Trimmed verbose multi-line JSDoc/inline comments (on the `onActivate` prop, the route-change drawer-close block, and the `handleLogout` guard) down to single- or two-line explanations that preserve the D-17/D-24 rationale without the line bloat. No behavioral or test changes were needed. Final size: 444 lines.
- **Files modified:** `frontend/src/components/layout/AppShell.tsx`
- **Verification:** `wc -l frontend/src/components/layout/AppShell.tsx` → 444; re-ran `npx tsc --noEmit`, `npx eslint`, and `npx vitest run src/components/layout/AppShell.test.tsx src/components/layout/AppShellClientWrapper.test.tsx` (44/44 pass) after the trim to confirm no regression.
- **Committed in:** `ba508307` (Task 2 commit, since the trim touched comments introduced by both tasks and was verified against the final combined state)

---

**Total deviations:** 2 auto-fixed (1 Rule 3 - blocking ESLint failure, 1 Rule 1 - CLAUDE.md line-limit bug)
**Impact on plan:** Both were necessary to ship a lint-clean, CLAUDE.md-compliant version of the plan's own required behavior; neither changed the delivered behavior or removed any test coverage.

## Issues Encountered

- A benign jsdom `Error: Not implemented: navigation (except hash changes)` appears in `stderr` during the pre-existing "logs out signed-in members from the drawer footer" test run. This stems from the test file's `next/link` mock rendering a real `<a href>` element (unchanged by this plan) that jsdom attempts to navigate to on click; the test itself passes and this is not a new failure introduced by this plan.
- `frontend/src/lib/api.no-token-boundary.test.ts` shows the same 2 pre-existing failures already logged in `deferred-items.md` from Plan 104-02 (`GroupHistorySection.tsx`'s `authToken` prop, `ProfileBackgroundCard.tsx`'s direct `fetch`) — neither file is touched by this plan; re-verified unchanged.
- A full `cd frontend && npx vitest run` still shows the same pre-existing baseline failures documented across 104-01 through 104-04 (concurrent session's project-page/hero/AvatarStack work in the `anime/[id]/group/[groupId]` / `fansubprojekt` area, commit `0986ba6b`) — unrelated to this plan's `AppShell.tsx`/`AppShell.test.tsx` changes, not fixed per the executor scope boundary and this plan's explicit shared-main pre-existing-baseline note.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-17 and D-24 now hold for the AppShell mobile drawer: one canonical Account nav entry, deterministic first-tap navigation/close, deterministic route-change close, and a single-shot observable logout transition — without regressing any of Plan 104-03's shell-mode state machine or Plan 104-04's `hasMemberProfile`/`hasProjectAssignments` nav gating.
- Plan 104-06 (or any further Phase 104 work) can treat the AppShell drawer's navigation and logout interaction as stable and fully tested; no further AppShell.tsx changes are anticipated from this plan's scope.
- `AppShell.tsx` is now at 444/450 lines — close enough to the CLAUDE.md limit that any further AppShell feature growth should budget for a possible extraction (e.g. moving `AppShellNavGroups`/`AppShellAnonNavGroups` into a sibling file) rather than assuming headroom remains.

---
*Phase: 104-registrierungs-login-und-account-onboarding-hardening*
*Completed: 2026-07-17*

## Self-Check: PASSED

All modified files (`AppShell.tsx`, `AppShell.test.tsx`, `deferred-items.md`) and
this `104-05-SUMMARY.md` verified present on disk; both task commit hashes
(`6acb17b4`, `ba508307`) verified present in `git log --oneline --all`.
