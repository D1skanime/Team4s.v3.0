---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 09
subsystem: testing
tags: [react, vitest, testing-library, fansubs, watchlist, pagination, formfield, hooks]

# Dependency graph
requires:
  - phase: 192-03
    provides: FansubVersionBrowser's server-filtered group-switch/windowing behavior (D-01..D-10)
  - phase: 192-08
    provides: Zweck-Token-basierte Stack/Cluster/SplitLayout-Aufrufstellen in denselben Dateien
provides:
  - "useFansubGroupSwitch hook: directly-testable switchTo/updateFansubSelection/resolveGroupSlugForFetch/resolveActiveFansubGroupID, extracted from FansubVersionBrowser"
  - "useWatchlistAction hook: directly-testable checkStatus/handleToggle, extracted from WatchlistAddButton"
  - "toggleEpisodeExpansion: pure, directly-testable episode-expand reducer"
  - "Established renderHook-based direct-call pattern for components that internally use hooks (useMemo/useId) and therefore cannot be called as a bare function outside render"
affects: [192-10, 192-final-verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Direct logic extraction: business logic behind a click handler lives in an exported hook/function, tested via renderHook+act or a plain function call, never via fireEvent/userEvent"
    - "Component(props) + elements()-tree-walk + direct onClick invocation for trivial one-line delegation (no render, no DOM click) -- for hook-free components"
    - "Component(props) called INSIDE renderHook for components that use React hooks internally (useMemo, useId) but have no exported hooks-using inner variant to import by name"

key-files:
  created:
    - frontend/src/components/fansubs/useFansubGroupSwitch.ts
    - frontend/src/components/watchlist/useWatchlistAction.ts
  modified:
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.tsx
    - frontend/src/components/watchlist/WatchlistAddButton.test.tsx
    - frontend/src/components/fansubs/FansubGroupPicker.test.tsx
    - frontend/src/components/ui/Pagination.test.tsx
    - frontend/src/components/ui/FormField.test.tsx

key-decisions:
  - "FansubVersionBrowser's windowing-hook seed value (initial activeFansubSlug for useWindowedEpisodePages) is computed via a small inline pre-computation in the component, since useWindowedEpisodePages must be created before useFansubGroupSwitch can supply its live resetForFilter-dependent state, and useFansubGroupSwitch itself needs that resetForFilter reference as a constructor parameter."
  - "FormField.test.tsx's disabled-Switch test did NOT need the render()-based exception the plan allowed for -- Switch is fully controlled with no internal state, so its real internal click handler could be materialized and invoked directly."
  - "Pagination.tsx delegates internally to a non-exported PagesPagination/LoadMorePagination variant that uses useMemo -- calling it as a bare function outside render throws 'Invalid hook call', so the direct-call technique runs inside @testing-library/react's renderHook to provide a real hook-dispatch context instead of a DOM render."
  - "One existing test ('blocks both actions until status resolves, ignoring the old SSR hint') intentionally kept its render()+fireEvent.click form -- it proves disabled-gating sequencing and the ignored initiallyInWatchlist SSR-hint prop, neither of which the isolated useWatchlistAction hook can express (the hook doesn't even accept that prop)."

requirements-completed: [Befund-25]

# Metrics
duration: 32min
completed: 2026-11-04
---

# Phase 192 Plan 09: Keine Klick-Simulationstests, direkte Logik-Tests statt fireEvent/userEvent Summary

**Extracted FansubVersionBrowser's group-switch/episode-toggle and WatchlistAddButton's add/remove logic into two new directly-testable hooks (`useFansubGroupSwitch`, `useWatchlistAction`), then converted every fireEvent.click/userEvent.click assertion across six files to either a direct hook call (business logic) or a direct Component(props)+onClick invocation (trivial delegation).**

## Performance

- **Duration:** 32 min
- **Started:** 2026-11-04T12:37:59Z (first file-touching commit)
- **Completed:** 2026-11-04T13:05:09Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- `useFansubGroupSwitch.ts` exports `resolveActiveFansubGroupID`, `resolveGroupSlugForFetch`, `toggleEpisodeExpansion`, and the `useFansubGroupSwitch` hook (selectedSlug/switchState/activeFansubGroupID/updateFansubSelection/switchTo) -- all previously trapped inside `FansubVersionBrowserContent`'s closure -- with zero behavior change (full 56-test file still green, `wc -l` 355 lines, down from 399).
- `useWatchlistAction.ts` exports the `useWatchlistAction` hook (status/isSubmitting/message/isError/checkStatus/handleToggle), previously trapped inside `WatchlistAction`'s closure, with zero behavior change (full 38-test file still green, `WatchlistAddButton.tsx` shrank from 128 to 69 lines).
- Six fireEvent.click/userEvent.click-based tests across `FansubVersionBrowser.test.tsx` and `WatchlistAddButton.test.tsx` that actually proved business logic (D-07 refetch slug, D-02 query-param preservation, episode-toggle reducer, watchlist delete/error-path) were rewritten to call the extracted hook/function directly via `renderHook`/`act` or a plain call -- zero `render()`+`fireEvent` left in those specific assertions.
- Ten new direct-call tests added (4 for `useFansubGroupSwitch`/`toggleEpisodeExpansion`, 6 for `useWatchlistAction`) covering states and no-op guards (isSubmitting, stale-session) that were previously unreachable or only indirectly provable through a DOM click.
- Three trivial-delegation click tests (`FansubGroupPicker`'s onSelect, `Pagination`'s onPageChange/onShowMore/onShowLess across 4 assertions, `FormField`'s disabled-Switch passthrough) converted to `Component(props)` + found-`onClick`-prop invocation, with zero production-code changes to any of the three files.
- Established and documented a new technique variant: calling a component inside `renderHook` when that component (or an internally-delegated, non-exported variant) uses React hooks (`useMemo`, `useId`) and therefore cannot be called as a bare function outside of a render context.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract FansubVersionBrowser's group-switch/episode-toggle logic; convert its tests** - `5601c56f6` (feat)
2. **Task 2: Extract WatchlistAddButton's add/remove logic into useWatchlistAction; convert its tests** - `4092262b9` (feat)
3. **Task 3: Convert trivial-delegation click tests (FansubGroupPicker, Pagination, FormField)** - `a0471d0b9` (test)
4. **Deviation fix: correct umlauts in newly-authored comments/test names** - `7ce540eb4` (fix)

**Plan metadata:** commit pending (this document)

## Files Created/Modified

- `frontend/src/components/fansubs/useFansubGroupSwitch.ts` - New hook + three standalone pure functions extracted from `FansubVersionBrowser.tsx`
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` - Thinner: delegates group-switch state/logic to the new hook, keeps only rendering + the popstate listener wiring
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` - D-07/D-02 tests + episode-toggle assertion converted to direct calls; 10 new direct-call tests added
- `frontend/src/components/watchlist/useWatchlistAction.ts` - New hook extracted from `WatchlistAddButton.tsx`'s `WatchlistAction`
- `frontend/src/components/watchlist/WatchlistAddButton.tsx` - `WatchlistAction` is now a thin render wrapper around the new hook
- `frontend/src/components/watchlist/WatchlistAddButton.test.tsx` - Two existing tests converted to direct hook calls; 6 new direct-call tests added
- `frontend/src/components/fansubs/FansubGroupPicker.test.tsx` - onSelect test converted to `Component(props)`+`onClick` invocation (no production change)
- `frontend/src/components/ui/Pagination.test.tsx` - Klick-Modus (2 tests) and Nachlade-Modus (split into 4 tests: 2 render-only, 2 direct-call) converted (no production change)
- `frontend/src/components/ui/FormField.test.tsx` - Disabled-Switch test converted to direct `Switch` click-handler invocation (no production change)

## Decisions Made

- **Windowing-hook seeding order (circular-dependency resolution):** `useWindowedEpisodePages` needs an `activeFansubSlug` seed value at mount time, but that value is derived from `useFansubGroupSwitch`'s `activeFansubGroupID`, which in turn needs `useWindowedEpisodePages.resetForFilter` as a constructor parameter. Resolved by computing the mount-time seed slug inline in the component (via the exported, reusable `resolveActiveFansubGroupID`) *before* either hook call, while `useFansubGroupSwitch` independently (re)computes its own live `activeFansubGroupID` every render from its own `selectedSlug` state -- no behavior difference from the pre-refactor code, since the original also only used the mount-time value for the windowing hook's ref seed.
- **FormField/Switch disabled-passthrough test needed no exception:** the plan explicitly allowed falling back to `render()`+`fireEvent.click` for this one test if the direct-call technique didn't fit cleanly. It did fit: `Switch` is fully controlled (no internal state, no hooks), so its real `<button>`'s `onClick` (the actual `handleClick` closure, gated on `disabled`) could be materialized and invoked directly, proving the exact same "no click effect when disabled" guarantee without any DOM click.
- **Pagination's internal `useMemo` forced a renderHook variant of the direct-call technique:** `Pagination` delegates to a non-exported `PagesPagination`, which calls `useMemo`. Calling it as a bare function (the pattern used elsewhere in this codebase for hook-free components) throws "Invalid hook call" outside of a React render. The fix: perform the entire `Pagination(props)` call + `elements()` walk inside `@testing-library/react`'s `renderHook(() => ...)` callback, which executes during a genuine React render pass (hooks dispatcher active) without needing any DOM/JSDOM rendering of the actual markup.
- **One Watchlist test intentionally NOT converted:** `'blocks both actions until status resolves, ignoring the old SSR hint'` keeps its `render()`+`fireEvent.click` form. Its real point is proving that the `initiallyInWatchlist` SSR-hint prop is ignored until the client-side status check resolves -- `useWatchlistAction` doesn't even accept that prop (it's dead on the component side too), so there is no isolated-hook equivalent to drive; converting it would silently drop the coverage it exists for.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Unstable `isCurrentSession` reference caused an infinite render loop in new hook tests**
- **Found during:** Task 2 (writing direct `useWatchlistAction` tests)
- **Issue:** Passing an inline `isCurrentSession: () => true` literal directly inside a `renderHook(() => useWatchlistAction({...}))` callback creates a new function reference every render; since `checkStatus` is a `useCallback` depending on `isCurrentSession`, and the mount effect depends on `checkStatus`, this caused an actual infinite effect-fire/state-update loop, timing out several new tests at 5000ms.
- **Fix:** Introduced a single module-level `alwaysCurrentSession` constant (and, for the one test needing a mutable session flag, a stable `const isCurrentSession = () => isCurrent` declared outside the `renderHook` callback) so the reference stays stable across re-renders.
- **Files modified:** `frontend/src/components/watchlist/WatchlistAddButton.test.tsx`
- **Verification:** All 38 tests in the file pass with no act-loop warnings or timeouts.
- **Committed in:** `4092262b9` (Task 2 commit)

**2. [Rule 2 - Missing critical] Correct German umlauts missing from newly-authored comments/test names**
- **Found during:** post-Task-3 self-review against CLAUDE.md's "Sprachqualität"/"Code-Kommentare" rules
- **Issue:** Several comments and test-description strings I wrote in this plan's three task commits used ASCII substitution (ae/oe/ue/ss) instead of the mandatory ä/ö/ü/ß.
- **Fix:** Corrected every line I personally authored in this plan's six touched files (new comments, extended/rewritten test names) to use proper umlauts/ß. Pre-existing, untouched comments in the same files (confirmed via per-commit diff) were deliberately left as-is -- not a scope-creep cleanup of the broader, already-documented repo-wide ASCII-substitution backlog.
- **Files modified:** all six touched files plus the two new hook files (`useFansubGroupSwitch.ts`, `useWatchlistAction.ts`, `FansubVersionBrowser.tsx`, `FansubVersionBrowser.test.tsx`, `WatchlistAddButton.test.tsx`, `Pagination.test.tsx`, `FormField.test.tsx`)
- **Verification:** All 138 tests across the five plan-verification files still pass after the fix; `tsc --noEmit` clean for these files; `eslint` clean for all nine touched/created files.
- **Committed in:** `7ce540eb4` (standalone fix commit, after the three task commits)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing-critical/convention compliance)
**Impact on plan:** Both auto-fixes were necessary for correctness (Rule 1: a real infinite-loop bug in test code) and project-mandated language quality (Rule 2). No scope creep -- pre-existing ASCII-umlaut debt elsewhere in these files was explicitly left untouched.

## Issues Encountered

- Calling a component that internally uses a React hook (`useMemo` in `Pagination`'s delegate, `useId` in `FormField`) as a bare, unwrapped function throws "Invalid hook call" -- discovered empirically via a throwaway probe test before committing to the technique. Resolved by wrapping the direct call inside `@testing-library/react`'s `renderHook`, which provides a real (but DOM-render-free for the caller's purposes) hooks-dispatch context. Documented as an established variant of the existing `Component(props)` + `elements()`-walk technique for future plans that hit the same constraint.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 192-10 (Befund 26, Effekt-Tokens) is unblocked and independent of this plan's changes (touches only CSS token files and the five named composed-component `.module.css` files, not the JS/TS logic touched here).
- The phase's final verification plan (ex-192-07) can now proceed once 192-10 is also complete, per the binding order in `192-CONTEXT.md`'s `addendum_2026-11-04b`.
- The `Component(props)` + `renderHook` variant established here is reusable for any future hook-using component that needs a direct-call test (no new infrastructure needed).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 9 created/modified source files and this SUMMARY.md verified present on disk; all 4 commit hashes (`5601c56f6`, `4092262b9`, `a0471d0b9`, `7ce540eb4`) verified present in `git log --oneline --all`.
