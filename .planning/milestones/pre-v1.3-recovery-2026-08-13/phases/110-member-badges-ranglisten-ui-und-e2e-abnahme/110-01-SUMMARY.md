---
phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme
plan: 01
subsystem: ui
tags: [nextjs, react, ssr, app-router, lucide-react, vitest, testing-library]

# Dependency graph
requires:
  - phase: 109
    provides: "getMemberPointRanking()/MemberPointRankingRow SSR-consumable, paginated (page size 50), server-clamped ranking projection"
provides:
  - "Public SSR route /members/ranking rendering the global member point ranking"
  - "RankingPaginationNav client wrapper turning @/components/ui Pagination's onPageChange into SSR-first router.push navigation"
  - "Rangliste nav entry (Trophy icon) in both AppShell session states, next to Anime entdecken"
affects: [110-02, 110-03, 110-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client Pagination wrapper for an SSR page (RankingPaginationNav) — first consumer of @/components/ui Pagination from inside an SSR page context"

key-files:
  created:
    - frontend/src/app/members/ranking/page.tsx
    - frontend/src/app/members/ranking/page.module.css
    - frontend/src/app/members/ranking/RankingPaginationNav.tsx
    - frontend/src/app/members/ranking/page.test.tsx
  modified:
    - frontend/src/components/layout/AppShell.tsx
    - frontend/src/components/layout/AppShell.test.tsx

key-decisions:
  - "Used the existing toNumber(input, fallback) helper from @/lib/utils (same one anime/page.tsx uses) instead of a bespoke Math.max/Number parse, for a UI-only page default — the authoritative clamp stays server-side in MemberPointRankingHandler per the threat model"

patterns-established:
  - "Client Pagination wrapper for SSR pages: 'use client' component wraps @/components/ui Pagination's onPageChange callback into router.push(?page=N), keeping the parent Server Component SSR-first"

requirements-completed: [D-01]

# Metrics
duration: 15min
completed: 2026-07-27
---

# Phase 110 Plan 01: Ranglisten-UI und AppShell-Nav-Eintrag Summary

**New public `/members/ranking` SSR page (Table/EmptyState/ErrorState/Pagination from `@/components/ui`) consuming the existing Phase 109 `getMemberPointRanking()` projection, plus a `Rangliste` nav entry in both AppShell session states.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-27T19:43:00+02:00
- **Completed:** 2026-07-27T19:47:03+02:00
- **Tasks:** 2
- **Files modified:** 6 (4 created, 2 modified)

## Accomplishments
- `/members/ranking` renders the global point ranking via SSR, with the D-01 row-link rule (account members link to `/members/{slug}`, historical entries without a profile render as plain text)
- Empty and error states use `@/components/ui` `EmptyState`/`ErrorState` with the exact UI-SPEC copy — no hand-rolled markup
- `RankingPaginationNav` wraps `@/components/ui` `Pagination`'s callback into a `router.push` navigation, keeping the page SSR-first with exactly one `getMemberPointRanking(page)` call per render (SC-4, test-covered)
- Both `AppShellNavGroups` (authenticated) and `AppShellAnonNavGroups` (anonymous) now expose a `Rangliste` nav entry with a `Trophy` icon, directly after `Anime entdecken` (Pitfall 4 — both arrays updated identically)

## Task Commits

Each task was executed as a RED/GREEN TDD cycle with atomic commits:

1. **Task 1: Ranglisten-Seite (D-01)**
   - `1808b2d1` test(110-01): add failing test for member ranking page (D-01)
   - `35f5ad93` feat(110-01): add public member ranking page (D-01)
2. **Task 2: Rangliste-Nav-Eintrag (D-01, Pitfall 4)**
   - `7fd7de7b` test(110-01): add failing test for Rangliste nav entry (D-01, Pitfall 4)
   - `82903d5b` feat(110-01): add Rangliste nav entry to both AppShell session states (D-01)

**Plan metadata:** committed together with STATE.md/ROADMAP.md updates (see final commit below).

## Files Created/Modified
- `frontend/src/app/members/ranking/page.tsx` - SSR ranking page: searchParams-based page resolution, `getMemberPointRanking(page)` call, Table/EmptyState/ErrorState composition, row-link rule
- `frontend/src/app/members/ranking/page.module.css` - public-page-shell width token (copied from `members/[slug]/page.module.css`) plus `.pointsCell` (right-aligned, bold)
- `frontend/src/app/members/ranking/RankingPaginationNav.tsx` - `'use client'` wrapper turning `Pagination`'s `onPageChange` into `router.push(/members/ranking?page=N)`
- `frontend/src/app/members/ranking/page.test.tsx` - 5 RTL tests: row-link present, row-link absent (plain text), empty state, error state, single-call-per-render (SC-4)
- `frontend/src/components/layout/AppShell.tsx` - added `Trophy` import; added `Rangliste` entry to both `publicItems` arrays
- `frontend/src/components/layout/AppShell.test.tsx` - 2 new RTL tests: authenticated and anonymous Rangliste nav link assertions

## Decisions Made
- Reused the existing `toNumber(input, fallback)` helper (already used by `anime/page.tsx`) for resolving the `page` query param instead of writing a new inline parse — same behavior as the plan's specified `Math.max(1, Number(resolved.page) || 1)`, but consistent with the codebase's established SSR searchParams pattern. This remains a UI-only default; the authoritative clamp stays server-side in `MemberPointRankingHandler` per the threat model (T-110-01).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- A stale `.git/index.lock` file was present at the start of the commit sequence (empty, timestamp several minutes old, no active `git.exe` process found via `tasklist`/`wmic` across two separate checks 10+ seconds apart). Removed it before staging — this is standard git-lock hygiene, not a destructive git operation, and no working-tree content was touched.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `/members/ranking` and its nav entry are fully shipped and test-covered; ready for the live UAT step planned after Plan 110-02/110-03 land (per the plan's `<verification>` block).
- Plan 110-02 (Member-Profil-Hero Punktzahl, D-02) and 110-03/110-04 (Rollen-Einstiegs-Badges, D-03) can proceed independently — no shared file conflicts with this plan's scope (`members/ranking/*`, `AppShell.tsx`).

---
*Phase: 110-member-badges-ranglisten-ui-und-e2e-abnahme*
*Completed: 2026-07-27*

## Self-Check: PASSED

All created/modified files verified present on disk; all 4 task commits (`1808b2d1`, `35f5ad93`, `7fd7de7b`, `82903d5b`) verified present in `git log`.
