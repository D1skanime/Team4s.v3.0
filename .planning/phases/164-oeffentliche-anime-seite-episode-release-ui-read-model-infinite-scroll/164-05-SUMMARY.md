---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 05
subsystem: ui
tags: [react, nextjs, intersectionobserver, infinite-scroll, fansubs, public-anime-page]

# Dependency graph
requires:
  - phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
    plan: 04
    provides: EpisodeGlassCard/ReleasePreviewRow presentational components and FansubVersionBrowser.tsx already wired to them (328 lines, no fetch/state changes)
provides:
  - useWindowedEpisodePages.ts — bounded bidirectional infinite-scroll engine (DOM_WINDOW_SIZE=3, CACHE_MAX_PAGES=6, spacer/eviction bookkeeping, cache-hit/cache-miss backward restoration using the originally-stored cursor, independent forward/backward loading/error state, single shared AbortController for forward/backward/reset requests)
  - FansubVersionBrowser.tsx driven entirely by useWindowedEpisodePages — bottom/top IntersectionObserver sentinels replace the "Weitere Episoden und Versionen laden" button, spacer divs for evicted pages, compact directional loading/error states, inline end-of-list marker gated on >1 page loaded
  - A render-time boundary-merge step for episodes whose variant rows legitimately span two adjacent cursor pages (row-level pagination), reconciling the loss of the old client-side mergeEpisodes function
