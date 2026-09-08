# Deferred Items — Phase 152

Out-of-scope discoveries surfaced during plan execution. Not fixed here per the executor's
scope-boundary rule (only auto-fix issues directly caused by the current task's changes).

## From 152-05 (Task 1 verification run)

- **`src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx`** — 3 failing tests
  (`getByAltText('Medium 2')` not found; DOM dump shows `FansubGroupMediaBlock` render). Pre-existing:
  neither `FansubMediaLightbox.test.tsx` nor `FansubGroupMediaBlock.tsx` were touched by 152-05 (only
  `FansubHeroSection.tsx` was modified — confirmed via `git status --short`). Last commit touching
  either file: `842ee118d3ac65c2c04466513477537f936992b`, unrelated to this plan. Not fixed here;
  tracked for a future hardening pass.

## From 152-07 (Task 3 full-suite verification run)

Two full single-worker `vitest run` passes were executed at the end of 152-07 (scoped `src/components/fansubs/` run plus two full-repo runs, `docker compose exec -T team4sv30-frontend sh -c "cd /app && npx vitest run --pool=forks --poolOptions.forks.maxForks=1"`). `files_modified` for 152-07 is exactly `group-history-events.ts`, `FansubHistorySection.tsx`, `FansubPublicSections.module.css`, `FansubHistorySection.test.tsx` (confirmed via `git show --stat` on all three 152-07 commits) — none of the three failures below touch any of those four files or their consumers.

- **`FansubMediaLightbox.test.tsx`** — 3 failing tests (`getByAltText('Medium N')` not found).
  Re-confirmed the same failure already logged under 152-05 above. Root cause remains `842ee118`
  (152-04's `alt=""` accessibility fix on the media thumbnail `next/image`, never matched with an
  update to the lightbox test's `getByAltText` queries). Reproduces in isolation
  (`vitest run src/components/fansubs/__tests__/FansubMediaLightbox.test.tsx`, 3/11 red every time).
- **`ResponsiveImage.config.test.ts` > "allows the production badge namespace without opening
  unrelated static paths"** — asserts `hasLocalMatch(localPatterns, '/history-event-badges-transparent/unrelated.png')` is `false`, but Plan 152-01 (commit `0228f473`, this plan's declared
  precondition, already complete before 152-07 started) added a `/history-event-badges-transparent/**`
  wildcard `localPatterns` entry — which by definition also matches `unrelated.png` under that same
  folder. The test's own negative-guard assertion went stale the moment 152-01 landed; 152-07 never
  touched `next.config.mjs` or this test file. Only appeared in the full-repo run, not the scoped
  `src/components/fansubs/` run (expected, since `ResponsiveImage.config.test.ts` lives outside that
  directory).
- **`DefaultCrewManager.test.tsx` > "ruft applyDefaultCrew auf und zeigt Ergebnis-Feedback nach
  Klick"** — a button-disabled-state timing assertion in an unrelated admin fansub-edit component
  (last touched Phase 136, `501b4092`). Only appeared in one of the two full-repo runs (the earlier
  background run showed 4 failures without this one; the second showed 5 with it) — consistent with
  the Docker-parallelism timing flakiness already documented for Phase 149 in `STATE.md`, not a new
  regression.

Full-repo run totals varied slightly between the two passes (3 failed test files / 5 failed tests vs.
2 failed test files / 4 failed tests), all attributable to the `DefaultCrewManager.test.tsx` flake
appearing in only one run. `FansubHistorySection.test.tsx` (9/9) and every other 152-07-touched
consumer (`GroupHistoryForm.test.tsx`, `GroupHistorySection.test.tsx`) were green in every run.
None of the three failures above are fixed here; all remain out of scope for 152-07 and tracked for a
future hardening pass.
