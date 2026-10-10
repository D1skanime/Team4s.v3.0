---
phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-
plan: 01
subsystem: ui
tags: [search, filtering, unicode-normalization, design-system, react, vitest]

# Dependency graph
requires: []
provides:
  - "frontend/src/lib/textFilter.ts exporting normalizeSearchText() / matchesSearch() — the shared umlaut-tolerant search helper for all six filter sites in Phase 178"
  - "EmptyState 'info' variant backed by the existing .stateInfo CSS tone, for the Abrufgrenze-erreicht hint"
  - "GroupMediaReviewSection.tsx (#4) wired onto the shared helper as the reference implementation"
affects: [178-02, 178-03, 178-04, 178-05, 178-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function + colocated-test convention (named exports only, no class/default export) mirrored from fansubListSort.ts"
    - "NFD-normalize-and-strip-combining-marks for umlaut-tolerant search, ß intentionally left unmatched to ss (Option A, no digraph expansion)"

key-files:
  created:
    - frontend/src/lib/textFilter.ts
    - frontend/src/lib/textFilter.test.ts
  modified:
    - frontend/src/components/ui/EmptyState.tsx
    - frontend/src/app/dev/ui-system/page.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx
    - frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx

key-decisions:
  - "normalizeSearchText uses the single verified regex /[̀-ͯ]/g (NFD combining-diacritical-marks range) — ß has no canonical decomposition so it never collapses to ss"
  - "matchesSearch treats an empty/whitespace query as 'match everything' and an empty haystack array as 'never matches a non-empty query'"
  - "EmptyState's 'info' variant reuses the pre-existing .stateInfo CSS tone already proven by LoadingState.tsx — no new CSS added"

patterns-established:
  - "Shared client-side text search helper (@/lib/textFilter) to be imported by all remaining filter sites in this phase instead of each site's own inline closure"

requirements-completed: [D-15, D-10, D-16, D-01, D-14, D-08, D-09, D-03, D-12]

# Metrics
duration: 12min
completed: 2026-10-10
---

# Phase 178 Plan 01: Shared umlaut-tolerant search helper + EmptyState info variant Summary

**New `normalizeSearchText`/`matchesSearch` pure-function pair (NFD accent-strip, ß untouched) wired into `GroupMediaReviewSection.tsx`'s media search, plus an `EmptyState` `'info'` variant for the upcoming "Abrufgrenze erreicht" hint.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-10-10T08:29:44Z
- **Completed:** 2026-10-10T08:41:41Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified, 1 test file extended)

