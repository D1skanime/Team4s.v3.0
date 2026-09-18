---
phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll
plan: 11
subsystem: ui
tags: [css, design-tokens, contrast, wcag-aa, react, next.js, fansubs]

# Dependency graph
requires:
  - phase: 164-08
    provides: FansubGroupPicker/FansubGroupContext/EpisodeGlassCard shipped in earlier 164 waves
provides:
  - Legible eyebrow label and unselected chip text on the dark FansubGroupPicker background (GAP-04)
  - Moderate-radius (var(--radius-md)) chips instead of full-pill (GAP-05)
  - Visible chip-row and picker/card spacing via var(--space-3) gap and a new .wrapper margin (GAP-06)
  - Filled, AA-contrast-passing (~6:1) selected-chip state using var(--accent-dark) (GAP-07)
  - Neutral glass FansubGroupContext card matching EpisodeGlassCard's established token block (GAP-08)
  - Token-based Button variant="text" "Mehr lesen ->" link and right-aligned nav buttons (GAP-09)
  - Self-contained, AA-contrast-passing (~5.24:1 worst case) dark tag chips on the anime detail page (GAP-10)
affects: [164-anime-detail-page, fansub-group-picker, fansub-group-context]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Feature-local glass tokens (--glass-surface/--glass-border/--glass-text) copied verbatim from EpisodeGlassCard.module.css when a component renders on the same dark .episodesSection background"
    - "Self-contained rgba-literal chip backgrounds instead of global light-card tokens when a component's real background is variable/near-transparent (documented contrast arithmetic in commit messages, same convention as commit 9233adf2)"

key-files:
  created: []
  modified:
    - frontend/src/components/fansubs/FansubGroupPicker.tsx
    - frontend/src/components/fansubs/FansubGroupPicker.module.css
    - frontend/src/components/fansubs/FansubGroupContext.tsx
    - frontend/src/components/fansubs/FansubGroupContext.module.css
    - frontend/src/app/anime/[id]/page.module.css

key-decisions:
  - "Used var(--accent-dark) (#3f60ad, ~6.03:1 against white) instead of var(--accent-primary) for the selected chip fill, per the plan's explicit contrast-arithmetic instruction (accent-primary would fail AA at ~3.6:1)"
  - "Tag chip background set to rgba(20, 18, 16, 0.62) with rgba(255, 255, 255, 0.92) text -- worst-case blended contrast (white gradient top blended through 0.62 alpha) computes to ~5.24:1, passing AA"
  - "Did not modify FansubGroupPicker.test.tsx or FansubGroupContext.test.tsx -- both existing suites (role='link'/role='group' queries) passed unchanged since Button's href mode renders a real <a>, and no test asserted on specific class names or wrapper markup that the new .wrapper class broke"

requirements-completed: [REQ-164-05, REQ-164-09]

duration: ~20min
completed: 2026-09-18
---

# Phase 164 Plan 11: Fansub Group Picker/Context and Tag Chip Contrast Fixes Summary

