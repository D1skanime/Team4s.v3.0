---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 10
subsystem: ui
tags: [css-custom-properties, design-tokens, storybook, next.js, vitest]

requires:
  - phase: 192-08
    provides: "the already-touched composite-block files (AnimeDetailHero.module.css, ReleasePreviewRow.module.css, FansubGroupPicker.module.css, FansubVersionBrowser.module.css, AnimeEdgeNavigation.module.css, Stack/Cluster/SplitLayout.module.css) that the new phase-scoped guard protects"
provides:
  - "frontend/src/styles/tokens/effects.css: dedicated, German-commented home for the 5 purpose-named blur/backdrop-filter/color-mix/scrim-transparency recipes, imported globally via globals.css"
  - "a Storybook 'Grundlagen/Effekte' page (EffectsShowcase) visually documenting each recipe via the real consuming Grundbaustein over a real image"
  - "effectTokenPurity.guard.test.ts: phase-scoped regression guard against raw effect literals creeping back into the 8 already-touched composite-block files"
  - "docs/FRONTEND_ARCHITEKTUR.md Section 10 'Effekte' paragraph documenting the rule and the 5 current recipes"
affects: [192-verification]

tech-stack:
  added: []
  patterns:
    - "Effect tokens (blur/backdrop-filter/color-mix/rgba scrim recipes) get the same purpose-named, dedicated-file treatment as space/radius/breakpoint tokens, consumed exclusively inside components/ui/*.module.css"
    - "Hand-curated Storybook showcase (not an auto-scan like DesignTokensShowcase) for token recipes that are compositions of multiple properties with one visual purpose, rendering the real consuming Grundbaustein over a fixture image instead of reconstructing CSS"

key-files:
  created:
    - frontend/src/styles/tokens/effects.css
    - frontend/src/app/anime/[id]/effectTokenPurity.guard.test.ts
    - frontend/src/components/showcases/EffectsShowcase.tsx
    - frontend/src/components/showcases/EffectsShowcase.module.css
    - frontend/src/components/showcases/EffectsShowcase.stories.tsx
    - frontend/src/components/showcases/EffectsShowcase.test.tsx
  modified:
    - frontend/src/styles/tokens/components.css
    - frontend/src/styles/globals.css
    - frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "No token renaming: the 5 moved groups were already purpose-named per Befund 26's own 'Ist-Zustand' finding, so the move is pure relocation (same names, same values) plus German purpose comments, exactly as the plan's interfaces/action text specified"
  - "Fixed a stale dependency on token file location: FansubHeroSection.accessibility.test.ts read --badge-onmedia-bg/-text directly from components.css via fs.readFileSync; repointed it to effects.css since the test asserts against the physical file, not var() resolution"

requirements-completed: [Befund-26]

duration: ~20min
completed: 2026-11-04
---

# Phase 192 Plan 10: Effekt-Zweck-Tokens (Befund 26) Summary

**Moved the 5 Befund-26 blur/glass/scrim effect recipes into a new, German-commented `effects.css` (mirroring the existing space/radius/breakpoint token files), added a hand-curated Storybook "Grundlagen/Effekte" showcase that renders each recipe via its real consuming Grundbaustein, a phase-scoped regression guard, and matching `FRONTEND_ARCHITEKTUR.md` documentation.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-11-04T13:14:00Z (approx.)
- **Completed:** 2026-11-04T13:24:18Z
- **Tasks:** 2
- **Files modified:** 10 (6 created, 4 modified)

## Accomplishments
- `frontend/src/styles/tokens/effects.css` now holds all 5 named recipes (`--banner-backdrop-*`, `--linkchip-glass-*`, `--linkchip-scrim-*`, `--button-chip-glass-*`, `--badge-onmedia-*`), each preceded by a German comment naming its purpose and sole consuming Grundbaustein; `components.css` lost exactly these 5 groups while keeping the explicitly-excluded sibling tokens (sizing/active-state) in place.
- `globals.css` imports `./tokens/effects.css` next to `./tokens/components.css`, keeping the same single `:root` cascade.
- A new Storybook "Grundlagen/Effekte" page (`EffectsShowcase`) shows all 5 recipes live over a real `/covers/placeholder.jpg` background, rendering the actual `BannerSection`/`LinkChip`/`Button`/`Badge` components in their relevant variant/tone — never a hand-rebuilt CSS approximation.
- `effectTokenPurity.guard.test.ts` protects the 8 composite-block files this phase already touched (`AnimeDetailHero.module.css`, `ReleasePreviewRow.module.css`, `FansubGroupPicker.module.css`, `FansubVersionBrowser.module.css`, `AnimeEdgeNavigation.module.css`, `Stack.module.css`, `Cluster.module.css`, `SplitLayout.module.css`) against raw `filter:`/`backdrop-filter:`/`color-mix(`/`rgba(`/`hsla(` literals, explicitly phase-scoped (not repo-wide).
- `docs/FRONTEND_ARCHITEKTUR.md` Section 10 gained an `**Effekte:**` paragraph naming all 5 recipes, the Storybook page, and the guard test; the token-file list and the "Grundlagen/*" story count were updated to mention `effects.css`/the new "Effekte" story.

