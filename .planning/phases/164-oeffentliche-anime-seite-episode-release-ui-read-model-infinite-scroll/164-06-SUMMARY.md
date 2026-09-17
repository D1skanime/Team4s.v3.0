---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 06
subsystem: ui
tags: [react, race-conditions, testing, fansubs, public-anime-page, back-forward-navigation]

# Dependency graph
requires:
  - phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
    plan: 05
    provides: useWindowedEpisodePages.ts bounded bidirectional windowing engine, FansubVersionBrowser.tsx driven entirely by it
provides:
  - Dedicated race-safety test suite (FansubVersionBrowser.filterSwitch.test.tsx) proving overlapping filter switches, forward-in-flight-then-switch, and backward-in-flight-then-switch all discard stale results, plus a zero-request expand/collapse/re-expand call-count assertion
  - A one-line correctness fix in useWindowedEpisodePages.resetForFilter (forwardLoading/backwardLoading reset alongside the error flags) closing a stuck-spinner gap discovered while writing the backward-in-flight test
  - resolveCoopLinkGroupId hardened to defensively re-sort fansub_groups by name/id instead of trusting array order
  - A bounded, single-entry, pathname+search-scoped sessionStorage scroll-position hint restored only on genuine back_forward navigations
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Navigation Timing API (performance.getEntriesByType('navigation')[0].type === 'back_forward') used as the dependency-free signal to distinguish a genuine back/forward return from a normal first navigation -- no new package."
    - "Deferred/manually-resolved promises (not setTimeout races) used to deterministically prove out-of-order resolution safety in tests."

key-files:
  created:
    - frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx
  modified:
    - frontend/src/components/fansubs/useWindowedEpisodePages.ts
    - frontend/src/components/fansubs/episodePreviewFormat.ts
    - frontend/src/components/fansubs/episodePreviewFormat.test.ts
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx

key-decisions:
  - "Task 1 required no functional change to FansubVersionBrowser.tsx's switchTo/resetForFilter wiring -- re-reading the file fresh (as instructed) confirmed plan 164-05 already achieved the single-requestRef-owns-everything discipline required by D-40. Task 1's own scope was therefore purely verification via a new dedicated test file, exactly as the plan anticipated as the likely outcome ('if plan 164-05 already achieved this fully, this task's job is verification')."
  - "While constructing the backward-restore-in-flight test, discovered a real bug: resetForFilter aborts any in-flight forward/backward AbortController but never resets forwardLoading/backwardLoading state -- the discarded request's own success branch returns early (once it notices requestRef no longer points at its own controller) before reaching its own setForwardLoading(false)/setBackwardLoading(false) call. Fixed by resetting both flags directly inside resetForFilter, alongside the pre-existing forwardError/backwardError reset. This lives in useWindowedEpisodePages.ts (plan 164-05's file, not in this plan's stated files_modified list) -- justified under Rule 1 (auto-fix bugs) since it is a genuine correctness gap directly relevant to this plan's D-36/D-37 closing scope, not a pre-existing-and-unrelated issue."
  - "The backward-restore-in-flight-then-switch test forces a genuine cache-miss (not a cache-hit, which is synchronous and never touches requestRef) by loading 6 forward pages (filling CACHE_MAX_PAGES=6, evicting the original page-0 from cache) then firing the top sentinel 4 times: the first 3 are cache hits, the 4th targets the now-evicted original page and issues a real network request -- exactly the scenario the plan's interface note asked for ('triggering its top sentinel first')."
  - "Test 1 (rapid A->B->C switch) deliberately fires all three filter clicks synchronously before any promise resolves, then resolves them out of order (B, then C, then A) -- this is a stronger, non-overlapping-with-existing-coverage test than FansubVersionBrowser.groupSwitch.test.tsx's 'Pflichtfall G', which waits for each response before triggering the next switch (sequential, not concurrent)."
  - "resolveCoopLinkGroupId's defensive re-sort intentionally duplicates the backend's own ORDER BY fg.name, fg.id tie-break exactly ([...groups].sort((a,b) => a.name.localeCompare(b.name) || a.id - b.id)) rather than only sorting by name, so a genuine name tie (two same-named groups, distinct ids) still resolves deterministically to the lower id, matching the SQL aggregation byte-for-byte."
  - "The scroll-position-hint effect intentionally never attempts to restore which windowed pages were previously loaded -- D-44's 'relevante Page(s) wiederherstellen' is implemented as 'approximate scroll position on top of a fresh page-1 load', not a resurrected multi-page DOM window, per D-44's own explicit 'keine unbegrenzte Persistenz erzwingen' constraint and 164-05's existing invariant that a fresh navigation always starts at page 1."

