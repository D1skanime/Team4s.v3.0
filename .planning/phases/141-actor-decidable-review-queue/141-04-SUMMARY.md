---
phase: 141-actor-decidable-review-queue
plan: 04
subsystem: frontend
tags: [typescript, react, nextjs, hooks, tdd, release-reviews]

# Dependency graph
requires:
  - phase: 141-actor-decidable-review-queue
    provides: "Plan 141-03's backend contract for actor-decidable Detail/Next (403 REVIEW_FORBIDDEN), and Plan 141-02's 'own' view groundwork"
provides:
  - "ReleaseReviewView with 'own' matching the backend's third view value"
  - "ReleaseReviewCounts.allowed_types: ReleaseReviewType[] -- distinct from the numeric text/image counts so a zero count and 'not capable of this kind' are never conflated"
  - "useReleaseReviewLane(options) -- shared fetch/abort/sequence-guard/pagination hook (items/counts/nextCursor/isLoading/isLoadingMore/error/pageError/reload/loadMore), extracted byte-for-byte from ReleaseReviewsSection.tsx"
  - "ReleaseReviewsSection.tsx refactored to consume the hook, dropped from 450 to 361 lines (89 lines of headroom under the CLAUDE.md 450-line cap)"
affects: [141-05, 141-06, 141-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lane-hook extraction: fetch/abort/sequence-guard/pagination mechanics live in a reusable hook parameterized by filter options + an `enabled` flag; filter/URL-sync state, resetFilters, derived option lists, and all JSX stay in the owning component"

key-files:
  created:
    - frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.ts
    - frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.test.ts
  modified:
    - frontend/src/types/releaseReviews.ts
    - frontend/src/app/admin/fansubs/releaseReviewPresentation.ts
    - frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx

key-decisions:
  - "useReleaseReviewLane's loadMore is exposed as a synchronous void function (wrapping its async body in an IIFE internally) rather than returning a Promise, matching UseReleaseReviewLaneResult's documented `loadMore: () => void` contract and letting call sites use `onClick={() => loadMore()}` directly instead of `() => void loadMore()`."
  - "reload() (loadInitial re-exposed) replaces the component's former `() => void loadInitial()` retry-button handler, satisfying D08's future 're-derive count/list after a decision' need without any new fetch logic."

patterns-established:
  - "A new sibling hook file per lane concern (useReleaseReviewLane.ts next to ReleaseReviewsSection.tsx) is the extraction target when a section file approaches the 450-line cap and multiple sibling sections need the same data-fetching behavior against different `view` values."

requirements-completed: [RQUE-01, RQUE-03, RQUE-04]

# Metrics
duration: ~20min
completed: 2026-08-26
---

# Phase 141 Plan 04: Frontend contracts -- ReleaseReviewView/Counts extension and useReleaseReviewLane extraction Summary

**`ReleaseReviewView` gained `'own'` and `ReleaseReviewCounts` gained `allowed_types: ReleaseReviewType[]` to match the backend's final contract, and `ReleaseReviewsSection.tsx`'s fetch/abort/sequence-guard/pagination logic was extracted byte-for-byte into a new `useReleaseReviewLane` hook, dropping the component from exactly 450 to 361 lines with zero observable behavior change.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-08-26T09:38:00Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- `ReleaseReviewView` union extended with `'own'` (matches the backend's third view value shipped in Plan 141-02).
- `ReleaseReviewCounts` gained `allowed_types: ReleaseReviewType[]`, placed after `contribution` and before `image_categories` per 141-UI-SPEC.md's field-ordering intent; `EMPTY_RELEASE_REVIEW_COUNTS` updated to `allowed_types: []` in the same task to keep the literal type-checking.
- New `useReleaseReviewLane.ts` hook: exports `UseReleaseReviewLaneOptions` and `UseReleaseReviewLaneResult`, and the `useReleaseReviewLane(options)` function. Contains the exact `items`/`counts`/`nextCursor`/`isLoading`/`isLoadingMore`/`error`/`pageError` state, `requestSequence`/`initialAbortRef`/`loadMoreAbortRef` refs, `loadInitial` (parameterized by `options.enabled` instead of the component's own `isClientInitialized`/`hasActiveSession`/`isMobile` checks), the composite-key-driven `useEffect`, and `loadMore` -- moved unchanged from `ReleaseReviewsSection.tsx`. Adds `reload` (re-exposes `loadInitial` for retry buttons and future re-derive-after-decision use).
- `ReleaseReviewsSection.tsx` now calls `useReleaseReviewLane({ fansubId, view, animeId, releaseVersionId, type, category, search, enabled: isClientInitialized && hasActiveSession && !isMobile })` and consumes its return value; the component's own filter/URL-sync `useState` hooks, the URL-sync `useEffect`, `resetFilters`, `animeOptions`, `releaseOptions`, and all JSX are unchanged. File line count: 450 -> 361 (89 lines below the CLAUDE.md 450-line cap, exceeding the plan's required 80-line minimum drop).
- TDD gate followed for Task 2: `useReleaseReviewLane.test.ts` (5 tests covering initial load, disabled no-fetch, generic German error copy, filter-change stale-request-race safety, and `loadMore` append/dedupe/`nextCursor`) was written and confirmed failing (RED -- hook module did not exist) before the hook was implemented (GREEN).

## Task Commits

Each task was committed atomically:

1. **Task 1: Type contracts** - `f815cca3` (feat)
2. **Task 2a: RED -- failing test for useReleaseReviewLane** - `c41d6aaf` (test)
2. **Task 2b: GREEN -- hook implementation + ReleaseReviewsSection refactor** - `e29a01d7` (feat)

**Plan metadata:** (pending) `docs: complete plan`

## Files Created/Modified
- `frontend/src/types/releaseReviews.ts` - `ReleaseReviewView` gained `'own'`; `ReleaseReviewCounts` gained `allowed_types: ReleaseReviewType[]`
- `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` - `EMPTY_RELEASE_REVIEW_COUNTS` gained `allowed_types: []`
- `frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.ts` - New hook: fetch/abort/sequence-guard/pagination extracted from `ReleaseReviewsSection.tsx`
- `frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.test.ts` - New: 5 RED-then-GREEN tests for the hook's documented contract
- `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` - Refactored to consume `useReleaseReviewLane`; dropped from 450 to 361 lines

## Decisions Made
- `loadMore` is exposed as `() => void` (async body wrapped in an internal IIFE) rather than returning a `Promise`, matching the documented `UseReleaseReviewLaneResult` contract and simplifying call sites from `() => void loadMore()` to `() => loadMore()`.
- `reload` (re-exposed `loadInitial`) backs the existing "Erneut versuchen" retry button and is available for Plan 141-06+/D08's "re-derive count/list after a decision" requirement without any new fetch logic being needed later.

## Deviations from Plan

None - plan executed exactly as written. The one pre-existing, out-of-scope `tsc --noEmit` error (`.next/dev/types/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.ts`, a generated dev-type artifact unrelated to any file this plan touches) and the three pre-existing `useRoleCatalog`-provider test failures (`FansubAppMembersSection.test.tsx`, `page.test.tsx`, `useGroupMembersTab.test.ts`) both match 139-BASELINE.md's documented baseline debt (Phase 136) and were left untouched per the Scope Boundary rule.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
`ReleaseReviewView`/`ReleaseReviewCounts` now match the backend's final contract, and `useReleaseReviewLane` is available with a stable, documented, test-covered contract. Plan 141-05 (own-pending lane) can call `useReleaseReviewLane({ ..., view: 'own' })` directly; Plans 141-06/141-07 can extend `ReleaseReviewsSection.tsx` (now well under the line cap) without first needing to shed logic. No blockers.

---
*Phase: 141-actor-decidable-review-queue*
*Completed: 2026-08-26*
