---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 18
subsystem: ui
tags: [storybook, design-system, next.js, vitest, documentation]

requires:
  - phase: 192-10
    provides: "the 'Grundlagen/Effekte' Storybook showcase (EffectsShowcase) this plan fixes, and the 5 named effect recipes in styles/tokens/effects.css it renders"
provides:
  - "EffectsShowcase.tsx now uses a real, colorful, detailed anime cover fixture (reused from PublicReleaseSurfacesShowcase.tsx) instead of a near-blank placeholder"
  - "Each of the 5 effect previews renders a visible Ohne-Effekt/Mit-Effekt (before/after) pair side by side via Cluster/Stack"
  - "Autodocs-facing description/purpose text rewritten to plain, jargon-free German (no 'Rezeptur'/'domänenfreie CSS-Nachbildung')"
affects: [192-verification]

tech-stack:
  added: []
  patterns:
    - "Before/after comparison panels inside a showcase Card use Cluster (gap='contentPair') + Stack (gap='tight') for the two-column arrangement -- no local flex/gap CSS re-implementation, consistent with the 'mandatory UI primitives' rule applied to showcase components too"
    - "A 'before' state for a component that has no built-in flat/neutral variant (LinkChip has only glass/scrim tones) is represented as plain Text (tone='onScrim') with no box -- isolates exactly the chip/button/badge background treatment being demonstrated, not basic text contrast"

key-files:
  created: []
  modified:
    - frontend/src/components/showcases/EffectsShowcase.tsx
    - frontend/src/components/showcases/EffectsShowcase.module.css
    - frontend/src/components/showcases/EffectsShowcase.stories.tsx
    - frontend/src/components/showcases/EffectsShowcase.test.tsx

key-decisions:
  - "Row 1 (BannerSection blur backdrop) before/after: plain ResponsiveImage (no blur) vs BannerSection (blur+scrim) -- the effect itself is the backdrop treatment, so the backdrop is what differs"
  - "Rows 2-5 (LinkChip/Button/Badge overlays) before/after: both panels keep the SAME BannerSection backdrop (realistic production composition); only the overlay differs -- plain Text(tone='onScrim', no box) for 'before' vs the real LinkChip/Button/Badge for 'after'. This isolates the chip/button/badge-specific glass/scrim treatment without conflating it with BannerSection's own always-present blur, which is a different, already-demonstrated effect (row 1)"
  - "Chose plain-text baseline over borrowing an unrelated component variant (e.g. Button variant='text') for all 4 non-BannerSection rows, to keep the before/after comparison style consistent across the whole page as instructed"

requirements-completed: [Befund-27]

duration: ~15min
completed: 2026-11-04
---

# Phase 192 Plan 18: Grundlagen/Effekte mit echten Bildern und jargonfreier Beschreibung (Befund 27) Summary

**Replaced the Storybook "Grundlagen/Effekte" page's near-blank placeholder.jpg with the same detailed, colorful Naruto cover fixture `PublicReleaseSurfacesShowcase.tsx` already uses, added a visible Ohne-Effekt/Mit-Effekt comparison pair to all five effect previews via Cluster/Stack, and rewrote the jargon-heavy Autodocs description/purpose text into plain German.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-11-04T16:52:00Z (approx.)
- **Completed:** 2026-11-04T16:56:31Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- `FIXTURE_IMAGE` now points to `/covers/cover_1775167905284_2cd26cdc-2530-4914-8dd7-2a90a55b3fcd.jpg` (the same real, colorful, detailed Naruto DVD cover already used by `PublicReleaseSurfacesShowcase.tsx`) instead of the 352-byte near-blank `placeholder.jpg` — confirmed by Playwright screenshot that the image renders crisp and colorful.
- All 5 `EFFECT_ENTRIES` now render an explicit "Ohne Effekt" / "Mit Effekt" comparison pair side by side (`Cluster gap="contentPair"` + `Stack gap="tight"` from `@/components/ui`, no local flex/gap CSS), confirmed visible in a live Storybook screenshot at both desktop (1200px) and mobile (390px, where the pair correctly wraps to full-width stacked columns via Cluster's default `wrap`).
- Row 1 contrasts a plain unblurred `ResponsiveImage` against `BannerSection`'s blur+scrim; rows 2-5 contrast a plain, box-less `Text(tone="onScrim")` label against the real `LinkChip`/`Button`/`Badge` component on the same `BannerSection` backdrop, so each pair isolates exactly the one effect being documented in that row.
- `SectionHeader`'s description and the first entry's `purpose` text (the two Autodocs-visible spots that previously used "Rezeptur(en)"/"domänenfreie CSS-Nachbildung") are rewritten in plain German; the component's internal code comments were also reworded (not just the user-visible strings) so a full-file grep for the banned terms returns nothing.
- `EffectsShowcase.stories.tsx`'s file-level comment was reworded too for consistency ("Stories ziehen mit"), even though Storybook Autodocs does not render that particular comment block.

## Task Commits

1. **Task 1: Swap the fixture image for the detailed cover; add before/after pairs; rewrite copy to plain German** - `f42c02d35` (fix)

**Plan metadata:** (this commit, created after SUMMARY.md)

## Files Created/Modified
- `frontend/src/components/showcases/EffectsShowcase.tsx` - new `FIXTURE_IMAGE` path, `before`/`after` fields per `EffectEntry`, new `PreviewFrame`/`FlatLabel` local helpers, jargon-free `SectionHeader` description and first entry's `purpose`
- `frontend/src/components/showcases/EffectsShowcase.module.css` - added `.compare`/`.comparePane`/`.plainImage` (token-based spacing, no raw layout outside Cluster/Stack's own CSS vars)
- `frontend/src/components/showcases/EffectsShowcase.stories.tsx` - reworded file-level comment (no structural change needed, component already rendered directly)
- `frontend/src/components/showcases/EffectsShowcase.test.tsx` - new assertions: 10 fixture-image instances (2 per entry), 5× "Ohne Effekt"/5× "Mit Effekt" labels, real cover `src` (not `placeholder.jpg`), and absence of the banned jargon words in rendered text

## Decisions Made
- See `key-decisions` in frontmatter above (before/after composition choices per row, consistent plain-text baseline across all 4 overlay rows).

## Deviations from Plan
None - plan executed exactly as written. The plan's `<interfaces>` section explicitly left both the exact "before" representation per row and the exact final wording to the executor's judgment ("pick whichever... exact final wording is your call"), so these choices are implementation details within the plan's stated bounds, not deviations.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All must-haves verified: `grep -n "placeholder.jpg"` and `grep -n "Rezeptur\|domänenfreie CSS-Nachbildung"` against `EffectsShowcase.tsx` both return nothing; `npx tsc --noEmit` is clean; `npx vitest run src/components/showcases/EffectsShowcase.test.tsx` passes (4/4); a live Storybook screenshot of "Grundlagen/Effekte" (desktop 1200px and mobile 390px) confirms all five rows show a crisp, colorful image on the left and a visibly distinct glass/scrim-treated element on the right.
- Scoped regression check: `npx vitest run src/components/showcases/ src/components/ui/Cluster.test.tsx src/components/ui/Stack.test.tsx` → 7 files / 26 tests, all green.
- Ready for Befund 28 (Grundlagen/Design-Tokens regrouping, which per `192-CONTEXT.md` explicitly references/reuses this "Grundlagen/Effekte" page as its own "Grundskala"-level effect preview — no further change needed here for that reuse).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 4 claimed modified files found on disk; task commit hash (`f42c02d35`) found in `git log --oneline --all`.
