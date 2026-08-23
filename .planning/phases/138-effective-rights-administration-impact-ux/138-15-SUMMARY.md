---
phase: 138-effective-rights-administration-impact-ux
plan: 15
subsystem: ui
tags: [nextjs, react, admin, navigation, tabs, ux]

# Dependency graph
requires:
  - phase: 138-effective-rights-administration-impact-ux
    provides: "/admin/roles (138-12), /admin/claims (138-10), /admin/changes (138-11), UserGroupRightsTab canonical per-group inspector (138-06/08/09), UserContributionsTab fix (138-03)"
provides:
  - "AdminMainNav: the one persistent D-01 admin navigation (Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen), mounted via a new shared admin/layout.tsx"
  - "AdminUsersClient reduced to D-04's exact 9-field locked column set (Beiträge/Release-Arbeitsflächen/Medienuploads/Leitungskontext/Konflikte headline columns removed, Konflikte filter toggle kept)"
  - "UserDetailPageClient rewritten from a 9-item Accordion to D-03's real 6-tab structure (Übersicht | Rollen & Rechte | Beiträge | Claims | Streaming | Änderungen), URL-synced via ?tab="
  - "Tabs (@/components/ui) gained optional controlled activeId/onActiveIdChange and keepMountedIds props, backward compatible with its 4 pre-existing consumers"
  - "UserOverviewTab replaced its D-05-violating bare stat-tile grid with a compact per-group summary (role + headline capability checks + deviation/claims line)"
