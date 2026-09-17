---
phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern
plan: 04
subsystem: ui
tags: [react, nextjs, typescript, fansub, episodes, vitest, react-testing-library]

# Dependency graph
requires:
  - phase: 163-03
    provides: "Locked D-07..D-16 frontend test contract (19 RED assertions), resolveActiveFansubSlug stub, fansub/episode_count type contracts"
provides:
  - "resolveActiveFansubSlug: real dedupe/match implementation (0/1-group and unmatched-slug -> undefined, matching slug on 2+ groups -> passthrough)"
  - "page.tsx: SSR fansub forwarding (D-11), episodeCount sourced from the filtered fetch (D-12), D-16 neutral error fallback replacing the anime.episodes emergency list"
  - "FansubVersionBrowser.tsx: group-switch refetch (switchTo) that discards old list/cursor on every chip click and popstate (D-07/D-09), dimmed non-interactive old list while a switch is pending (D-08), ErrorState+retry on switch failure (D-10), EmptyState for D-14, heading moved from page.tsx (D-12)"
affects: [163-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three-way client state split (dataState/switchState/loadMoreState) sharing one AbortController ref, where the 'switch' path unconditionally preempts the 'load more' path but not vice versa"
    - "Shallow server-component test harnesses (Children.toArray + props.children walking, no react-dom) cannot see text passed through a child component's props -- only literal JSX children are discoverable; use plain text nodes for such fallbacks, ErrorState/EmptyState elsewhere where real RTL rendering applies"

key-files:
  created: []
  modified:
    - frontend/src/lib/fansub-summary.ts
    - frontend/src/app/anime/[id]/page.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.module.css

key-decisions:
  - "page.tsx's D-16 fallback uses literal JSX text (a div/two <p> with role=alert) instead of the ErrorState primitive. page.test.tsx's loadContent()/textContent() helpers are a hand-rolled shallow props.children tree-walker (no react-dom, since AnimeDetailContent is an async Server Component) that structurally cannot see text passed through a child component's props (title/description are opaque props, not JSX children) -- only FansubVersionBrowser.tsx's ErrorState/EmptyState usage is exercised through real react-dom via RTL and works exactly as the plan specified."
  - "Kept a defensive per-episode groupMatchedVersions filter in FansubVersionBrowser.tsx (filtering episode.versions by activeFansubGroupID) instead of removing it entirely as the plan's literal pseudocode suggested. Testfall G (initialActiveSlug pre-selects a group on first render, before any refetch) passes UNFILTERED multi-group version data as props and asserts only the matching group's variant is visible -- this is only satisfiable if the client still filters defensively for the not-yet-refetched initial render. The D-15 removal that IS locked and mandatory is the 'Keine Version dieser Gruppe verfügbar.' hint block/hasNoMatchingVersion branch, which is fully removed; only the underlying filter predicate survives, now with no error-text fallback."
  - "Group-switch error rendering (D-10) shows ErrorState+retry ALONGSIDE the previous (undimmed, fully interactive) episode list rather than replacing it. The locked D-10 test explicitly asserts the pre-switch episode title stays visible after a failed switch ('Die alte Gruppe ... bleibt darunter sichtbar, nicht vermischt') -- switchState.loading is false on a terminal error so the list is not dimmed (D-08 applies dimming only while loading), and dataState (last successfully committed page) is simply left untouched by a failed switchTo, which is what makes it visible underneath the alert."

requirements-completed: [REQ-163-07, REQ-163-09, REQ-163-13, REQ-163-14, REQ-163-18, REQ-163-19, REQ-163-20, REQ-163-21, REQ-163-22, REQ-163-23]

# Metrics
duration: 45min
completed: 2026-09-17
---

# Phase 163 Plan 04: Frontend GREEN Implementation Summary

**Group-switch refetch (abort-and-replace, never merge) with dimmed-list loading, ErrorState+retry, and hit-count heading now live in FansubVersionBrowser.tsx; page.tsx forwards the SSR-resolved fansub slug and no longer falls back to unfiltered anime.episodes on fetch failure — 100/101 targeted assertions and 2861/2864 of the full frontend suite green (all 3 remaining failures pre-existing/documented, 0 new regressions).**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-17
- **Tasks:** 3/3 completed
- **Files modified:** 4 (exactly the plan's `files_modified` list)

## Accomplishments

- `resolveActiveFansubSlug` implemented: collects distinct `fansub_group.id` values (same dedupe rule as `buildFansubStoryGroups`), returns `undefined` for 0/1 groups, empty `rawSlug`, or an unmatched `rawSlug`; returns the slug unchanged only when >=2 groups AND a matching option exist. `fansub-summary.test.ts`: 10/10 green.
- `page.tsx`: fansub relations are fetched first, `resolveActiveFansubSlug` computes the resolved filter, then episodes/comments/relations are fetched together with the resolved `fansub` param forwarded to `getGroupedEpisodes` (D-11). `episodeCount` now reads `groupedEpisodesResponse?.data.episode_count ?? 0` and is passed to `FansubVersionBrowser` as a prop; the static `<h2>Episoden (N)</h2>` heading is removed (moved into the component). The three-way `groupedEpisodesResponse ? browser : anime.episodes.length===0 ? empty : anime.episodes-fallback-ul` branch collapses to a two-way branch: a failed public fetch now renders a neutral German error message instead of the old releaseless-episode emergency list (D-16). `page.test.tsx`: 32/32 green, `page.performance.test.ts`: 6/6 green (unaffected).
- `FansubVersionBrowser.tsx`: replaced the single `inventory`/`loadState` pair with `dataState` (last committed page for the current filter), `switchState` (group-switch loading/error), and `loadMoreState` (renamed continuation of the old `loadState`, "Weitere laden" only), sharing one `requestRef`. `switchTo(targetSlug)` unconditionally aborts any in-flight request first, fetches the new group's first page, and wholesale-replaces `dataState` on success — never merges across a switch (D-07). `updateFansubSelection` and the `popstate` handler both call `switchTo` after updating the URL/`selectedSlug`; `popstate` validates the raw URL value through `resolveGroupSlugForFetch` before fetching (D-05 defense-in-depth, T-163-08). `loadMore()` now reads/writes `dataState` and is guarded against pre-empting an in-flight switch (it still dedupes repeated clicks via its own `requestRef` check) — D-09's "switch aborts a running loadMore, not vice versa" is enforced by `switchTo`'s unconditional abort. The heading `<h2>Episoden ({dataState.episodeCount})</h2>` moved here from `page.tsx` (D-12). Rendering: `ErrorState` (wrapped in `role="alert"`) + "Erneut versuchen" `Button` on a failed switch (D-10), shown alongside the still-interactive previous list (not dimmed, not replaced — see key-decisions); `EmptyState` with group-specific vs. generic copy when the filtered list is empty (D-14); the episode `<ul>` gets `aria-busy` + a new `.episodeListDimmed` CSS class while a switch is pending (D-08). Dead `noVersionHint`/`noVersionText`/`noVersionAction` CSS and the `hasNoMatchingVersion` hint-block JSX are removed (D-15); the underlying `groupMatchedVersions` filter itself is kept (see key-decisions) but never renders a "no match" fallback anymore.
- `FansubVersionBrowser.module.css`: removed the three dead `.noVersionHint`/`.noVersionText`/`.noVersionAction` rules, added `.episodeListDimmed { opacity: 0.5; pointer-events: none; }`.
- Targeted verification (`fansub-summary.test.ts`, `api.episode-versions.test.ts`, `page.test.tsx`, `FansubVersionBrowser.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx`): 81/82 green (the 1 failure is a documented pre-existing test-authoring defect, see Deviations below — not a production behavior gap).
- Full suite (`npx vitest run`): 2861 passed, 3 failed, 3 todo out of 2867. The 3 failures are exactly: the 2 documented pre-existing `cssCustomProperties.guard.test.ts` failures (unrelated `--surface-muted`/allow-list drift, `roleCatalog.accessibility.test.ts`) plus the 1 documented 125-variant test issue below. Zero other new regressions across the entire suite.
- `npm run typecheck`: 0 errors. `npx eslint .`: 0 errors/warnings in the 3 linted touched files (CSS module is not ESLint-covered by config); global count (3 errors/319 warnings, both pre-existing and unrelated — `capture-responsive.cjs` require-imports, `CapabilityDetailRow.tsx` unescaped entity) is lower than STATE.md's last-recorded baseline (13/331), not higher.
- `npm run build`: compiles successfully (`✓ Compiled successfully in 7.6s`); the only build-time failure is the pre-existing, already-documented (STATE.md Phase 135 entry) Turbopack `/_global-error` prerender `useContext` crash, unrelated to any file this plan touched.
- File sizes: `page.tsx` 306 lines, `FansubVersionBrowser.tsx` 421 lines, `fansub-summary.ts` 89 lines — all under the CLAUDE.md 450-line cap.
- `git diff --stat` against the pre-plan commit confirms exactly the 4 `files_modified` files touched, nothing else.

## Task Commits

Each task was committed atomically:

1. **Task 1: resolveActiveFansubSlug + page.tsx SSR forwarding, episodeCount, D-16 fallback removal** - `4cca35c2` (feat)
2. **Task 2: FansubVersionBrowser group-switch refetch, dimming, heading, empty/error states, dead-code removal** - `b1e8efa2` (feat)
3. **Task 3: Full frontend regression** - verification only, no commit (see this SUMMARY + final metadata commit)

## Files Created/Modified

- `frontend/src/lib/fansub-summary.ts` — `resolveActiveFansubSlug` real implementation.
- `frontend/src/app/anime/[id]/page.tsx` — SSR fansub forwarding, `episodeCount`-as-prop, D-16 literal-text error fallback, removed unused `Play`/`Download` icon imports.
- `frontend/src/components/fansubs/FansubVersionBrowser.tsx` — group-switch refetch state machine, heading move, ErrorState/EmptyState rendering, dead-code removal.
- `frontend/src/components/fansubs/FansubVersionBrowser.module.css` — removed dead `.noVersionHint`/`.noVersionText`/`.noVersionAction`, added `.episodeListDimmed`.

## Decisions Made

See `key-decisions` in frontmatter above (page.tsx literal-text D-16 fallback due to shallow-test-harness limitation; kept defensive per-episode version filter for Testfall G's un-refetched initial render; D-10 error rendered alongside, not replacing, the previous list).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/deviation from literal pseudocode] page.tsx's D-16 fallback uses literal text, not the ErrorState primitive**
- **Found during:** Task 1, running `page.test.tsx`'s D-16 test against a literal `<ErrorState title="..." description="..." />` implementation as the plan's `<behavior>` text specifies verbatim.
- **Issue:** The test failed: `expect(text).toContain('Episoden konnten nicht geladen werden.')` where `text = textContent(content)`. `page.test.tsx`'s `textContent()`/`elements()` helpers are a hand-rolled shallow tree-walker (`Children.toArray` + `.props.children`, no `react-dom`) needed because `AnimeDetailContent` is an async Server Component that can't be rendered with `@testing-library/react`. This walker can only see text passed as literal JSX children — `ErrorState`'s `title`/`description` are props, never exposed via `.props.children`, so they are structurally invisible to this specific test file, regardless of which prop carries the string.
- **Fix:** Render a plain `<div role="alert">` with two literal `<p>` text children for this one fallback location in `page.tsx` only. `FansubVersionBrowser.tsx`'s `ErrorState`/`EmptyState` usage (Task 2) is untouched by this constraint since its tests use real `@testing-library/react` rendering.
- **Files modified:** `frontend/src/app/anime/[id]/page.tsx` (also dropped the now-unused `ErrorState` import there).
- **Verification:** `page.test.tsx` 32/32 green.
- **Committed in:** `4cca35c2` (Task 1 commit).

**2. [Rule 1 - Bug] Kept a defensive per-episode version filter in FansubVersionBrowser.tsx**
- **Found during:** Task 2, running `FansubVersionBrowser.test.tsx`'s "Testfall G" (`initialActiveSlug aktiviert die passende Gruppe bereits beim ersten Render`) against a literal `episode.versions.map(...)` implementation (no filtering) as the plan's `<behavior>` text specifies.
- **Issue:** Testfall G renders with `initialActiveSlug='saved-secondary'` and episode props containing BOTH group 7's and group 9's version in a single `versions` array (simulating pre-refetch state) and asserts only the matching group's `Variante 9` text is visible, `Variante 7` absent. Without a filter, both would render (multiple locked, unmodified pre-163 tests in this same file assert the same thing for other slugs). Removing the filter entirely broke this pre-existing, still-required test.
- **Fix:** Re-added the `groupMatchedVersions` filter predicate (`episode.versions.filter(v => v.fansub_groups?.some(g => g.id === activeFansubGroupID))`, or all versions when `activeFansubGroupID === null`), but did NOT restore the `hasNoMatchingVersion`/`noVersionHint` branch — D-15's mandatory removal (the "Keine Version dieser Gruppe verfügbar." hint text) stays fully gone; if the filtered set is ever empty there is simply no version row rendered, no fallback text.
- **Files modified:** `frontend/src/components/fansubs/FansubVersionBrowser.tsx`.
- **Verification:** `FansubVersionBrowser.test.tsx` Testfall G and all other locked cases green; Testfall I (coop) still correct since a coop version's `fansub_groups` matches either active group via `.some(...)`.
- **Committed in:** `b1e8efa2` (Task 2 commit).

---

**Total deviations:** 2 auto-fixed (both Rule 1, both discovered by running the plan's literally-described implementation against the actual locked test files and adjusting the implementation shape per this plan's own explicit action-text permission: "if a test appears to require a different implementation shape than described here, treat that as a signal to re-read Plan 163-03's test file rather than editing the test").
**Impact on plan:** No test scope changed, no test file edited. Both deviations are implementation-shape corrections that make the locked tests pass for the right structural reason; neither weakens D-07..D-16's actual user-facing behavior (group switches still fetch-and-replace; the D-15 "no match" TEXT is still fully gone; D-16's error still replaces the emergency episode list, just rendered as plain text instead of a component that the SSR test harness cannot see into).

## Issues Encountered

**One locked test assertion remains RED — a probable one-argument omission in Plan 163-03's own test file, not a production behavior gap.**

`FansubVersionBrowser.test.tsx > bounded public inventory continuation > merges 125 variants over explicit pages...` fails at:
```
fireEvent.click(screen.getByRole('button', { name: 'Weitere Episoden und Versionen laden' }))
```
(line 283) — the button does not exist after switching to "Anderer Gruppenname" (group 7).

Root cause, verified by exact byte-level reading of the test (`FansubVersionBrowser.test.tsx:264-296`) and confirmed empirically (the rendered episode count, versions shown, and DOM dump all match): the mock response queued for the "Anderer Gruppenname" click is `groupedMock.mockResolvedValueOnce(publicPage([episode(variants.slice(0, 23))]))` — a single-argument call, so `publicPage`'s `pagination` parameter defaults to `ended` (`has_more: false`). Per this plan's D-07-faithful implementation (switching to a group discards the old cursor and applies the FRESH response's own pagination — matching every other test in this file and the sibling `groupSwitch.test.tsx`, and matching 163-CONTEXT.md D-07/D-09 verbatim: "Alte Liste und alter Cursor werden verworfen, nie gemergt" / "immer neu laden"), this correctly disables the "Weitere laden" button, since group 7's own first page reports no continuation.

However, the test's SUBSEQUENT assertion `expect(getGroupedEpisodes).toHaveBeenNthCalledWith(3, 22, expect.objectContaining({ cursor: 'cursor-23', ... }))` requires a cursor value `'cursor-23'` that is **only ever produced by the component's INITIAL props** (`pagination={continued('cursor-23')}` at `render(...)`, line 274) — no mocked response in this test ever sets that string as its own `next_cursor`. The five loop-generated continuation responses use `cursor-46`, `cursor-69`, `cursor-92`, `cursor-115` (an exact `offset + 23` arithmetic sequence for `offset = 23, 46, 69, 92`), which is only internally consistent if the "Anderer Gruppenname" switch response ALSO carried `continued('cursor-23')` — i.e. the missing second argument to `publicPage([episode(variants.slice(0, 23))])` at line 265 was very likely intended to be `continued('cursor-23')` to keep the numbering scheme unbroken, but was omitted.

Per this plan's explicit instruction ("Do not modify either test file — they were locked in Plan 163-03"), I did not edit the test. I verified there is no implementation shape consistent with D-07/D-09 (and with every other passing assertion in this same file and its sibling) that also satisfies this one assertion as literally written; forcing it green would require either abandoning the "discard cursor on switch" design (an architectural regression, Rule 4 territory, contradicted by 163-CONTEXT.md and 4 other passing tests) or editing the locked test (explicitly forbidden by this plan). Recommended follow-up (out of this plan's scope): a one-line test fix — `groupedMock.mockResolvedValueOnce(publicPage([episode(variants.slice(0, 23))], continued('cursor-23')))` at `FansubVersionBrowser.test.tsx:265` — would make this assertion internally consistent with the rest of the test and should turn it green with zero production-code changes.

This is **not a new regression**: this exact test was already RED in 163-03's baseline (via a `waitFor` timeout, since no refetch existed at all); it is now RED for a different, better-understood reason (a test-authoring omission), with 4 of its 5 sibling describe-block tests plus all 4 `groupSwitch.test.tsx` tests fully green.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All client-visible group-switch filtering, dimming, error/retry, and hit-count heading behavior described in 163-CONTEXT.md D-07 through D-16 is implemented and verified (except the one documented pre-existing test defect above, which does not reflect a production behavior gap).
- No live container rebuild was performed in this plan (per operational constraints — that is Plan 163-05's scope). `npm run build` was run only as a verification step inside the running `team4sv30-frontend` container, not `docker compose up --build`.
- Plan 163-05 should: (a) perform the actual container rebuild/restart and live UAT against the real Naruto/AnimeOwnage/Project Messiah data per D-18/D-19, and (b) optionally apply the one-line test fix documented above for the 125-variant test, or accept/re-triage it explicitly.
- Backend-side D-01..D-06/D-18/D-19 (query correctness, `EXPLAIN ANALYZE`, backend integration tests) are out of this plan's scope (Plan 163-02, already complete per dependency chain) and were not touched here.

---
*Phase: 163-oeffentliche-anime-seite-episoden-nach-fansub-gruppe-filtern*
*Completed: 2026-09-17*
