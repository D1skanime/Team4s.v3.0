---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 13
subsystem: ui
tags: [react, typescript, admin, gap-closure]

# Dependency graph
requires:
  - phase: 164-10
    provides: "GET /api/v1/admin/episode-classification-options (admin-gated, DB-sourced code+label pairs)"
provides:
  - "EpisodeClassificationFields.tsx consumes the DB-sourced admin endpoint via a module-level memoized fetch instead of the deleted hardcoded label arrays"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level memoized fetch-once promise for a component mounted N times per page
      (episode rows on list pages + version editor), with error-path cache reset to allow
      retry on a later mount without a polling/retry loop"
    - "Loading-state select rendering: while options are in flight, render only the
      currently-selected value as a single placeholder option (plus the existing 'Nicht
      gesetzt' empty option) instead of an empty or stale dropdown"

key-files:
  created: []
  modified:
    - frontend/src/types/episodeClassification.ts
    - frontend/src/lib/api.ts
    - frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx
    - frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx
    - frontend/src/app/dev/episode-windowing-preview/page.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.groupSwitch.test.tsx
    - frontend/src/components/fansubs/FansubVersionBrowser.windowing.test.tsx
    - frontend/src/components/fansubs/useWindowedEpisodePages.test.ts

key-decisions:
  - "Memoization tests (Test 1-3 in EpisodeClassificationFields.test.tsx) use
    vi.resetModules() + vi.doMock() + a dynamic import to get a fully isolated module
    instance per test, rather than relying on the file's single top-level static import.
    The module-level cache variable in EpisodeClassificationFields.tsx is shared for the
    lifetime of one loaded module instance; without this isolation, whichever test happens
    to run first would permanently resolve the cache for the rest of the file, making later
    tests unable to prove a fresh fetch or inject a distinct fixture."
  - "Pre-existing save-flow tests ('saves Canon/Filler alone...', 'saves the episode type
    alone...', and the EpisodeAccordion/EpisodeClassificationSection cross-surface test) had
    to be updated to await option loading (new waitForOptionsToLoad helper) before firing
    fireEvent.change. This is a genuine, unavoidable consequence of the async-fetch design:
    firing a native select change to a value with no matching <option> yet present (because
    options haven't loaded) is silently normalized to '' by the browser/jsdom, not a
    component bug -- confirmed by reproducing the exact same failure in a freshly-isolated
    module instance with no prior cache."
  - "Extended this plan's Rule 3 (blocking) fix to also resolve the 5 tsc-only
    PublicGroupedEpisode fixture gaps in files outside this plan's stated file scope
    (episode-windowing-preview/page.tsx and 3 FansubVersionBrowser*/useWindowedEpisodePages
    test files), since 164-10's and 164-12's own SUMMARYs explicitly and unambiguously
    assign this cleanup to 164-13 as the plan that closes the whole GAP-11 gap-closure
    loop, and the plan's own <verification> section requires 'npx tsc --noEmit -p .' with
    0 new failures for a clean handoff at the end of the entire 164-08..164-13 gap-closure
    batch. Committed as a separate, clearly-labeled commit from the core Task 1 changes."

patterns-established:
  - "Admin Canon/Filler and Episodentyp option sourcing is now symmetric with the public
    page (164-12): both read filler_type_label/episode_type_label-shaped data from the
    backend, never a duplicated frontend label map."

requirements-completed: [REQ-164-02, REQ-164-03, REQ-164-04]

# Metrics
duration: 55min
completed: 2026-09-18
---

# Phase 164 Plan 13: Admin Frontend Consumption of DB-Backed Episode Classification Options (GAP-11) Summary

**`EpisodeClassificationFields.tsx` now fetches its Canon/Filler and Episodentyp dropdown options from the DB-backed 164-10 admin endpoint through a module-level memoized promise (one network request regardless of how many episode rows mount the component), and the hardcoded `EPISODE_FILLER_TYPE_OPTIONS`/`EPISODE_TYPE_OPTIONS` label arrays are gone from the admin frontend entirely — closing the admin half of GAP-11 and the entire 164-08..164-13 gap-closure batch.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-09-18T09:15:00Z (approx, first file reads)
- **Completed:** 2026-09-18T10:10:00Z
- **Tasks:** 1 (auto, tdd="true"), plus one in-scope deferred-item cleanup
- **Files modified:** 9 (4 in the plan's stated `files_modified`, 5 resolving a deferred tsc-only gap explicitly assigned to this plan)

## Accomplishments
- GAP-11 (admin half, final piece): the admin Canon/Filler and Episodentyp `<Select>` dropdowns in `EpisodeClassificationFields.tsx` render DB-sourced code+label pairs fetched from `GET /api/v1/admin/episode-classification-options` (164-10), matching the same labels the public page (164-12) already shows for the same codes — no hardcoded label array remains anywhere in the admin frontend.
- A module-level memoized fetch (`loadClassificationOptions()`) guarantees at most one network request per page load regardless of how many episode rows mount the component simultaneously (list pages mount it once per row; the version editor mounts it once per version). Proven by a dedicated test that mounts two fresh, isolated component instances and asserts the mock fetch is called exactly once.
- While options are loading, the dropdown shows only the currently-selected value as a placeholder (no empty-dropdown flash); once loaded, the placeholder is fully replaced by the real DB-sourced option list.
- Resolved the 5 remaining `tsc --noEmit`-only `PublicGroupedEpisode` fixture gaps that 164-10's and 164-12's SUMMARYs explicitly deferred to this plan — `npx tsc --noEmit -p .` is now fully clean across the whole frontend.

## Task Commits

1. **Task 1: Fetch classification options from the DB-backed endpoint and delete the hardcoded arrays** — `c3d79894` (feat)
2. **Deferred-item cleanup: `PublicGroupedEpisode` fixture label fields (explicitly assigned to 164-13 by 164-10/164-12)** — `5be9a293` (fix)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS + deferred-items.md update)

## Files Created/Modified
- `frontend/src/types/episodeClassification.ts` — deleted `EPISODE_FILLER_TYPE_OPTIONS`/`EPISODE_TYPE_OPTIONS`; added `EpisodeClassificationOption`/`EpisodeClassificationOptionsResponse` types matching the 164-10 backend contract
- `frontend/src/lib/api.ts` — added `getAdminEpisodeClassificationOptions()` following `getAdminEpisodeClassifications`'s exact `authorizedFetch`/`withAuthHeader`/`parseApiError`/`ApiError` style, `cache: "no-store"`
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.tsx` — module-level memoized `loadClassificationOptions()`, `useEffect` fetch-on-mount, `renderOptions()` helper handling the loading-vs-loaded states; both `<Select>`s now render from fetched `fillerOptions`/`episodeTypeOptions` state instead of the deleted static arrays
- `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx` — added a `getAdminEpisodeClassificationOptions` mock; rewrote the previously-synchronous "shows both episode dimensions..." assertion to `await`/`waitFor`; added a new `waitForOptionsToLoad` test helper; added a new describe block with 4 tests (memoization proof via isolated dynamic-import module instances, DB-label rendering for both dimensions with distinctive fixture data, and a save-flow regression test); updated 3 pre-existing save-flow tests to `await waitForOptionsToLoad(...)` before firing `fireEvent.change`, and added small `act()`-flush points to eliminate React "not wrapped in act" warnings introduced by the new async fetch
- `frontend/src/app/dev/episode-windowing-preview/page.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx`, `FansubVersionBrowser.windowing.test.tsx`, `useWindowedEpisodePages.test.ts` — added `filler_type_label`/`episode_type_label` to `PublicGroupedEpisode` fixture object literals (labels consistent with migration 0169's backfill for the codes each fixture already used); no runtime behavior change, `tsc`-only fix

## Decisions Made
See `key-decisions` in the frontmatter above (module-isolation technique for memoization/DB-label tests, the async-load timing fix needed for pre-existing save-flow tests, and the decision to close the 5 deferred fixture gaps in this plan despite them being outside the plan's stated `files_modified`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pre-existing save-flow tests fired `fireEvent.change` before the async options fetch resolved, causing the browser/jsdom to silently normalize the target value to `''`**
- **Found during:** Task 1, first test run after implementing the async fetch
- **Issue:** `'saves Canon/Filler alone...'`, `'saves the episode type alone...'`, and the cross-surface `'overview change is visible...'` test all called `fireEvent.change(select, { target: { value: 'canon' } })` immediately after `render(...)`, before the component's `useEffect` had a chance to populate the real option list. Since the loading-state placeholder only renders an `<option>` for the *currently selected* value, the target value (`'canon'`) had no matching `<option>` element yet, and the native `<select>`/jsdom normalizes an unmatched assignment to `''` — the `onChange` handler then received `''` instead of `'canon'`, sending the wrong payload to `updateAdminEpisode`.
- **Fix:** Added a `waitForOptionsToLoad()` test helper (waits for the Canon/Filler select's option count to exceed 1) and inserted `await waitForOptionsToLoad(...)` before every `fireEvent.change` call that changes to a value not yet present in the loading-state placeholder. Also added small `act()`-wrapped microtask flushes to eliminate a handful of React "not wrapped in act" console warnings caused by the same async design.
- **Files modified:** `frontend/src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx`
- **Commit:** `c3d79894`

**2. [Rule 3 - Blocking, explicitly pre-assigned by 164-10/164-12] Five `PublicGroupedEpisode` fixtures outside this plan's stated file scope still lacked `filler_type_label`/`episode_type_label`, failing `tsc --noEmit`**
- **Found during:** Task 1 completion, running the plan's own `<verification>` command (`npx tsc --noEmit -p .`)
- **Issue:** `frontend/src/app/dev/episode-windowing-preview/page.tsx` and three `FansubVersionBrowser*`/`useWindowedEpisodePages.test.ts` files construct `PublicGroupedEpisode` object literals without the two 164-10 required fields. Both 164-10's and 164-12's own SUMMARYs explicitly and unambiguously assign this cleanup to 164-13 ("164-13 must add the two label fields to the five files listed above before its own `tsc --noEmit` gate can pass cleanly").
- **Fix:** Added `filler_type_label`/`episode_type_label` fields to each affected fixture, using labels matching migration 0169's backfill for the code each fixture already used (e.g. `unknown` → `'Unbekannt'`, `episode` → `'Episode'`). No runtime behavior changed in any of these files — confirmed via the full `npx vitest run` sweep (0 new failures/regressions in any of the five files).
- **Files modified:** `frontend/src/app/dev/episode-windowing-preview/page.tsx`, `frontend/src/components/fansubs/FansubVersionBrowser.filterSwitch.test.tsx`, `FansubVersionBrowser.groupSwitch.test.tsx`, `FansubVersionBrowser.windowing.test.tsx`, `useWindowedEpisodePages.test.ts`
- **Commit:** `5be9a293`

---

**Total deviations:** 2 auto-fixed (1 direct test-timing bug caused by this plan's own async-fetch design change, 1 explicitly-pre-assigned deferred-item cleanup required for a clean `tsc` gate)
**Impact on plan:** Both fixes are direct, unavoidable consequences of this plan's own mandated behavior change (async option loading) or an explicit prior-plan handoff instruction. No scope creep beyond what 164-10/164-12 already flagged for this plan.

## Issues Encountered
None beyond the deviations above. No auth gates, no checkpoints.

## User Setup Required
None — no external service configuration required.

## Verification

- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run src/components/episodes/EpisodeClassificationFields/EpisodeClassificationFields.test.tsx"` — 10/10 pass (6 pre-existing + 4 new), 0 React `act()` warnings.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx tsc --noEmit -p ."` — fully clean (0 errors), including the 5 previously-deferred `PublicGroupedEpisode` fixture gaps.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run"` (full suite) — 331 passed | 1 skipped test files, 2921 passed | 3 todo tests. The only failing file is the pre-existing, already-documented `src/lib/cssCustomProperties.guard.test.ts` line-drift issue (164-04 deferred item, unrelated to this plan's files) — 0 new regressions.
- `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx eslint ..."` on all 9 files touched by this plan — clean (0 warnings/errors).
- Acceptance-criteria greps (all plan-specified) confirmed: `EPISODE_FILLER_TYPE_OPTIONS|EPISODE_TYPE_OPTIONS` count 0 in both `episodeClassification.ts` and `EpisodeClassificationFields.tsx`; `getAdminEpisodeClassificationOptions` count ≥1 in both `lib/api.ts` and `EpisodeClassificationFields.tsx` (both are 2).
- `docker restart team4sv30-frontend` performed at the end; confirmed `http://192.168.235.196:3000/` returns `200` post-restart, so this plan's changes are live for later manual verification.
- No `team4s_v2` writes — this plan touched only frontend TypeScript/TSX files.

## Next Phase Readiness
- This was the last plan in the 164-08..164-13 gap-closure batch. GAP-11 is now fully closed end to end: the public page (164-08/164-10/164-12) and the admin frontend (this plan) both read Canon/Filler and Episodentyp display names from the same DB-backed source, with no hardcoded label map remaining anywhere in the frontend.
- `npx tsc --noEmit -p .` is fully clean for the whole frontend as of this plan — no remaining deferred-items entries block a clean gate.
- A live human UAT re-check of the full GAP-01..GAP-12 set (per `164-UAT.md`) is still required before the whole gap-closure batch can be considered accepted — this plan only proves the automated admin-frontend portion of GAP-11, per this run's operational constraints ("Do not mark anything as human-accepted").

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*

## Self-Check: PASSED

All 9 created/modified files listed above verified present on disk; both task-commit hashes (`c3d79894`, `5be9a293`) verified present in `git log`.