affects: [138-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tabs primitive controlled mode (activeId/onActiveIdChange, optional keepMountedIds for lazy-load-once semantics) reusable by any future admin tab surface needing URL-synced navigation"
    - "?tab= URL sync convention (parse-with-fallback + router.replace(..., {scroll:false})) mirrored from EpisodeVersionEditorPage.tsx"

key-files:
  created:
    - frontend/src/components/admin/AdminMainNav.tsx
    - frontend/src/components/admin/AdminMainNav.module.css
    - frontend/src/components/admin/AdminMainNav.test.tsx
    - frontend/src/app/admin/layout.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.test.tsx
  modified:
    - frontend/src/app/admin/page.tsx
    - frontend/src/app/admin/users/AdminUsersClient.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx
    - frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx
    - frontend/src/app/admin/users/tabs/UserOverviewTab.tsx
    - frontend/src/components/ui/Tabs.tsx
    - frontend/src/app/admin/users/page.test.tsx

key-decisions:
  - "Tabs primitive extended with controlled activeId/onActiveIdChange + keepMountedIds instead of hand-building a bespoke tab bar, since Tabs already renders the correct tablist/tabpanel structure and CLAUDE.md's global-UI-primitive rule forbids a parallel bespoke implementation when an existing primitive covers the need"
  - "AdminMainNav uses Button (variant=ghost, href) rows, not the Tabs primitive, since Tabs has no Link-based navigation mode (only in-page panel switching) — confirmed empirically before choosing the fallback the plan explicitly authorized"
  - "admin/layout.tsx mounts AdminMainNav unconditionally (not gated by PlatformAdminGate) to avoid duplicating the gate's auth-check UI on every single existing /admin page; the nav exposes only static link labels, not data"
  - "UserGroupMembershipsTab.tsx is left in place, unimported/orphaned, rather than deleted — its content is now absorbed into UserGroupRightsTab's per-group sections on the Rollen & Rechte tab"

patterns-established:
  - "Tabs keepMountedIds prop mirrors Accordion's existing keepMountedIds convention for lazy-load-once semantics across the two container primitives"

requirements-completed: [UADM-01]

# Metrics
duration: 45min
completed: 2026-08-23
---

# Phase 138 Plan 15: Admin IA Glue — Main Nav, User-Detail Tabs, Column/Overview Fixes Summary

**Persistent D-01 admin nav (Button-row + shared layout), D-03 Accordion→Tabs rewrite with URL sync, D-04 user-list column fix, and D-05 compact per-group overview replacing bare stat tiles**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-23T19:02:00Z
- **Completed:** 2026-08-23T19:19:30Z
- **Tasks:** 2
- **Files modified:** 12 (5 created, 7 modified)

## Accomplishments
- Built `AdminMainNav`, the one persistent D-01 top-level navigation (Benutzer | Gruppen | Rollen | Capabilities | Claims | Änderungen), and mounted it via a new `admin/layout.tsx` so every `/admin/*` route gets it without touching each page individually
- Reduced `AdminUsersClient`'s table to D-04's exact locked column set, removing the three explicitly forbidden headline columns (Beiträge, Release-Arbeitsflächen, Medienuploads) plus Leitungskontext/Konflikte, while keeping the "Nur mit Konflikten" filter toggle
- Replaced `UserDetailPageClient`'s 9-item Accordion with D-03's real 6-tab structure, URL-synced via `?tab=` (same convention as `EpisodeVersionEditorPage.tsx`), with zero functional regression to the D-30-protected Streaming placeholder
- Extended the shared `Tabs` primitive with optional controlled mode + `keepMountedIds`, fully backward-compatible with its 4 pre-existing consumers
- Replaced `UserOverviewTab`'s D-05-violating bare stat-tile grid with a compact per-group summary (role, headline capability checks, deviation/claims line)

## Task Commits

1. **Task 1: AdminMainNav (D-01/D-02) + AdminUsersClient column fix (D-04)** - `8271e32d` (feat)
2. **Task 2: UserOverviewTab compactness (D-05) + UserDetailPageClient Tabs rewrite (D-03)** - `844756f7` (feat)

**Fix commit (in-scope regression from Task 1's column change):** `11b969a9` (fix) — updated `admin/users/page.test.tsx`, which had asserted the pre-138-15 (violating) column list

**Plan metadata:** (this commit, following)

## Files Created/Modified
- `frontend/src/components/admin/AdminMainNav.tsx` - The one persistent D-01 nav, Button-row with active-state indicator
- `frontend/src/components/admin/AdminMainNav.module.css` - Layout/active-state styling using `--accent-primary`
- `frontend/src/components/admin/AdminMainNav.test.tsx` - Link targets + active-state assertions
- `frontend/src/app/admin/layout.tsx` - Shared admin layout mounting `AdminMainNav` above every `/admin/*` page
- `frontend/src/app/admin/page.tsx` - Added Rollen/Claims/Änderungen cards alongside existing ones
- `frontend/src/app/admin/users/AdminUsersClient.tsx` - Table reduced to D-04's 9 locked fields, added explicit Aktionen column
- `frontend/src/app/admin/users/page.test.tsx` - Updated stale expected-columns list + scoped assertion to `columnheader` role
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` - Accordion → Tabs rewrite, D-03's 6-tab structure, `?tab=` URL sync
- `frontend/src/app/admin/users/[id]/UserDetailPageClient.test.tsx` - Rewritten for Tabs-based structure, lazy-load/keepMounted/URL-sync coverage
- `frontend/src/app/admin/users/tabs/UserOverviewTab.tsx` - Bare stat grid replaced with compact per-group summary section
- `frontend/src/app/admin/users/tabs/UserOverviewTab.test.tsx` - New test coverage for the compact summary
- `frontend/src/components/ui/Tabs.tsx` - Added controlled `activeId`/`onActiveIdChange` + `keepMountedIds` (backward compatible)

## Decisions Made
- `Tabs` extended rather than replaced with a bespoke tab bar (CLAUDE.md global-UI-primitive rule; Tabs already had the correct tablist/tabpanel a11y structure, just lacked controlled mode)
- `AdminMainNav` uses `Button` (variant=ghost, `href`) rows instead of `Tabs`, since `Tabs` has no Link-based navigation mode — this was explicitly anticipated and authorized as a fallback in the plan's interfaces block, confirmed by reading `Tabs.tsx` directly before deciding
- `admin/layout.tsx` mounts `AdminMainNav` unconditionally (not itself wrapped in a second `PlatformAdminGate`), to avoid every single existing `/admin/*` page showing the auth-gate message twice; the nav only exposes static link labels, no data
- `UserGroupMembershipsTab.tsx` is left in the tree, unimported, rather than deleted — plan explicitly permitted (not required) deletion once it has zero consumers; leaving it in place is the lower-risk choice

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `admin/users/page.test.tsx` asserted the pre-138-15 (D-04-violating) column list**
- **Found during:** Task 1 verification sweep (ran the full `src/app/admin/users` test directory, not just the plan's named filter, to catch collateral breakage)
- **Issue:** This pre-existing test explicitly asserted the OLD column set (Beiträge, Release-Arbeitsflächen, Medienuploads, Leitungskontext, Konflikte) that Task 1's D-04 fix intentionally removes — it was not in the plan's `files_modified` list but broke as a direct, in-scope consequence of the AdminUsersClient.tsx change.
- **Fix:** Updated `expectedColumns` to D-04's locked 8-field set; scoped the assertion to `getAllByRole('columnheader')` instead of whole-page `getByText`, since "Globale Rolle" now legitimately appears twice (role filter label + table header, both D-04-conformant wording) and `getByText` throws on multiple matches.
- **Files modified:** `frontend/src/app/admin/users/page.test.tsx`
- **Verification:** `npm test -- --run src/app/admin/users/page.test.tsx` — 3/3 pass
- **Committed in:** `11b969a9`

**2. [Rule 2 - Missing functionality] `Tabs` had no controlled mode or keep-mounted support, needed for D-03's URL sync + no-refetch-on-reopen requirement**
- **Found during:** Task 2, while implementing `UserDetailPageClient`'s Tabs rewrite
- **Issue:** `Tabs` (@/components/ui) only supported fully uncontrolled internal state and always unmounted the inactive panel's content — switching away from and back to an already-visited tab (e.g. Claims) re-triggered its data fetch, which is exactly the "real perf regression for 6 tabs' worth of distinct API calls" the plan explicitly warned against, and regressed the old Accordion's `keepMountedIds` guarantee.
- **Fix:** Added optional `activeId`/`onActiveIdChange` (controlled mode) and `keepMountedIds` (render-but-hide via the native `hidden` attribute) props to `Tabs`, both opt-in and fully backward compatible with the 4 pre-existing uncontrolled consumers (`SearchResults.tsx`, `me/releases/[versionId]/workspace/page.tsx`, `dev/ui-system/page.tsx`, `DrawerShowcase.tsx` — all re-verified green, zero regression).
- **Files modified:** `frontend/src/components/ui/Tabs.tsx`
- **Verification:** New `UserDetailPageClient.test.tsx` case proves a tab loads exactly once even after switching away and back; existing `SearchResults.test.tsx`/showcase tests re-run green.
- **Committed in:** `844756f7`

---

**Total deviations:** 2 auto-fixed (1 Rule 1 bug fix, 1 Rule 2 missing-functionality addition)
**Impact on plan:** Both were necessary for correctness (D-04 test consistency) and to genuinely satisfy D-03's own stated perf/lazy-load requirement rather than silently regressing it. No scope creep — no unrelated files touched.

## Issues Encountered
While building `UserDetailPageClient.test.tsx`, an intermediate implementation (rendering only the active tab's content, no `keepMountedIds`) caused a real, reproducible double-fetch bug on tab reopen — confirmed via direct render-count instrumentation before settling on the `keepMountedIds` fix documented above. This was caught by tests before commit, not shipped.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
This was the final IA "glue" plan (138-15) of Phase 138; all D-01 through D-05 (and D-25/D-30) requirements for the admin navigation/user-detail restructure are now live and test-covered. 138-16 (if it exists as the phase's closing verification plan) can proceed against a stable admin IA. No blockers identified.

---
*Phase: 138-effective-rights-administration-impact-ux*
*Completed: 2026-08-23*

## Self-Check: PASSED

All 12 created/modified files confirmed present on disk; all 3 task/fix commit hashes
(`8271e32d`, `844756f7`, `11b969a9`) confirmed present in `git log`.
