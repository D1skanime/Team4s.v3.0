---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
plan: 03
subsystem: testing
tags: [vitest, typescript, react-testing-library, tdd-red, fansub, episodes]

# Dependency graph
requires:
  - phase: 163-02
    provides: "fansub query param + episode_count response field (Go DTO + OpenAPI), consumed here as the frontend type contract"
provides:
  - "PublicGroupedEpisodesOptions.fansub / PublicGroupedEpisodesResponse.data.episode_count type contracts, mirrored 1:1 from the Go DTO"
  - "getGroupedEpisodes forwards fansub as a query parameter (GREEN, test-first glue fix)"
  - "resolveActiveFansubSlug: locked, unimplemented SSR slug-resolution contract (0/1-group, unmatched-slug, matching-slug, dedupe cases) for Plan 163-04 to implement"
  - "19 locked RED test cases across 4 files documenting D-07..D-16's exact frontend contract before any production code changes"
affects: [163-04, 163-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unimplemented-stub RED baseline: a new export throws a documented Error instead of using real logic, so RED tests fail for that one documented reason (not a module-resolution crash affecting unrelated tests)"
    - "Per-click mockResolvedValueOnce + short-timeout waitFor(..., { timeout: 500 }) to force a fast, clean RED (timeout) when today's production code never issues the fetch the test expects, instead of the default 5s wait"

key-files:
  created:
    - frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx
  modified:
    - frontend/src/types/episodeVersion.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/fansub-summary.ts
    - frontend/src/lib/fansub-summary.test.ts
    - frontend/src/lib/api.episode-versions.test.ts
    - frontend/src/app/anime/[id]/page.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.test.tsx
    - frontend/src/app/anime/[id]/page.performance.test.ts

key-decisions:
  - "page.performance.test.ts (out of this plan's files_modified list) needed two mock-literal fixes (episode_count: 0) because it is broken purely by the new REQUIRED type field, not by any behavior change. Fixed as Rule 3 (blocking issue), test-only, no assertions changed."
  - "The two 'unmatched slug' / 'single-group' non-forwarding tests in page.test.tsx pass today by accident (current page.tsx never forwards fansub at all, so 'no fansub key' is trivially true regardless of scenario) — exactly the tension the plan's own Task 2 action text anticipated and asked to be documented rather than forced. Only the 'matching slug IS forwarded' test is genuinely RED today; the two others become meaningful once Plan 163-04 implements real resolveActiveFansubSlug-based forwarding."
  - "For FansubVersionBrowser.test.tsx items 4-6 (Testfall E/F, Testfall I, 125-variant pagination) and the new sibling file, RED is proven via a short-timeout (500ms) waitFor(() => expect(getGroupedEpisodes).toHaveBeenCalledTimes(n)) rather than content assertions alone, because today's chip-click/popstate handlers never call getGroupedEpisodes at all — content-only assertions (e.g. exact 'Variante 7' text) would otherwise pass by accident via the still-present old client-side filter, exactly the failure mode the plan's own action text for item 4 flagged as a risk."
  - "npm run typecheck is fully clean (0 errors), NOT showing the episodeCount-prop errors the plan's <verification> section anticipated: page.test.tsx's shallow-tree elements() helper types props as Record<string, unknown>, so accessing browser?.props.episodeCount is a valid (if untyped) property access, not a type error. Documented as a positive discrepancy from the plan's own expectation, not a defect."

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-09-17
---

# Phase 163 Plan 03: Frontend RED-Test Baseline Summary

**19 new/corrected failing Vitest cases (6 fansub-summary.ts, 3 page.tsx, 6 FansubVersionBrowser.test.tsx inversions/corrections, 4 new sibling file) lock the exact D-07..D-16 frontend contract — fansub/episode_count type additions, a resolveActiveFansubSlug stub, and one test-first glue fix — with zero production behavior changes to page.tsx or FansubVersionBrowser.tsx.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-09-17
- **Tasks:** 3/3 completed
- **Files modified:** 8 (7 planned + 1 out-of-scope Rule-3 fix), 1 file created

## Accomplishments

- Extended `PublicGroupedEpisodesOptions` with `fansub?: string` and `PublicGroupedEpisodesResponse['data']` with required `episode_count: number`, mirroring the Go DTO/OpenAPI changes from Plan 163-02 exactly.
- `getGroupedEpisodes` now forwards `fansub` as a query parameter — genuinely test-first: wrote the failing assertion, confirmed it failed against the real current `api.ts` (`expected null to be 'animeownage'`), then applied the one-line fix and confirmed GREEN, per the plan's glue-code exception.
- Added `resolveActiveFansubSlug` to `fansub-summary.ts` as a deliberately unimplemented stub (`throw new Error(...)`) plus 6 new test cases (0/1 group, unmatched slug, matching slug on a 2+-group set, dedupe-then-third-group) — all 6 fail today for the documented thrown-error reason, no unrelated tests broken.
- `page.test.tsx`: replaced the D-16 anime.episodes-fallback assertions with a "browser must not render + neutral error text" assertion (fails today); replaced the `anime.episodes.length`-derived `Episoden (30)` heading assertion with a new `episodeCount` prop check (fails today); added 3 new D-11 SSR-forwarding tests (matching-slug forwarding fails today; unmatched-slug and single-group non-forwarding tests pass today by coincidence, since nothing is forwarded at all yet — documented below).
- `FansubVersionBrowser.test.tsx`: inverted the two Phase-162 "no refetch on chip click / popstate" tests into "refetch DOES happen, with the target slug, no merge" tests (D-07/D-09); removed the now-contradictory D-15 `noVersionHint` text assertion; rewrote Testfall E/F, Testfall I, and the 125-variant pagination test to mock one resolved response per group-switch click instead of relying on the old client-side filter, with short-timeout `waitFor` calls so today's genuine "no fetch on click" RED state is fast and clean rather than a 5s default timeout.
- New sibling file `FansubVersionBrowser.groupSwitch.test.tsx` (149 lines) covers D-08 (old list stays visible + `aria-busy` while a switch is pending), D-09 (a group switch aborts an in-flight `loadMore` request), D-10 (a failed switch shows an alert + "Erneut versuchen" without mixing in old data), and Pflichtfall G (Alle→AnimeOwnage→ProjectMessiah→Alle, no cross-step bleed, using a locally extended 3-group fixture).
- Full targeted verification run (`fansub-summary.test.ts api.episode-versions.test.ts page.test.tsx FansubVersionBrowser.test.tsx FansubVersionBrowser.groupSwitch.test.tsx`): 19 failed (exactly the new/corrected RED assertions) / 63 passed (every pre-existing assertion in all 5 files, including the untouched Tags/Genre/CSS/D-04-passthrough blocks in `page.test.tsx`). Full-suite run confirms zero collateral regressions: 21 total failures = the same 19 plus the 2 pre-existing, documented `cssCustomProperties.guard.test.ts` failures unrelated to this phase.
- `wc -l`: `FansubVersionBrowser.test.tsx` 364 lines, `FansubVersionBrowser.groupSwitch.test.tsx` 149 lines — both well under the 450-line CLAUDE.md cap.
- `npm run typecheck`: 0 errors (see key-decisions — a positive discrepancy from the plan's own anticipated `episodeCount`-prop gap).
- No production behavior touched: `git diff` confirms `page.tsx` and `FansubVersionBrowser.tsx` are byte-for-byte unchanged by this plan.

## Task Commits

Each task was committed atomically:

1. **Task 1: Contracts — types, api.ts forwarding, shared SSR slug-resolution helper (RED where testable)** - `70d1f813` (test)
2. **Task 2: page.tsx RED — SSR fansub forwarding (D-11), fallback removal (D-16), episodeCount-as-prop (D-12)** - `dc9e604e` (test)
3. **Task 3: FansubVersionBrowser RED — invert Phase-162 no-refetch tests, remove D-15 dead-code assertion, new sibling file for D-07..D-10/G** - `d1fad14b` (test)

**Plan metadata:** recorded separately after this SUMMARY (see final commit).

## Files Created/Modified

- `frontend/src/types/episodeVersion.ts` — `PublicGroupedEpisodesOptions.fansub?: string`; `PublicGroupedEpisodesResponse['data'].episode_count: number` (required).
- `frontend/src/lib/api.ts` — `getGroupedEpisodes` forwards `fansub` as a query param (one-line, test-first, GREEN).
- `frontend/src/lib/fansub-summary.ts` — new `resolveActiveFansubSlug` export, unimplemented stub (throws), documented contract for Plan 163-04.
- `frontend/src/lib/fansub-summary.test.ts` — 6 new RED test cases for `resolveActiveFansubSlug`.
- `frontend/src/lib/api.episode-versions.test.ts` — 1 new test proving `fansub` forwarding (test-first RED→GREEN).
- `frontend/src/app/anime/[id]/page.test.tsx` — D-16 fallback-removal correction, D-12 `episodeCount`-prop correction, 3 new D-11 SSR-forwarding tests.
- `frontend/src/components/fansubs/FansubVersionBrowser.test.tsx` — D-15 assertion correction, D-07/D-09 test inversions, Testfall E/F/I + 125-variant test rewritten for server-refetch semantics, `publicPage` helper gains `episode_count`.
- `frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx` (new) — D-08/D-09/D-10/Pflichtfall-G RED coverage.
- `frontend/src/app/anime/[id]/page.performance.test.ts` — out-of-scope Rule-3 fix (`episode_count: 0` added to 2 mock literals broken by the new required type field; no assertions changed).

## Decisions Made

See `key-decisions` in frontmatter above (page.performance.test.ts Rule-3 fix; accidental-pass tension in page.test.tsx's non-forwarding tests; short-timeout-waitFor RED strategy for FansubVersionBrowser's click-driven tests; typecheck-clean discrepancy from the plan's own expectation).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `page.performance.test.ts` broken by the new required `episode_count` field, though not in this plan's `files_modified` list**
- **Found during:** Task 1, running `npx tsc --noEmit` after adding the required `episode_count` field to `PublicGroupedEpisodesResponse['data']`
- **Issue:** `PublicGroupedEpisodesOptions`/`PublicGroupedEpisodesResponse` are also used by `page.performance.test.ts` (not listed in this plan's files_modified), whose two `groupedMock.mockResolvedValue({...})` literals lacked the new required field, producing `TS2741` errors.
- **Fix:** Added `episode_count: 0` to both literals. No assertion, test case, or expected value was added, changed, or removed — purely mechanical type-completion.
- **Files modified:** `frontend/src/app/anime/[id]/page.performance.test.ts`.
- **Verification:** `npx tsc --noEmit` clean; `npx vitest run "src/app/anime/[id]/page.performance.test.ts"` unchanged pass count (6/6 tests, all green before and after).
- **Committed in:** `70d1f813` (Task 1 commit).

---

**Total deviations:** 1 auto-fixed (blocking type-completion, out-of-plan-scope file).
**Impact on plan:** Necessary side effect of the required `episode_count` field addition (itself explicitly required by the plan, matching the Go DTO). No scope creep — no behavior or assertion changed, only added a missing literal field.

## Documented Tensions (not deviations — plan-anticipated, resolved as instructed)

1. **`page.test.tsx`'s two non-forwarding D-11 tests pass today "by accident."** The plan's own Task 2 action text for item 4 explicitly anticipated this ("this call currently happens to already match the CURRENT no-fansub behavior by accident") and instructed documenting rather than forcing an artificial failure. Verified: only "D-11: reicht den ... aufgeloesten Slug ... durch" (matching-slug case) is genuinely RED today; "D-05/D-11: eine fremde/unbekannte Fansub-Slug..." and "162 D-02/163 D-11: bei genau einer Fansub-Gruppe..." both pass today, because current `page.tsx` never forwards `fansub` under any circumstance yet. They become meaningful regression guards once Plan 163-04 implements real forwarding.
2. **`FansubVersionBrowser.test.tsx` items 4-6 (Testfall E/F, Testfall I, 125-variant test) fail via `waitFor` timeout, not content mismatch.** The plan's action text for these items explicitly permitted "hang/timeout or fail their waitFor — acceptable, document the exact failure mode" as an alternative to a clean content-based failure, because reusing `assertGroup`'s exact string checks (`'Variante 7'`/`'Variante 9'`) would otherwise pass by accident via the still-present old client-side filter. Chose the `waitFor(..., { timeout: 500 })`-on-call-count strategy explicitly to keep the RED failure fast (500ms) and unambiguous rather than the default 5s timeout.
3. **`npm run typecheck` shows 0 errors, not the `episodeCount`-prop gap the plan's `<verification>` section anticipated.** `page.test.tsx`'s shallow-tree `elements()` helper types `props` as `Record<string, unknown>`, so `browser?.props.episodeCount` is a valid (untyped) property access at compile time, not a `TS2339` error. This is a positive discrepancy (cleaner typecheck than expected), not a defect — the runtime assertion (`toBe(0)` vs. actual `undefined`) still correctly fails at test time.

## Issues Encountered

None beyond the documented deviation and tensions above, all resolved within this plan per the plan's own explicit guidance.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The exact frontend contract for Plan 163-04 (GREEN implementation) is now locked in 19 failing test cases plus the `fansub`/`episode_count` type additions and the `resolveActiveFansubSlug` signature/contract.
- Plan 163-04 must: implement `resolveActiveFansubSlug`'s real dedupe/match logic; wire `page.tsx` to call it and forward the resolved slug into `getGroupedEpisodes`, replace the D-16 fallback with a neutral error state, and move the `episodeCount` heading into `FansubVersionBrowser` as a new prop; implement the group-switch refetch (abortable, wholesale-replace, dimmed/`aria-busy` old list, error+retry, popstate-triggers-refetch) in `FansubVersionBrowser.tsx`, removing the D-15 `noVersionHint`/`groupMatchedVersions` dead code.
- Two documented tensions above (non-forwarding tests passing "by accident" today; call-count-based RED strategy) are exactly the finish line Plan 163-04 must cross for the right reasons — re-running this plan's targeted verification command after 163-04's implementation is the fastest way to confirm all 19 assertions flip GREEN for the correct, mechanism-driven reason.
- No live container rebuild was needed or performed (test-only plan, no runtime code changed).

---
*Phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern*
*Completed: 2026-09-17*
