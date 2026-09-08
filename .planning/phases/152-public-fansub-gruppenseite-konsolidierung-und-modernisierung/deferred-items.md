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
