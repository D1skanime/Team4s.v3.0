---
phase: 54-globale-nav-drawer-und-layout-verdrahtung
plan: 01
subsystem: ui
tags: [react, nextjs, css-modules, app-shell, drawer, accessibility]

requires:
  - phase: 53-rollenuebergreifendes-mein-profil-als-member-identity-hub
    provides: AppShell member navigation baseline and profile shell conventions
provides:
  - AppShell slide-over drawer with mobile burger and desktop edge-strip triggers
  - Anonymous and authenticated drawer navigation states
  - Avatar image support in the authenticated drawer footer
  - Focus-trap, Escape close, and backdrop close behavior
affects: [phase-54, app-shell, navigation, profile-shell]

tech-stack:
  added: []
  patterns:
    - React client component drawer state with document keydown cleanup
    - CSS-module transform drawer using global z-index tokens
    - next/image avatar rendering with test-local mock

key-files:
  created:
    - .planning/phases/54-globale-nav-drawer-und-layout-verdrahtung/54-01-SUMMARY.md
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.module.css
    - frontend/src/components/layout/AppShell.test.tsx

key-decisions:
  - "Desktop edge-strip uses label 'Menü öffnen' so existing tests and assistive queries for the mobile 'Navigation' button remain unambiguous."
  - "Drawer avatar rendering uses next/image with unoptimized, matching the existing profile hero avatar pattern."

patterns-established:
  - "AppShell owns drawerOpen and reuses mediaCropA11y.getFocusableElements for focus trapping."
  - "Anonymous drawer items avoid fake routes by disabling Fansub-Gruppen and Suche with the existing 'bald' badge."

requirements-completed:
  - D-01
  - D-02
  - D-03
  - D-04
  - D-05
  - D-06
  - D-07
  - D-08
  - D-09
  - D-14
  - D-15
  - D-16
  - D-18
  - D-19

duration: 7min
completed: 2026-05-28
---

# Phase 54 Plan 01: AppShell Drawer Behavior Summary

**AppShell now renders a glass slide-over navigation drawer with mobile, desktop edge-strip, anonymous, authenticated, avatar, and accessibility behavior covered by focused tests.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-05-28T19:59:39Z
- **Completed:** 2026-05-28T20:06:28Z
- **Tasks:** 3
- **Files modified:** 3 implementation/test files, 1 summary

## Accomplishments

- Replaced the static sidebar and inline mobile panel with a single `drawerOpen` slide-over drawer model.
- Added desktop edge-strip open behavior, mobile burger toggling, mobile backdrop close, Escape close, and focus-trap cycling.
- Added anonymous footer actions and authenticated avatar footer with initials fallback.
- Added and passed AppShell drawer contract tests, preserving the existing AppShell tests.

## Task Commits

1. **Task 1: Drawer behavior contract tests** - `82cba0eb` (test)
2. **Task 2: AppShell drawer behavior** - `e74b2366` (feat)
3. **Task 3: Drawer CSS and control styling** - `d7e3c56c` (feat)
4. **Verification cleanup: Next image avatar** - `9db22373` (fix)

## Files Created/Modified

- `frontend/src/components/layout/AppShell.tsx` - Adds drawer state, focus trap, edge strip, backdrop, dual-state nav/footer, and avatar rendering.
- `frontend/src/components/layout/AppShell.module.css` - Adds transform drawer, edge strip, backdrop, avatar image, anonymous footer buttons, and nav sizing/weight fixes.
- `frontend/src/components/layout/AppShell.test.tsx` - Adds drawer behavior, dual-state, avatar, fallback, and admin-gate tests.
- `.planning/phases/54-globale-nav-drawer-und-layout-verdrahtung/54-01-SUMMARY.md` - Execution summary.

## Decisions Made