**Fixed seven live-UAT visual/contrast gaps (GAP-04..GAP-10) in FansubGroupPicker, FansubGroupContext, and anime-page tag chips using only existing global/feature-local tokens, with documented WCAG AA contrast arithmetic for both new filled-color decisions.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-18T08:35:00Z (approx.)
- **Completed:** 2026-09-18T08:44:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- FansubGroupPicker's eyebrow label, unselected-chip text, chip radius, chip-row spacing, and selected-chip fill all corrected for the real dark `.episodesSection` background (GAP-04/05/06/07)
- FansubGroupContext converted from an opaque white card to the neutral glass style shared with `EpisodeGlassCard`, its "Mehr lesen →" link switched to the `Button variant="text"` primitive, and its nav buttons right-aligned (GAP-08/09)
- Anime detail page's tag chips made self-contained (own dark background + light text) so they stay legible regardless of the `.infoCard` gradient's opacity at scroll position (GAP-10)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix FansubGroupPicker contrast, radius, spacing, and selected-chip state (GAP-04, 05, 06, 07)** - `b7a4d252` (fix)
2. **Task 2: Convert FansubGroupContext to the neutral glass card style and fix its link/button styling (GAP-08, GAP-09)** - `22e71ea0` (fix)
3. **Task 3: Fix tag chip contrast on the anime detail page (GAP-10)** - `07f49702` (fix)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/fansubs/FansubGroupPicker.tsx` - added `.wrapper` class to the outer div for the new margin-bottom spacing
- `frontend/src/components/fansubs/FansubGroupPicker.module.css` - light-on-dark eyebrow/chip text, `var(--radius-md)` chip radius, `var(--space-3)` chip-row gap, new `.wrapper` with `margin-bottom: var(--space-5)`, filled `var(--accent-dark)` selected-chip state
- `frontend/src/components/fansubs/FansubGroupContext.tsx` - removed `next/link` import (unused after the swap), "Mehr lesen →" now a `Button href variant="text"`
- `frontend/src/components/fansubs/FansubGroupContext.module.css` - `.card` now uses the exact `EpisodeGlassCard.module.css` glass token block (no classification tint), `.moreLink` is token-color-only (Button supplies the underline), `.navRow` is `justify-content: flex-end; flex-wrap: wrap`
- `frontend/src/app/anime/[id]/page.module.css` - `.tagChip`/`.tagChip:hover`/`.tagsLabel` switched from `--surface-sunken`/`--text-primary`/`--text-muted` to self-contained rgba dark-background/light-text values

## Decisions Made
- `var(--accent-dark)` chosen over `var(--accent-primary)` for the selected chip fill (see key-decisions above) — the plan's Interfaces section explicitly flagged `--accent-primary`'s ~3.6:1 ratio as an AA failure precedent to avoid.
- Tag chip contrast computed against the worst-case backdrop (white gradient top, since the chip background itself carries alpha 0.62) rather than assuming full opacity, to give an honest floor rather than an optimistic one.
- No test file changes were needed — both existing suites already asserted via `role="link"`/`role="group"` queries that survive the Button-primitive swap and the new wrapper class.

## Deviations from Plan

None - plan executed exactly as written. All acceptance-criteria greps (radius, pill-removal, accent-dark count, spacing tokens, glass-token count, backdrop-filter presence, `variant="text"` presence, flex-end alignment) matched the plan's expected values exactly on first pass; no auto-fixes were required.

## Issues Encountered
`npx tsc --noEmit -p .` surfaced two pre-existing type errors in unrelated auto-generated `.next/dev/types` files (`anime/[id]/group/[groupId]/releases/[releaseVersionId]/page.ts` and `anime/page.ts`), both concerning Next.js's generated `PageProps` constraint for routes this plan never touches. Confirmed via `git log` that both source files were last modified in phase 158 (unrelated to this plan) — out of scope per the deviation rules' scope boundary; not fixed, not part of this plan's file list. `npx eslint` on the two modified TSX files passed with 0 errors (a CSS-file-ignored warning is expected — CSS Modules aren't linted by this project's ESLint config).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
All seven pure-frontend visual/contrast gaps from the 2026-09-18 live UAT (GAP-04 through GAP-10) are closed at the code level. GAP-03 (episode preview formatting) is out of scope for this plan and is handled by 164-12. Per the plan's operational constraints, this SUMMARY does not mark anything as human-accepted — a later live UAT round (reported separately by the orchestrator) closes the visual-verification loop for these fixes.

## Self-Check: PASSED

All modified files confirmed present on disk; all three task commit hashes (b7a4d252, 22e71ea0, 07f49702) confirmed present in `git log`.

---
*Phase: 164-oeffentliche-anime-seite-episode-release-ui-read-model-infinite-scroll*
*Completed: 2026-09-18*
