---
phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig
plan: 11
subsystem: ui
tags: [react, css-modules, storybook, design-system, card, divider]

requires:
  - phase: 192-01..192-10
    provides: Stack/Cluster/SplitLayout Zweck-Varianten, Card-Tönungs-Hook, Guard-Infrastruktur (catalogTaxonomy.test.ts, foreignVariableOverrides.regression.test.ts)
provides:
  - "Card.tsx: generic padding override-hook prop ('1'-'9'|'none' -> --card-padding-override), zero-pixel-diff for all existing callers"
  - "New Divider Grundbaustein: tone ('onMedia'|'onMediaStrong') x spacing ('withinMetaBlock'|'betweenSections'), token-only"
affects: [192-13, 192-14]

tech-stack:
  added: []
  patterns:
    - "Card override-hook convention extended: padding joins tintHue/--card-radius-override as a generic, domain-free per-instance CSS variable override"
    - "Divider established as the neutral on-media separator Grundbaustein, deliberately distinct from AccentRule's branded accent-line role"

key-files:
  created:
    - frontend/src/components/ui/Divider.tsx
    - frontend/src/components/ui/Divider.module.css
    - frontend/src/components/ui/Divider.stories.tsx
    - frontend/src/components/ui/Divider.test.tsx
  modified:
    - frontend/src/components/ui/Card.tsx
    - frontend/src/components/ui/Card.module.css
    - frontend/src/components/ui/Card.stories.tsx
    - frontend/src/components/ui/Card.test.tsx
    - frontend/src/components/ui/index.ts
    - docs/FRONTEND_ARCHITEKTUR.md

key-decisions:
  - "padding prop reuses the raw SpaceToken-literal ('1'..'9'|'none') shape, not a purpose-enum: Card's padding is a single domain-free scalar with no sibling relationship to express, unlike Stack/Cluster/SplitLayout's gap (Befund 24/D scope)"
  - "Divider is a new component, not a new AccentRule variant: different token family (--border-on-media(-strong), neutral on-media separator) vs. AccentRule's fixed --ui-line brand accent -- documented in Divider.tsx's top comment"
  - "Divider's two spacing values are purpose-named (withinMetaBlock/betweenSections) per Befund B's 'Zweck statt Größe' rule, deliberately avoiding 'tight' (retired elsewhere in this phase for the same size-not-purpose reason)"

patterns-established:
  - "Divider sets 100% of its own margin/background; a caller's className may only add responsive visibility (display:none), never spacing/color"

requirements-completed: [Befund-B]

duration: ~20min
completed: 2026-11-04
---

# Phase 192 Plan 11: Card-Padding-Variante + neuer Divider-Grundbaustein Summary

**Card gained a generic padding override-hook prop (`--card-padding-override`, zero-pixel-diff for every existing caller) and a new token-only `Divider` Grundbaustein (tone x spacing, 4-state Storybook coverage) now exist as prep work for the next wave's composite-file cleanup (192-13/192-14).**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-11-04T16:31:28Z
- **Tasks:** 2
- **Files modified:** 10 (4 created, 6 modified)

## Accomplishments
- `Card` accepts an optional `padding` prop (`'1'`–`'9'`/`'none'`) following the exact `tintHue`/`--card-radius-override` override-hook convention; every padding-bearing variant rule in `Card.module.css` now reads `var(--card-padding-override, <existing value>)`, verified zero existing callers pass the prop yet.
- New `Divider` Grundbaustein renders a single `<hr aria-hidden="true">`, fully cataloged under `Grundbausteine/Divider` with 4 stories (2 tones x 2 spacings) and a dark-background decorator so the line is visible; token-only CSS (`--border-on-media`/`--border-on-media-strong`, `--space-1`/`--space-5`), zero caller-settable margin/color.
- `docs/FRONTEND_ARCHITEKTUR.md` documents both additions (primitives list, Card variant-decisions paragraph, Grundbausteine story count bumped 28->29).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add a generic padding-override hook to Card** - `6264a28cc` (feat)
2. **Task 2: New Divider Grundbaustein** - `88788d970` (feat)

**Plan metadata:** committed alongside this SUMMARY/STATE/ROADMAP update

_Note: Both tasks were marked `tdd="true"`; tests were written and run to green within each single commit (RED state was verified locally before the GREEN implementation edit, per task) since both tasks are additive new-capability work with no pre-existing behavior to regress against -- test + implementation landed together per task to keep the commit history matching the plan's one-commit-per-task shape used throughout this phase's prior plans._