## Task Commits

1. **Task 1: Create effects.css, move the 5 recipe groups out of components.css, wire the import, add the phase-scoped guard** - `3b72cf5bf` (feat)
2. **Task 2: Build the "Grundlagen/Effekte" Storybook showcase and document the rule** - `1fd112668` (feat)

**Plan metadata:** (this commit, created after SUMMARY.md)

## Files Created/Modified
- `frontend/src/styles/tokens/effects.css` - new dedicated token file for the 5 effect recipes, German purpose comments
- `frontend/src/styles/tokens/components.css` - lost the 5 moved groups, kept the explicitly-excluded siblings
- `frontend/src/styles/globals.css` - added `@import './tokens/effects.css';`
- `frontend/src/app/anime/[id]/effectTokenPurity.guard.test.ts` - new phase-scoped guard against raw effect literals in the 8 already-touched composite-block files
- `frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts` - repointed its `--badge-onmedia-bg/-text` file read from `components.css` to `effects.css` (same values, new source file)
- `frontend/src/components/showcases/EffectsShowcase.tsx` - hand-curated catalog of the 5 recipes, each rendering the real consuming Grundbaustein over a fixture image
- `frontend/src/components/showcases/EffectsShowcase.module.css` - showcase's own layout CSS only (no new token content)
- `frontend/src/components/showcases/EffectsShowcase.stories.tsx` - `Grundlagen/Effekte` Storybook page, `tags: ['autodocs']`
- `frontend/src/components/showcases/EffectsShowcase.test.tsx` - asserts all 5 entries render name/purpose/usedBy text and that each preview sits over the real BannerSection background image
- `docs/FRONTEND_ARCHITEKTUR.md` - Section 10 `**Effekte:**` paragraph, token-file list update, Grundlagen story-count update

## Decisions Made
- Kept all 5 token groups' names unchanged (no renaming) since Befund 26's own analysis already found them purpose-named — only relocation + comments were required, consistent with the plan's explicit `must_haves` ("contains: --banner-backdrop-blur") and action text.
- Repointed `FansubHeroSection.accessibility.test.ts` to read `effects.css` instead of `components.css` for `--badge-onmedia-bg`/`-text` (Rule 3 — blocking issue: this existing test asserts against the token file's literal text content, so without the fix the move would break an existing, in-scope accessibility test).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Repointed a token-file-reading accessibility test to the new effects.css**
- **Found during:** Task 1 (moving the 5 recipe groups)
- **Issue:** `FansubHeroSection.accessibility.test.ts` reads `src/styles/tokens/components.css` via `fs.readFileSync` and extracts `--badge-onmedia-bg`/`--badge-onmedia-text` by regex against that file's literal text — moving the declarations to `effects.css` would silently break this existing contrast test (not a var()-resolution issue, a physical-file-content issue).
- **Fix:** Added a second `fs.readFileSync` for `effects.css` and repointed the two `extractVarValue` calls for `badge-onmedia-bg`/`badge-onmedia-text` to it; removed the now-unused `componentsTokensCss` read; updated the explanatory comment to note the new source file.
- **Files modified:** `frontend/src/components/fansubs/FansubHeroSection.accessibility.test.ts`
- **Verification:** `npx vitest run src/components/fansubs/FansubHeroSection.accessibility.test.ts` — all 9 tests pass.
- **Committed in:** `3b72cf5bf` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to prevent a regression in an existing, already-passing accessibility test. No scope creep — only the two lines reading the moved tokens were touched.

## Issues Encountered
None beyond the one documented deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All must-haves verified: `effects.css` exists with the 5 documented groups and zero occurrences remain in `components.css`; the guard test passes with a working self-test; the Storybook "Grundlagen/Effekte" page renders all 5 entries via the real consuming Grundbausteine; `docs/FRONTEND_ARCHITEKTUR.md` documents the rule.
- Full regression check: `npx vitest run` → 464 passed / 5 failed test files, all 5 failures pre-existing and environment-dependent (missing `msw` module in `.storybook/mocks/`, a Docker-only `API_INTERNAL_URL` gate, an unrelated `ResponsiveImage.config.test.ts` assertion, and a backend-path anti-drift test requiring a `/backend` mount) — none touch files this plan modified. `npx tsc --noEmit` shows the same pre-existing `.storybook/mocks/handlers.ts` (`msw`) errors only, no new ones.
- Ready for the phase's final verification plan (ex-192-07): Playwright before/after + Story-vs-live-page image-pair proof and the full regression run, now that Befunde 24/25/26 are all closed.

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 11 claimed files found on disk; both task commit hashes (`3b72cf5bf`, `1fd112668`) found in `git log --oneline --all`.
