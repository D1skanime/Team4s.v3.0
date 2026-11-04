# Phase 192 — Deferred Items (out of scope, not fixed)

## 192-02

- `src/components/ui/ResponsiveImage.config.test.ts` ("allows only the configured Team4s API
  media namespace for responsive group logos") fails both in isolation and as part of the full
  suite, unrelated to any file this plan touches (`next.config.mjs`/env-derived remote-pattern
  matching). Confirmed pre-existing and out of this plan's scope (no file in
  `files_modified`/`<files>` for 192-02 overlaps `ResponsiveImage`/`next.config.mjs`). Not fixed
  per the scope-boundary rule — logged here instead of re-running builds to chase it.

## 192-11

- `src/lib/cssCustomProperties.guard.test.ts` ("finds zero fallback-free dead custom-property
  references on the real, fixed tree") fails reproducibly (confirmed in isolation, not a
  concurrency flake) because its textual scanner flags `var(--space-N)` inside a doc comment at
  `frontend/src/components/ui/Card.tsx:41` (the `padding` prop's JSDoc, describing the generic
  `'1'..'9'` -> `var(--space-N)` mapping pattern, `N` is prose not a real CSS custom property).
  Confirmed pre-existing and out of this plan's scope: `Card.tsx` was last touched by Plan 192-11
  (`git log`), not by 192-19 (no diff between 192-19's commits and this file). Likely needs the
  comment reworded or the file added to the scanner's documented "known-non-CSS-textual-mentions"
  allow-list in a future pass that touches `Card.tsx` or the guard test itself -- not fixed here
  per the scope-boundary rule.

## 192-07

- `npx eslint .` reports 4 pre-existing errors, none in files touched by this phase (verified via
  `git log -- <file>` showing the last touching commit predates phase 192):
  - `frontend/capture-responsive.cjs:1-2` — `require()`-style imports forbidden (last touched by
    `e034b53ce`, a profile-carousel WIP commit).
  - `frontend/src/app/anime/[id]/group/[groupId]/releases/ReleasesFilterBar.tsx:69` — native
    `<input>` outside `components/ui` (last touched by `486efa97e`, Phase 189-03).
  - `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts:249` —
    React Compiler "memoization could not be preserved" (last touched by Phase 180/181 commits).
  Not fixed per the scope-boundary rule — none of these three files is part of this phase's
  `files_modified` across any of the 10 plans. A fourth error (native `<button>` in
  `Cluster.stories.tsx`, introduced by Plan 192-08) WAS fixed in this plan — see 192-07-SUMMARY.md.