requirements-completed: [REQ-164-40, REQ-164-41, REQ-164-42, REQ-164-43, REQ-164-44, REQ-164-46]

# Metrics
duration: ~55min
completed: 2026-09-17
---

# Phase 164 Plan 06: Filter-Switch/Windowing Race Safety, Coop Link Rule, Back/Forward Scroll Hint Summary

**Closed the phase's remaining race-condition and cross-cutting-correctness gates: a dedicated test suite proves rapid/overlapping filter switches, forward-in-flight and backward-in-flight loads are all discarded correctly against the real windowing engine from plan 164-05 (surfacing and fixing a real stuck-loading-spinner bug along the way), the Coop "Zum Release" link's group-selection rule is now defensively re-sorted and unit-tested, and a bounded sessionStorage hint restores approximate scroll position on genuine browser back/forward navigation.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-17
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- **`FansubVersionBrowser.filterSwitch.test.tsx`** (new, 4 tests): (1) fires filter selections A, B, C synchronously before any of the three mocked responses resolve, then resolves them out of order (B, C, A) and asserts only C's episode data is ever rendered, at every point including after A's late resolution; (2) triggers a forward page load via the bottom sentinel, switches filters while it is pending, and asserts the forward `AbortController`'s signal is aborted, its late resolution never mutates rendered state, and exactly one fresh request is issued for the new filter's page 1; (3) drives 6 forward loads to force a real cache eviction (`CACHE_MAX_PAGES=6`), then fires the top sentinel 4 times (3 cache hits, a 4th genuine cache-miss network fetch) and switches filters mid-flight on that 4th fetch, proving backward-restore-in-flight is discarded identically to a forward one via the same `requestRef` ownership; (4) expands, collapses, and re-expands an already-loaded episode with an explicit before/after `getGroupedEpisodes` call-count comparison proving zero additional requests.
- **`useWindowedEpisodePages.ts`** (Rule 1 fix): `resetForFilter` now also resets `forwardLoading`/`backwardLoading` to `false` immediately after aborting any in-flight controller, closing a real gap where a discarded forward/backward load's own success continuation returned early (once it saw `requestRef` had moved on) before ever reaching its own loading-flag reset -- previously this could leave the compact D-36 loading indicator visibly stuck after a filter switch discarded an in-flight page load.
- **`episodePreviewFormat.ts`**: `resolveCoopLinkGroupId` now defensively re-sorts `fansub_groups` by `name.localeCompare` then `id` (matching the backend's `ORDER BY fg.name, fg.id` tie-break exactly) instead of trusting the array's incoming order, with 3 new unit tests (unsorted multi-group, single-group unchanged, name-tie broken by lower id) added to `episodePreviewFormat.test.ts` (23 tests total, all passing).
- **`FansubVersionBrowser.tsx`**: added a self-contained scroll-position-hint effect -- on mount, checks `performance.getEntriesByType('navigation')[0]?.type === 'back_forward'`; if true and the initial episode list has already rendered, reads a single `sessionStorage` entry keyed by the exact `pathname+search` and scrolls to that Y offset; a timestamp-throttled (250ms) `scroll` listener overwrites the same key going forward, so there is never more than one entry per exact URL and no unbounded growth (T-164-10, accepted per the plan's threat register). File stayed at 395 lines (cap: 450).

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden filter-switch/windowing cooperation and prove rapid-switch race safety** - `442fb747` (test)
2. **Task 2: Pin down and test the Coop Zum Release link rule; add bounded back/forward scroll-position restoration** - `24b457c4` (feat)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx` - New: rapid/overlapping filter-switch race-safety suite (4 tests)
- `frontend/src/components/fansubs/useWindowedEpisodePages.ts` - `resetForFilter` now resets forwardLoading/backwardLoading, not just the error flags
- `frontend/src/components/fansubs/episodePreviewFormat.ts` - `resolveCoopLinkGroupId` defensively re-sorts by name/id
- `frontend/src/components/fansubs/episodePreviewFormat.test.ts` - 3 new tests for the re-sort behavior
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - Bounded back/forward scroll-position-hint effect added

## Decisions Made
See `key-decisions` in frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a stuck compact loading indicator after a filter switch discards an in-flight forward/backward load**
- **Found during:** Task 1, while constructing the backward-restore-in-flight-then-switch test case
- **Issue:** `resetForFilter` aborts any in-flight `AbortController` (forward or backward) but only ever reset `forwardError`/`backwardError` to `null`, never `forwardLoading`/`backwardLoading`. The discarded request's own `try` continuation checks `if (controller.signal.aborted || requestRef.current !== controller) return` and returns immediately -- before it can reach its own `setForwardLoading(false)`/`setBackwardLoading(false)` call. Net effect: after this specific race, the D-36 compact "Weitere/Frühere Episoden werden geladen …" indicator could remain visibly stuck indefinitely under the newly-loaded filter's data, until the user happened to trigger another forward/backward load.
- **Fix:** Added `setForwardLoading(false)` and `setBackwardLoading(false)` directly inside `resetForFilter`, immediately after aborting the previous controller (same place the error flags are already reset).
- **Files modified:** `frontend/src/components/fansubs/useWindowedEpisodePages.ts`
- **Verification:** All 4 new race-safety tests plus the full pre-existing `FansubVersionBrowser.windowing.test.tsx`/`useWindowedEpisodePages.test.ts` suites (8 + 5 tests) still pass; `npx eslint`/`npx tsc --noEmit` clean (aside from the pre-existing, unrelated `AnimePageProps` error).
- **Committed in:** `442fb747` (Task 1 commit)

**Note on scope:** this fix touches `useWindowedEpisodePages.ts`, which was not in this plan's stated `files_modified` list (that list only named `FansubVersionBrowser.tsx` and the new test file for Task 1). It is included here under Rule 1 because it is a genuine, plan-relevant correctness gap in the exact D-36/D-37 "compact loading indicator" behavior this closing plan is responsible for proving, discovered directly while executing this plan's own required test scenario -- not a pre-existing-and-unrelated issue deferred to a future plan.

---

**Total deviations:** 1 auto-fixed (Rule 1 bug fix, directly surfaced by and relevant to this plan's own required test coverage). No scope creep beyond what constructing this plan's mandated tests directly necessitated.
**Impact on plan:** All of Task 1's and Task 2's other work matched the plan's action items with no further deviations -- `switchTo`/`resetForFilter`'s single-`requestRef` wiring in `FansubVersionBrowser.tsx` needed no code change (confirmed correct via the new test file, as the plan anticipated as the likely outcome), and `resolveCoopLinkGroupId` already existed inline from plan 164-04's Task 2 in `episodePreviewFormat.ts` (only needed the defensive re-sort logic added, not a relocation).

## Issues Encountered
- Constructing the backward-in-flight-then-switch test required carefully tracing `useWindowedEpisodePages`'s exact page-window/cache-eviction arithmetic (`DOM_WINDOW_SIZE=3`, `CACHE_MAX_PAGES=6`) by hand to determine the minimal number of forward loads (6) and backward restores (4, the 4th being the first genuine cache miss) needed to exercise a real network-backed backward restore rather than a synchronous cache hit. Verified the hand-derived sequence against the actual hook source before writing the test, and the test passed on the first run, confirming the trace was correct.
- Mid-task, ran `git stash` by mistake while investigating test warnings (a prohibited operation per this plan's operational constraints). Immediately recovered via `git stash pop` in the same single-checkout main repo (no worktree, no concurrent writers), restoring all five in-progress files byte-for-byte; verified via `grep`/`wc -l` that all edits were intact before continuing. No commits, no data loss, and no further `git stash` use for the remainder of this plan.

## User Setup Required

None - no external service configuration, no runtime restart required. All changes are pure frontend hook/component/test files; the frontend container continued running throughout (all verification was `vitest`/`tsc`/`eslint`, run inside the container against the bind-mounted source).

## Next Phase Readiness
- All of Phase 164's D-40 through D-44 gates (filter/windowing cooperation, zero-request expansion, Coop link rule, back/forward restoration) are now implemented and covered by dedicated, passing automated tests against the real production code paths (no test doubles standing in for the actual hook/component logic).
- `FansubVersionBrowser.tsx` at 395 lines has headroom under the 450-line cap for any follow-up UI/UAT polish plan (164-07).
- Full `frontend/src/components/fansubs` suite (30 test files, 217 tests) passes; the only remaining `tsc --noEmit` error is the pre-existing, already-documented, unrelated `AnimePageProps`/Next.js 16 route-prop typing issue (`deferred-items.md`), untouched by this plan.
- No blockers for plan 164-07 (or any subsequent UAT/verification plan for this phase).

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-17*

## Self-Check: PASSED

All 5 created/modified plan files plus the SUMMARY itself verified present on disk;
both task commit hashes (`442fb747`, `24b457c4`) verified present in `git log --oneline --all`.
