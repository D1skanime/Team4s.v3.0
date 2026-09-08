---
phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung
plan: 06
subsystem: testing
tags: [nextjs, vitest, testing-library, react-server-components, fansub]

# Dependency graph
requires:
  - phase: 152-01..05
    provides: no direct dependency; file-disjoint from artwork-migration and backend query-flow plans in this phase
provides:
  - "page.tsx domain-projection load simplified from Promise.allSettled([single]) to try/catch (C5)"
  - "Real composition test coverage for app/fansubs/[slug]/page.tsx (D5): section-conditional rendering, empty states, domain-projection failure fallback, 404/generic error branching, hero stat correctness"
affects: [152-07, 152-13-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Coarse composition assertions (heading role/name, getByText) instead of CSS-module class-name assertions, to stay resilient against Wave-2 DOM changes to the same route"
    - "makeProfileResponse(overrides) fixture builder pattern extended with a Partial<PublicFansubProfile> overrides param instead of a parallel fixture function"

key-files:
  created: []
  modified:
    - frontend/src/app/fansubs/[slug]/page.tsx
    - frontend/src/app/fansubs/[slug]/page.test.tsx

key-decisions:
  - "Domain-projection load now uses a plain try/catch with an explicit empty-projection fallback object, matching RESEARCH.md's C5 code example exactly; heroStats/hasTeam downstream logic left byte-identical"
  - "Fixed the pre-existing mocked ApiError constructor arg order (message, status) to (status, message) to match the real @/lib/api.ApiError signature - the 404-branch test surfaced a latent type mismatch between the test's mock and production code"
  - "Used .toBeTruthy()/.toBeNull() for presence/absence assertions instead of jest-dom's toBeInTheDocument(), matching the project's existing convention (no @testing-library/jest-dom dependency is installed)"

patterns-established:
  - "Composition tests for Server Component route files render the component's return value directly (await FansubProfilePage({params}); render(result)) rather than mounting through a wrapper, matching the existing project-routing test's pattern"

requirements-completed: [P152-10, P152-13]

# Metrics
duration: ~15min
completed: 2026-09-08
---

# Phase 152 Plan 06: Promise.allSettled simplification and page composition tests Summary

**Replaced `Promise.allSettled([single promise])` with a plain try/catch in the fansub public-profile page, and added 8 new composition tests covering section-conditional rendering, the domain-projection failure fallback, and 404-vs-generic error branching that had zero prior test coverage.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-08T17:51Z (approx.)
- **Completed:** 2026-09-08T17:56Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `frontend/src/app/fansubs/[slug]/page.tsx`'s single-promise `Promise.allSettled([getFansubGroupDomainProjection(group.id)])` idiom replaced with a plain `try/catch`, with the fallback behavior (`{ members: [], historical: [], contributors: [] }`) now explicit and commented instead of implied by a `.status === 'fulfilled'` ternary
- `frontend/src/app/fansubs/[slug]/page.test.tsx` grew from 1 test (project-routing) to 11 tests: 1 pre-existing + 8 new composition tests covering all 6 behaviors specified in the plan (empty-everything renders only Hero, History section tied to `history.length`, Media section tied to `media.length`, domain-projection rejection fallback with no Team section, 404 vs. generic error message branching, hero stat numbers reflecting `profile.projects.length`/`group.release_versions_count`/`countVisibleTeamMembers`)
- Along the way, fixed a latent contract mismatch in the test file's mocked `ApiError` class: its constructor took `(message, status)` while the real `@/lib/api.ApiError` takes `(status, message)` — the new 404-branch test's `tsc --noEmit` run caught this before it could mask a real bug in future tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace Promise.allSettled([single]) with try/catch (C5)** - `307d2e85` (refactor)
2. **Task 2: Page composition tests (D5)** - `e3a68be1` (test)

**Plan metadata:** (this commit) `docs(152-06): complete plan`

## Files Created/Modified
- `frontend/src/app/fansubs/[slug]/page.tsx` - domain-projection load now `try/catch` instead of `Promise.allSettled([single])`; downstream `heroStats`/`hasTeam`/`visibleTeamCount` logic unchanged
- `frontend/src/app/fansubs/[slug]/page.test.tsx` - new `describe('FansubProfilePage composition (152-06)', ...)` block with 8 tests; `makeProfileResponse()` extended with an optional `overrides: Partial<PublicFansubProfile>` param; `renderFansubProfilePage()` extended with an optional `domainProjection` param; mocked `ApiError` constructor arg order corrected to `(status, message)`

## Decisions Made
- Kept the fixture-builder pattern (`makeProfileResponse(overrides)`) rather than adding parallel fixture functions, per the plan's "whichever is less invasive" guidance — the pre-existing project-routing test needed zero changes
- Assertions query by `getByRole('heading', { name })` / `getByText` rather than CSS module class names or component internals, per the plan's explicit Wave-2-resilience instruction
- `ApiError` constructor argument order fix classified as Rule 1 (auto-fix bug): the mock's inverted signature was masked before because no prior test exercised the 404 branch with a real `ApiError` construction; `tsc --noEmit` caught the mismatch against the real export

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected mocked ApiError constructor argument order**
- **Found during:** Task 2 (page composition tests) — `tsc --noEmit` run
- **Issue:** The test file's `vi.mock('@/lib/api', ...)` factory defined `class ApiError { constructor(message: string, status: number) }`, but the real `frontend/src/lib/api.ts` export is `constructor(status: number, message: string, ...)`. No prior test constructed an `ApiError` instance in this file, so the mismatch was latent. Writing the new 404-vs-generic-error test (which needed `new ApiError(404, 'not found')` to type-check against the real signature) surfaced it — with the old mock constructor order, the mocked instance would have received `status = 'not found'` (a string) at runtime, silently failing the 404-check in `page.tsx` (`error.status === 404`).
- **Fix:** Reordered the mock class constructor to `(status: number, message: string)`, matching the real export exactly.
- **Files modified:** `frontend/src/app/fansubs/[slug]/page.test.tsx`
- **Verification:** `npx tsc --noEmit` clean; `npx vitest run 'src/app/fansubs/[slug]/page.test.tsx'` 10/10 green, including the new 404-branch test that now correctly renders "Fansubgruppe nicht gefunden."
- **Committed in:** `e3a68be1` (Task 2 commit)

**2. [Rule 1 - Bug] Replaced non-existent `toBeInTheDocument()` matcher with project convention**
- **Found during:** Task 2 (page composition tests) — first `vitest run`, 8/10 tests failed with `Invalid Chai property: toBeInTheDocument`
- **Issue:** Initial test draft used `@testing-library/jest-dom`'s `toBeInTheDocument()` matcher, which is not installed/extended in this project (`vitest.config.ts` only wires `jest-axe`'s `toHaveNoViolations`, no `@testing-library/jest-dom` import exists anywhere in the codebase).
- **Fix:** Replaced all `.toBeInTheDocument()` / `.not.toBeInTheDocument()` calls with `.toBeTruthy()` / `.toBeNull()` (via `queryByRole`/`getByRole`), matching the existing convention used throughout `frontend/src/components/fansubs/__tests__/*.test.tsx`.
- **Files modified:** `frontend/src/app/fansubs/[slug]/page.test.tsx`
- **Verification:** `npx vitest run 'src/app/fansubs/[slug]/page.test.tsx'` 10/10 green after the fix.
- **Committed in:** `e3a68be1` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 - bugs surfaced while writing/type-checking the new tests, not pre-existing production defects)
**Impact on plan:** Both fixes were necessary to make the new tests type-check and run correctly; no scope creep, no production code touched by either fix.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `Promise.allSettled([single])` (C5) is fully resolved in `page.tsx`; no other consumers of this idiom remain in the file.
- `app/fansubs/[slug]/page.test.tsx` now has real composition coverage (D5) that plan 152-07 (History-artwork migration) can safely run against as a regression check, since assertions deliberately avoid `FansubHistorySection`'s internal badge/CSS markup (explicitly reserved for 152-07's own test surface per the plan).
- Full frontend suite for the `src/app/fansubs/` directory (8 files, 38 tests) verified green after this plan's changes — no regressions in sibling fansub route tests.

---
*Phase: 152-public-fansub-gruppenseite-konsolidierung-und-modernisierung*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: frontend/src/app/fansubs/[slug]/page.tsx
- FOUND: frontend/src/app/fansubs/[slug]/page.test.tsx
- FOUND: .planning/phases/152-public-fansub-gruppenseite-konsolidierung-und-modernisierung/152-06-SUMMARY.md
- FOUND commit: 307d2e85 (Task 1)
- FOUND commit: e3a68be1 (Task 2)