- Used `Menü öffnen` for the desktop edge strip aria-label so Testing Library and assistive technology do not see two button controls named with "Navigation"; the mobile button keeps the visible text `Navigation`.
- Kept `/fansubs` and `/search` as disabled `bald` drawer entries because the route audit in `54-PATTERNS.md` found no list/search route.
- Used `next/image` with `unoptimized` for the drawer avatar to avoid adding a new lint warning and to match existing profile avatar rendering.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unsupported DOM ref type**
- **Found during:** Task 3 verification
- **Issue:** `HTMLAsideElement` is not available in this TypeScript DOM lib, causing `tsc --noEmit` to fail.
- **Fix:** Changed the drawer ref type to `HTMLElement`.
- **Files modified:** `frontend/src/components/layout/AppShell.tsx`
- **Verification:** `cd frontend && npx tsc --noEmit`
- **Committed in:** `d7e3c56c`

**2. [Rule 1 - Lint] Removed new AppShell avatar img lint warning**
- **Found during:** Plan-level lint
- **Issue:** The new drawer avatar `<img>` triggered `@next/next/no-img-element`.
- **Fix:** Switched to `next/image` with `unoptimized` and added a local test mock.
- **Files modified:** `frontend/src/components/layout/AppShell.tsx`, `frontend/src/components/layout/AppShell.test.tsx`
- **Verification:** `cd frontend && npx eslint src/components/layout/AppShell.tsx src/components/layout/AppShell.test.tsx`
- **Committed in:** `9db22373`

---

**Total deviations:** 2 auto-fixed Rule 1 issues.
**Impact on plan:** Both fixes were required to keep the changed AppShell files typecheck/lint clean. No domain or API scope changed.

## Known Stubs

None.

## Threat Flags

None. This plan changed client navigation and presentation only; it introduced no network endpoint, auth token surface, file access path, schema change, or media ownership boundary.

## Issues Encountered

- Full frontend Vitest is red outside this plan scope. Observed failures include missing `getAuthSessionSnapshot` in an `@/lib/api` mock in `AnimeProjectNotesSection.test.tsx`, the Phase 49 no-token boundary scan flagging `MemberAvatarCard.tsx`, admin anime pages rendering permission-loading text in several existing tests, and an existing Jellyfin cover URL expectation mismatch.
- Full frontend lint is red outside this plan scope. Existing errors include `ReleaseVersionMediaSection.test.tsx`, `dev/ui-system/page.tsx`, `PlatformAdminGate.tsx`, and several `tmp-live-full-flow*.js` files, plus pre-existing warnings across unrelated files.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, and `.planning/REQUIREMENTS.md` were already dirty before this executor began. To avoid committing unrelated concurrent changes, this summary is the only plan metadata file created by this executor.

## Verification

- `cd frontend && npx vitest run src/components/layout/AppShell.test.tsx` - PASS, 14 tests.
- `cd frontend && npx tsc --noEmit` - PASS.
- `cd frontend && npx eslint src/components/layout/AppShell.tsx src/components/layout/AppShell.test.tsx` - PASS.
- `Select-String` marker checks - PASS for `drawerOpen`, `translateX`, and `edgeStrip`.
- `git diff --check` - PASS for whitespace; only line-ending warnings on unrelated dirty files were printed.
- `cd frontend && npx vitest run` - FAIL outside scope as listed above.
- `cd frontend && npm run lint -- --max-warnings=0` - FAIL outside scope as listed above.

## User Setup Required

None.

## Next Phase Readiness

Plan 02 can wire the root/client shell integration onto the new AppShell props and drawer behavior. The AppShell component surface now supports the required anonymous/authenticated states and avatar URL input.

## Self-Check: PASSED

- Found expected files: `AppShell.tsx`, `AppShell.module.css`, `AppShell.test.tsx`, and this summary.
- Found expected commits: `82cba0eb`, `e74b2366`, `d7e3c56c`, `9db22373`.

---
*Phase: 54-globale-nav-drawer-und-layout-verdrahtung*
*Completed: 2026-05-28*