## Accomplishments
- `frontend/src/lib/textFilter.ts` now provides the single, reusable umlaut-tolerant search contract (D-15) that every remaining filter site in Phase 178 (plans 178-02 through 178-06) will import.
- `EmptyState` gained an `'info'` variant mapped to the pre-existing `.stateInfo` CSS tone, closing the D-16 "no info-tone primitive" gap, demonstrated live in `/dev/ui-system`.
- `GroupMediaReviewSection.tsx` (filter site #4, the richest of the six) is now the first site wired onto the shared helper, replacing its inline `.toLowerCase().includes()` closure and resolving the `matchesSearch` naming collision noted in the plan's interfaces.

## Task Commits

Each task was committed atomically (TDD red/green for tasks 1 and 3):

1. **Task 1: Create the shared normalizeSearchText/matchesSearch helper**
   - `adf8678c` test(178-01): add failing tests for shared matchesSearch helper
   - `97969bae` feat(178-01): implement shared umlaut-tolerant matchesSearch helper
2. **Task 2: Add an 'info' variant to EmptyState for the D-16 hint primitive**
   - `90310e05` feat(178-01): add info variant to EmptyState for D-16 hint primitive
3. **Task 3: Wire matchesSearch into the richest existing filter site (#4)**
   - `b35061b0` test(178-01): add failing test for umlaut-tolerant media search
   - `00f19867` feat(178-01): wire shared matchesSearch helper into GroupMediaReviewSection

**Plan metadata:** (this commit, created after this Summary)

## Files Created/Modified
- `frontend/src/lib/textFilter.ts` - `normalizeSearchText()` (NFD-strip + lowercase) and `matchesSearch()` (null-safe, empty-query-matches-all, empty-haystack-never-matches)
- `frontend/src/lib/textFilter.test.ts` - 8 Vitest cases covering every behavior in the plan, including the ß-never-expands-to-ss guarantee
- `frontend/src/components/ui/EmptyState.tsx` - `EmptyStateVariant` now includes `'info'`, mapped to `styles.stateInfo` instead of the previously unconditional `styles.stateNeutral`
- `frontend/src/app/dev/ui-system/page.tsx` - new `EmptyState variant="info"` showcase sample with the exact German hint copy ("Abrufgrenze erreicht" / "Es werden die ersten 500 Einträge angezeigt – bitte die Suche eingrenzen.")
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.tsx` - `filteredMediaItems` now calls the imported `matchesSearch` helper; local boolean renamed `isSearchMatch` to avoid shadowing
- `frontend/src/app/admin/fansubs/[id]/edit/GroupMediaReviewSection.test.tsx` - new regression test: an ASCII query ("ubersicht") now finds a media item titled "Übersicht Banner" while a non-matching item is filtered out

## Decisions Made
- Followed RESEARCH.md's verified normalization exactly: `value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`. No alternate regex literal was substituted.
- Used single-quote string style in `textFilter.ts` to match the plan's literal acceptance-criteria grep (`normalize('NFD')`) and the project's `EmptyState.tsx`/`LoadingState.tsx` quoting convention, even though a sibling file (`fansubListSort.ts`) uses double quotes — both styles coexist in `frontend/src/lib/`.
- Passed the raw, untrimmed `searchTerm` state directly into `matchesSearch` per the plan's instruction (the helper trims/normalizes internally); removed the now-redundant `normalizedSearch` local entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed root-owned `.next` build directory blocking local production build verification**
- **Found during:** Task 2 acceptance criteria (`cd frontend && npm run build`)
- **Issue:** `frontend/.next` was previously created by a root-owned Docker process; `npm run build` under the local `d1sk` user failed with `EACCES: permission denied, open '/home/d1sk/team4s/frontend/.next/trace'`. This is a pre-existing environment artifact unrelated to this plan's code changes.
- **Fix:** `sudo chown -R d1sk:d1sk frontend/.next` to restore local-user write access to the build output directory (no source files touched).
- **Files modified:** none (directory ownership only, not a tracked git path)
- **Verification:** `npm run build` subsequently completed successfully for both Task 2 and Task 3's acceptance criteria.
- **Committed in:** not applicable (filesystem ownership change, not a git-tracked artifact)

---

**Total deviations:** 1 auto-fixed (1 blocking, environment-only)
**Impact on plan:** No code or scope impact; purely unblocked local build verification that Docker normally handles as root.

## Issues Encountered
- `frontend/next-env.d.ts` is auto-regenerated by `next build` (switches an internal `./.next/dev/types/routes.d.ts` reference to `./.next/types/routes.d.ts`). This file was reverted with `git checkout --` after each build run so it would not pollute task commits with unrelated build-tool noise.
- Full-suite `npx vitest run` (3366 tests) surfaced 3 pre-existing failures entirely unrelated to this plan's files: `src/components/profile/badgeArtwork.test.ts`, `src/components/ui/ResponsiveImage.config.test.ts`, and `src/app/admin/roles/RoleCapabilityDetail.membershipBaselineDrift.test.ts` (the last fails with `ENOENT` reading an absolute `/backend/internal/permissions/permissions.go` path that doesn't exist in this host's layout — a Docker-vs-host path assumption, not a regression). None touch `textFilter.ts`, `EmptyState.tsx`, or `GroupMediaReviewSection.tsx`; left untouched per the Scope Boundary rule (out-of-scope pre-existing failures, not caused by this plan).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `@/lib/textFilter` (`matchesSearch`, `normalizeSearchText`) and `EmptyState`'s `'info'` variant are both ready for immediate import by plans 178-02 through 178-06, which wire the remaining five filter sites and the "Abrufgrenze erreicht" hint onto this same foundation.
- No blockers. Live-UAT of the umlaut-tolerant media search and the `/dev/ui-system` info-tone sample is deferred to plan 178-07 as planned.

---
*Phase: 178-suchen-filtern-vereinheitlichen-f-16-ein-gemeinsamer-umlaut-*
*Completed: 2026-10-10*

## Self-Check: PASSED

All created/modified files verified present on disk; all 5 task commits (`adf8678c`, `97969bae`, `90310e05`, `b35061b0`, `00f19867`) verified present in `git log`.