## Files Created/Modified
- `frontend/src/components/ui/Card.tsx` - new `padding` prop + merged inline-style logic (reuses the existing `mergedStyle` object, no second branch)
- `frontend/src/components/ui/Card.module.css` - every padding-bearing variant rule (`.card`, `.cardCompact`, `.cardNested`, `.cardNestedFlat`, `.cardGlass`, `.cardGlassStrong`, `.cardPublicSection`, `.cardPublicHero`, `.cardPublicPoster`, `.cardPublicHeroInfo`) now reads `var(--card-padding-override, ...)`
- `frontend/src/components/ui/Card.test.tsx` - new tests: prop unset leaves `--card-padding-override` unset; `padding="3"` sets `var(--space-3)`; `padding="none"` sets literal `0`
- `frontend/src/components/ui/Card.stories.tsx` - new `PaddingUeberschreibung` story demonstrating the override on `glassStrong`
- `frontend/src/components/ui/Divider.tsx` - new component (props `tone`, `spacing`, `className`), with top-of-file justification for not being an `AccentRule` variant
- `frontend/src/components/ui/Divider.module.css` - token-only CSS, 3 rules (base + 2 modifiers)
- `frontend/src/components/ui/Divider.stories.tsx` - `Grundbausteine/Divider`, 4 stories over a dark decorator
- `frontend/src/components/ui/Divider.test.tsx` - component behavior tests + CSS-text-scan tests (matching this codebase's established `fs.readFileSync`+regex convention for CSS assertions, e.g. `Card.test.tsx`)
- `frontend/src/components/ui/index.ts` - `export * from './Divider'` inserted between `DisclosureTrigger` and `EmptyState`
- `docs/FRONTEND_ARCHITEKTUR.md` - primitives list, Card paragraph, Grundbausteine paragraph (Divider description + story count)

## Decisions Made
- `padding` kept as a raw Space-scale literal (not a purpose enum): Card's padding is a single scalar with no sibling relationship to express, which is a different naming problem than Befund 24/D's `gap`/`firstColumnWidth` purpose-renaming (those encode a relationship between specific sibling elements).
- `Divider` built as its own component rather than a fourth `AccentRule` thickness variant: different token family and different semantic role (neutral on-media separator vs. branded accent flourish) — documented in `Divider.tsx`'s top comment per the plan's explicit requirement to put this justification "on record".
- `spacing` enum uses purpose names (`withinMetaBlock`/`betweenSections`) instead of a size word like `'tight'`, consistent with this same phase's parallel retirement of size-named gap values elsewhere.

## Deviations from Plan

None - plan executed exactly as written. The only self-directed addition beyond the plan's explicit task text was a new `Card.stories.tsx` story for the padding prop, which is a mandatory consequence of CLAUDE.md's "Stories ziehen mit" rule (a visible new prop/variant on a global primitive requires its story file to be updated in the same commit) rather than a deviation from the plan's intent.

## Issues Encountered
- Initial `Divider.test.tsx` draft used `toHaveAttribute` (jest-dom matcher) which is not registered in this project's vitest setup — switched to plain `getAttribute()` assertions, matching the existing `Card.test.tsx` convention. Also corrected a CSS-module className assertion from `/divider\b/` to `/_divider_/` to match the actual CSS-module-hashed class name format (`_divider_<hash>`) rather than an unhashed literal.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both new capabilities (`Card`'s `padding` prop, `Divider`) are ready for 192-13/192-14 to wire into the four pilot composite files (`AnimeDetailHero.module.css`, `ReleasePreviewRow.module.css`, `EpisodeGlassCard.module.css`, `AnimeEdgeNavigation.module.css`) named in Befund B.
- No blockers. `Divider`'s two spacing values were sized specifically to reproduce both existing `<hr>` margins (`var(--space-1) 0` / `var(--space-5) 0`) seen in `AnimeDetailHero.module.css`, confirmed by reading that file (read-only in this plan, per its own instruction).

---
*Phase: 192-ffentliche-anime-detailseite-baustein-reinheit-ssr-randnavig*
*Completed: 2026-11-04*

## Self-Check: PASSED

All 10 claimed created/modified files confirmed present on disk; both task commits (`6264a28cc`, `88788d970`) confirmed present in `git log --oneline --all`.