affects: [164-06, 164-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bounded page window + spacer-preserved scroll (new pattern, no prior codebase precedent per 164-RESEARCH.md/164-PATTERNS.md's 'No Analog Found' section)"
    - "Single shared AbortController across forward/backward/reset operations inside a custom hook, extending FansubVersionBrowser's pre-existing requestRef discipline rather than duplicating it"
    - "ref.current mutation moved out of render into useEffect to satisfy the react-hooks/refs lint rule (React Compiler assumption)"

key-files:
  created:
    - frontend/src/components/fansubs/useWindowedEpisodePages.ts
    - frontend/src/components/fansubs/useWindowedEpisodePages.test.ts
    - frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx
  modified:
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx

key-decisions:
  - "useWindowedEpisodePages owns the single requestRef AbortController internally (not accepted as a parameter) — resetForFilter/loadNext/loadPrevious all share it, and FansubVersionBrowser no longer needs its own AbortController for episode data; switchTo just awaits resetForFilter's returned {ok, aborted} result and manages only its own local switchState dimming UI."
  - "domWindowPageIds/pageCache/spacers/pageMeta live in one atomically-updated useState<CoreState> object (not several independent useState calls) so eviction/restoration transitions are always internally consistent across a single render."
  - "Page-data cache eviction (CACHE_MAX_PAGES=6) explicitly never evicts an id currently in domWindowPageIds, even though the plan describes it as plain 'Map insertion-order LRU' — a literal insertion-order-only eviction could otherwise evict actively-rendered page data given adversarial scroll patterns; documented in-code."
  - "Added a render-time computeBoundaryMergedRenderPlan() step in FansubVersionBrowser.tsx: Phase 163's cursor paginates over (episode_number, episode_id, variant_id) ROWS, so a single episode's variants can legitimately span two adjacent cursor pages. The old mergeEpisodes function handled this; the new bounded-window model has no cross-page merge by default. This step merges such boundary-split episodes for display across the CURRENTLY WINDOWED pages only (never mutates the hook's own per-page cache) — if the earlier page is later evicted, this naturally degrades to the partial version list still in the window, never crashes."
  - "Sentinels (top/bottom) and directional loading/error UI are rendered as `<ul>` SIBLINGS (before/after the list), not inside it — this both preserves the pre-existing precedent (the old 'Weitere laden' button was also a sibling of the `<ul>`, rendered independently of whether the episode list itself was empty) and keeps the `<ul>`'s only non-`<li>` children to the minimal per-page measurement wrapper and spacer divs."
  - "WindowedPageGroup wraps each page's episodes in a plain `<div>` (not a nested `<ul>`) purely for ResizeObserver height measurement — a nested `<ul>` would have broken every pre-existing `screen.getByRole('list')` singular-query assertion; a `<div>` keeps the implicit ARIA `listitem` role on each `<li>` (context-independent per HTML-AAM) while adding no second `list` role."

requirements-completed: [REQ-164-27, REQ-164-28, REQ-164-29, REQ-164-30, REQ-164-31, REQ-164-32, REQ-164-33, REQ-164-34, REQ-164-35, REQ-164-36, REQ-164-37, REQ-164-38, REQ-164-39]

# Metrics
duration: ~90min
completed: 2026-09-17
---

# Phase 164 Plan 05: Infinite Scroll / Bidirectional Windowing Summary

**Replaced FansubVersionBrowser's "Weitere Episoden und Versionen laden" button with a hand-rolled, bidirectional, bounded-window infinite scroll (3-page DOM window, 6-page data cache, measured-height spacers, cache-hit/cache-miss backward restoration) built as an isolated `useWindowedEpisodePages` hook with its own unit-test suite.**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-09-17
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `useWindowedEpisodePages.ts`: the bounded bidirectional windowing engine. `DOM_WINDOW_SIZE=3` mounted pages; `CACHE_MAX_PAGES=6` page-data cache (never evicts an actively-windowed page); spacer bookkeeping via a `reportPageHeight` callback continuously fed by the consuming component's `ResizeObserver`; cache-hit backward restoration with zero network requests plus a computed `scrollAnchorAdjustment` delta; cache-miss backward restoration re-fetches using the page's originally-stored `cursorUsedToFetch` (never a client-invented cursor, per threat T-164-09); independent `forwardError`/`backwardError`/`forwardLoading`/`backwardLoading`; `showEndMarker` gated on more than one page ever having loaded; `resetForFilter` performs a full atomic reset (cache/window/spacers/errors cleared) and immediately fetches page 1 of the new filter, sharing the same single AbortController as forward/backward loads. 8 passing unit tests cover every must-have behavior from the plan.
- `FansubVersionBrowser.tsx`: fully driven by the hook now — `dataState`/`loadMoreState`/`loadMore`/the local `requestRef` are gone (grep for `dataState` returns 0). Top/bottom `<div>` sentinels (`data-testid="top-sentinel"`/`"bottom-sentinel"`, `aria-hidden`) drive `loadPrevious`/`loadNext` automatically; evicted pages render as height-preserving spacer `<div>`s; `LoadingState compact`/`ErrorState`/`EmptyState variant="inline"` handle the D-36/D-37/D-38 directional states with the exact German copy from 164-UI-SPEC.md; a `useLayoutEffect` applies `scrollAnchorAdjustment` via `window.scrollBy` before paint; `overflow-anchor: auto` added to `.episodeList` as a defense-in-depth native-browser aid. `switchTo` now calls `windowing.resetForFilter` instead of owning its own fetch, while still managing its own `switchState` (dimming/aria-busy) exactly as before. File stayed at 362 lines (cap: 450).
- `FansubVersionBrowser.windowing.test.tsx` (new, RTL + manual `IntersectionObserver` mock): proves (a) a 4th loaded page evicts the 1st into a spacer, bounding the DOM window to 3; (b) firing the top sentinel restores the evicted page with zero additional network calls; (c) an episode expanded before eviction is still expanded after being scrolled back into view (state keyed by `episode_id`, never touched by the hook); (d) a rejected forward load leaves all rendered episodes visible and shows a retryable `ErrorState`, which succeeds on retry. A 5th test proves a filter switch aborts an in-flight forward load via the hook's shared `AbortController`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build useWindowedEpisodePages** - `d92587a0` (feat)
2. **Task 2: Wire the windowing hook into FansubVersionBrowser** - `e5714aae` (feat)

## Files Created/Modified
- `frontend/src/components/fansubs/useWindowedEpisodePages.ts` - Bounded bidirectional windowing engine
- `frontend/src/components/fansubs/useWindowedEpisodePages.test.ts` - 8 unit tests covering every documented behavior
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - Wired to the hook, button removed, sentinels/spacers/directional states added, boundary-merge render step added
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` - `overflow-anchor: auto`, `.sentinel` (1px) class added
- `frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx` - New: eviction/restoration/expanded-state-stability/error-retry test suite
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - Updated 5 pre-existing tests that clicked the now-removed button to fire the bottom-sentinel mock instead; one test rewritten (see Deviations)
- `frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx` - Updated 1 pre-existing test (D-09 abort coverage) to fire the bottom-sentinel mock instead of clicking the removed button

## Decisions Made
See `key-decisions` in frontmatter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated two test files not in this plan's `files_modified` list because task 2's mandated button removal directly broke their assertions**
- **Found during:** Task 2 verification (`npx vitest run src/components/fansubs/FansubVersionBrowser.test.tsx`)
- **Issue:** The plan's objective explicitly mandates replacing the "Weitere Episoden und Versionen laden" button with sentinel-driven auto-loading (D-27). `FansubVersionBrowser.test.tsx` (6 tests) and `FansubVersionBrowser.groupSwitch.test.tsx` (1 test) asserted on that exact button via `screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' })` — a direct, unavoidable consequence of this task's own mandated change, not a pre-existing unrelated failure (Scope Boundary: "only auto-fix issues directly caused by the current task's changes" — this qualifies).
- **Fix:** Added a shared manual `IntersectionObserver` mock (same convention as `useNearViewportActivation.test.ts`) to both files and converted each button-click assertion to firing the bottom-sentinel mock instead, preserving each test's original behavioral intent unchanged (single-flight dedup, abort-on-filter-switch, retry-after-failure, race-condition-on-anime-change).
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx`
- **Verification:** `npx vitest run` — all 42 + 4 tests pass.
- **Committed in:** `e5714aae` (Task 2 commit)

**2. [Rule 1 - Bug] Rewrote one already-documented pre-existing-failing test whose premise is now structurally invalid**
- **Found during:** Task 2 verification
- **Issue:** `FansubVersionBrowser.test.tsx`'s "merges 125 variants over explicit pages..." test was already a documented pre-existing failure since 164-02 (`deferred-items.md`, reconfirmed unaffected-but-still-broken in 164-04). Investigating it (as `deferred-items.md` explicitly asked "a future plan touching FansubVersionBrowser.tsx's pagination-loading logic" to do) revealed its premise: client-side merging of ALL versions of one artificially-huge (125-variant) episode split across many cursor pages, via the old `mergeEpisodes` function. This is structurally incompatible with the new bounded DOM window (D-30): a page containing "half" of a merged super-episode must stay independently evictable, and merging across the *entire* fetch history (not just the currently-windowed pages) would violate the bounded-cache invariant.
- **Fix:** Rewrote the test as "laedt mehrere eigenstaendige Episoden ueber Cursor-Pages hinweg..." — covering the same real aspects (group-switch abort/refetch, cursor continuation across multiple pages, expanded-state stability across a page load, end-of-list marker) using multiple genuinely-distinct episodes instead of one artificially split super-episode. Separately, added a `computeBoundaryMergedRenderPlan()` render-time step to `FansubVersionBrowser.tsx` (see key-decisions) so a *genuinely* boundary-split episode (the realistic case: one episode's variant rows legitimately spanning exactly two adjacent pages, exercised by the still-passing "deduplicates variants only inside the same canonical episode" test) still renders correctly with its full version list, scoped to the currently-windowed pages only.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.tsx`
- **Verification:** `npx vitest run` — the rewritten test and the still-passing boundary-merge test (`deduplicates variants only inside the same canonical episode`) both pass.
- **Committed in:** `e5714aae` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed three `react-hooks/refs` lint errors (ref mutation during render)**
- **Found during:** Task 2 verification (`npx eslint src/components/fansubs`)
- **Issue:** `useWindowedEpisodePages.ts` mutated `ref.current` directly during render (`coreRef.current = core`, `loadNextRef.current = loadNext`, `loadPreviousRef.current = loadPrevious`) — forbidden by the project's `react-hooks/refs` ESLint rule (React Compiler assumption: refs may only be written outside render).
- **Fix:** Moved each assignment into its own `useEffect(() => { ref.current = value })` (no dependency array — runs after every commit, before any subsequent user interaction), preserving identical runtime behavior.
- **Files modified:** `frontend/src/components/fansubs/useWindowedEpisodePages.ts`
- **Verification:** `npx eslint src/components/fansubs` exits clean; all 8 hook unit tests still pass.
- **Committed in:** `d92587a0` (Task 1 commit, amended before Task 2's commit since the fix was found during Task 2's verification pass but belongs to Task 1's file)

**4. [Rule 3 - Blocking] Added `orderedPageIds` to the hook's return value**
- **Found during:** Task 2 implementation (`npx tsc --noEmit`)
- **Issue:** `FansubVersionBrowser.tsx` needs the full page-fetch-order sequence (not just `domWindowPageIds` or `pages`) to correctly interleave rendered page-groups and spacer divs in the right visual order — the hook's Task 1 return shape didn't expose it, causing a real type error.
- **Fix:** Exposed `core.orderedPageIds` as `orderedPageIds` on the hook's return object (already computed internally, zero additional cost).
- **Files modified:** `frontend/src/components/fansubs/useWindowedEpisodePages.ts`
- **Verification:** `npx tsc --noEmit` exits with only the pre-existing, unrelated `AnimePageProps` error.
- **Committed in:** `d92587a0` (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (2 Rule 1 test-compatibility fixes required by this task's own mandated UI change, 1 Rule 1 lint-compliance fix, 1 Rule 3 blocking type fix). No scope creep beyond what this task's own changes directly necessitated.
**Impact on plan:** All auto-fixes were either required to keep pre-existing test coverage meaningful after the mandated button removal, or were direct blockers to completing Task 2 as specified. No production behavior outside the plan's stated objective was added or removed.

## Issues Encountered
- During root-cause investigation of the "merges 125 variants" pre-existing failure, I discovered the test's actual premise depended on a real (if rare) backend characteristic: Phase 163's cursor paginates over `(episode_number, episode_id, variant_id)` rows, not whole episodes, so an episode with more variants than `row_limit` (24) can legitimately have its variant list split across two adjacent cursor pages. I verified this is still handled correctly under the new bounded-window architecture by keeping the still-passing "deduplicates variants only inside the same canonical episode" test (which exercises exactly this real scenario with 2 pages, not the artificial 125-variant/6-page scenario) and adding the `computeBoundaryMergedRenderPlan()` step described above.
- One safe, read-only verification step during this investigation: I temporarily swapped `FansubVersionBrowser.tsx`/`FansubVersionBrowser.test.tsx` to their pre-164-05 (`HEAD~1`) content via `Read`+`Write` (captured full current content first), ran the single failing test in isolation to confirm ground truth, then restored the exact current file content from the captured `Read` output. No `git stash`/`git clean`/`git reset` was used at any point; no uncommitted work was at risk since the captured content was restored byte-for-byte before continuing.

## User Setup Required

None - no external service configuration, no runtime restart required. All changes are pure frontend hook/component/CSS/test files; the frontend container continued running throughout (all verification was `vitest`/`tsc`/`eslint`, run inside the container against the bind-mounted source).

## Next Phase Readiness
- `useWindowedEpisodePages.ts` is the canonical bounded-windowing state machine for `/anime/[id]`'s episode list, fully decoupled from `FansubVersionBrowser.tsx`'s rendering layer and independently unit-tested.
- `FansubVersionBrowser.tsx` at 362 lines has headroom under the 450-line cap for any follow-up UI polish.
- Full repo-wide `npx vitest run` (frontend) confirms no regressions beyond the two already-documented, unrelated pre-existing failures in `cssCustomProperties.guard.test.ts` (line-number drift, logged in `deferred-items.md` since 164-04, not touched by this plan).
- No blockers for subsequent phase-164 plans.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-17*

## Self-Check: PASSED

All 7 created/modified plan files plus the SUMMARY itself verified present on disk;
both task commit hashes (`d92587a0`, `e5714aae`) verified present in `git log --oneline --all`.
