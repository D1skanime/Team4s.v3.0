---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 07
subsystem: ui
tags: [css, css-modules, container-queries, member-badge-chain, refactor]

# Dependency graph
requires:
  - phase: 133-04
    provides: "The multi-CSS-module-import alias pattern (chainStyles/lockedStageArtworkStyles/layeredBadgeArtworkStyles) and the dual-class-application precedent for compound selectors split across a moved class and a still-file-local class."
provides:
  - "frontend/src/components/profile/AnimeProjectStage.module.css (27 lines) — standalone AnimeProjectAchievementStage() styles, own unnamed container-type: inline-size"
  - "frontend/src/components/profile/PointsAchievementStage.module.css (31 lines) — standalone PointsAchievementStage() styles, own unnamed container-type: inline-size"
  - "frontend/src/components/profile/ContributionAchievementStage.module.css (35 lines) — ContributionAchievementStage() styles, reuses the existing member-badge-carousel named container declared on .carouselShell (FocalCarousel item, no local container)"
  - "frontend/src/components/profile/MembershipStage.module.css (41 lines) — standalone MembershipStage() styles, own unnamed container-type: inline-size"
  - "MemberBadgeChain.tsx's five-alias CSS-module-import pattern (chainStyles + 4 new stage aliases), ready for Plan 133-09's remaining split targets"
affects: [133-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compound-selector-crosses-file-boundary rule (extended from Plan 133-04): whenever a CSS rule combines a class that MOVES to a new module with a class that STAYS behind (in either direction — moved ancestor + staying descendant, or staying ancestor + moved descendant), the whole rule must stay in the file where the staying class lives, and the DOM element(s) it targets must carry BOTH the moved module's class and the staying file's class (dual-class application). This applies symmetrically regardless of which side of the selector moved."
    - "The .group[data-badge-group]-scoped 'no card surface' specificity-boost twin (originally covering roleBadgeRow/animeProjectStage/pointsAchievementStage/contributionAchievementStage/membershipStage) is intentionally NOT narrowed alongside the unscoped base rule — narrowing it would hash .group to a value the new per-stage CSS modules' DOM never carries, silently dropping the 'wins regardless of injection order' guarantee. It stays listing all five selectors in MemberBadgeChain.module.css indefinitely; each extracted Card root instead gets a second, dual-applied chainStyles class so the twin keeps matching."
    - "Unnamed @container queries placed in a DIFFERENT CSS module than the ancestor with container-type still resolve correctly at runtime, because CSS container-query matching is DOM-tree-based, not CSS-module-file-based — this lets kept-behind compound overrides (e.g. .animeProjectMilestones .currentChip) convert from @media to @container even though they physically live in chainStyles rather than the new stage module."

key-files:
  created:
    - frontend/src/components/profile/AnimeProjectStage.module.css
    - frontend/src/components/profile/PointsAchievementStage.module.css
    - frontend/src/components/profile/ContributionAchievementStage.module.css
    - frontend/src/components/profile/MembershipStage.module.css
  modified:
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "Kept five distinct compound-selector groups behind in MemberBadgeChain.module.css instead of moving them verbatim, applying dual-class at 11 JSX render sites across all four stage components: (1) .animeProjectArtwork/.roleArtworkMist,Backdrop,Motif overrides (ancestor moved, descendants stayed since Plan 133-04); (2) .animeProjectMilestones .currentChip override (ancestor moved, .currentChip is a shared chainStyles utility used elsewhere); (3) the .group[data-badge-group]-scoped 'no card surface' twin for all four extracted selectors (ancestor .group stays chainStyles-local); (4) the .group[data-badge-group='contributions'] .badgeWindow:not(.badgeWindowActive)/[data-carousel-expanded] collapsed-carousel overrides for contribution's Card/title/info/hero/heroArtwork/tierTrack; (5) the .badgeWindowActive-scoped contribution hero overrides at the 640-1100px container breakpoint. All five mirror the CSS-Modules per-file class-hashing constraint first documented in Plan 133-04's SUMMARY — Rule 1 (correctness) auto-fix, not a literal follow of the plan's 'move as-is' interface text."
  - "Split the mixed @container member-badge-carousel (max-width: 1100px) block: the one line unrelated to contribution's own selectors (.group[data-badge-group='contributions'] .chain { --focal-item-size: 88%; }) stays in chainStyles inside its own @container block of the same breakpoint; the four plain contribution-owned rules (contributionAchievementStage/contributionStageHero/contributionHeroArtwork/contributionTierArtwork) moved to ContributionAchievementStage.module.css inside their own identical @container block."
  - "Finished narrowing the unscoped 'no card surface' rule (Task 1 removed animeProjectStage/pointsAchievementStage, Task 2 removed contributionAchievementStage/membershipStage) down to only .roleBadgeRow, satisfying PMUI-07's literal instruction for that rule; the scoped .group[data-badge-group]-twin was deliberately left unnarrowed per the deviation above."

requirements-completed: [PMUI-01, PMUI-02, PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMUI-07]

# Metrics
duration: ~35min
completed: 2026-08-16
---

# Phase 133 Plan 07: Extract Achievement-Stage CSS Modules Summary

**Cut four component-owned CSS modules (AnimeProjectStage, PointsAchievementStage, ContributionAchievementStage, MembershipStage) out of MemberBadgeChain.module.css, giving each its correct container-query strategy (three own an unnamed local container since they render standalone; ContributionAchievementStage reuses the existing member-badge-carousel named container since it renders inside FocalCarousel), while keeping five distinct cross-file compound-selector groups behind via a dual-class JSX pattern to preserve pixel-identical rendering and CSS-cascade specificity guarantees.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments
- `AnimeProjectStage.module.css` (27 lines), `PointsAchievementStage.module.css` (31 lines), `ContributionAchievementStage.module.css` (35 lines), and `MembershipStage.module.css` (41 lines) all exist, all well under the 450-line cap, and each correctly declares its container strategy: `AnimeProjectStage`/`PointsAchievementStage`/`MembershipStage` each declare their own unnamed `container-type: inline-size` (they render standalone in `MemberBadgeChain`'s collectionGroups branch); `ContributionAchievementStage` declares no local container and instead reuses the existing named `member-badge-carousel` container from `.carouselShell` (it renders as a `FocalCarousel` item).
- `MemberBadgeChain.module.css` shrank from 2133 to 2017 lines net (116 lines removed after accounting for the retained compound-override comments and blocks).
- `MemberBadgeChain.tsx` gained four new import aliases (`animeProjectStageStyles`, `pointsAchievementStageStyles`, `contributionAchievementStageStyles`, `membershipStageStyles`) alongside the existing `chainStyles`/`lockedStageArtworkStyles`/`layeredBadgeArtworkStyles`; every reference inside the four owning functions now uses the correct new alias, with 11 JSX sites carrying an additional dual `chainStyles.*` class where a compound override stayed behind (see Deviations).
- All device-width `@media` breakpoints owned by these four selectors converted to `@container` queries at the same values: unnamed `@container` for the three standalone stages, named `@container member-badge-carousel` for contribution (reused, not redeclared). `prefers-reduced-motion` queries stayed as `@media` per plan instruction.
- PMUI-07: the cross-cutting "no card surface" unscoped rule that originally spanned five selectors in one shared block now lists only `.roleBadgeRow`; each of the four extracted modules carries its own single-selector "no card surface" declaration merged directly into its base Card rule.
- `MemberBadgeChain.test.tsx` gained `animeProjectStageCss`/`pointsAchievementStageCss`/`contributionAchievementStageCss`/`membershipStageCss` `readFileSync` constants; every CSS-source-locking assertion that referenced a now-relocated selector was repointed at the correct constant (or split between the new file and `memberBadgeChainCss` where a compound rule stayed behind), with zero assertions deleted or weakened.
- `npx vitest run src/components/profile/MemberBadgeChain.test.tsx`: 101/107 passing (5 pre-existing failures confirmed unrelated and unchanged — see Issues Encountered; 1 skipped, unchanged). Broader `src/components/profile/` + `src/app/members/` sweep: 344/355 passing, all 7 failures pre-existing and documented in `deferred-items.md`.
- `npx tsc --noEmit` and `npx eslint`: zero new errors/warnings; only the already-documented pre-existing `MemberBadgeChain.test.tsx` typecheck errors (9x `TS2552` `containe`/`container` typo, 1x `TS2322` `badgeProgress` prop-shape mismatch) and pre-existing unrelated lint findings remain.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract AnimeProjectStage.module.css and PointsAchievementStage.module.css with local containers** - `395bd381` (feat)
2. **Task 2: Extract MembershipStage.module.css and ContributionAchievementStage.module.css; update tests** - `e53f0967` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/profile/AnimeProjectStage.module.css` - New; `.animeProjectStage*`/`.animeProjectHero`/`.animeProjectArtwork`/`.animeProjectInfo`/`.animeProjectStatus`/`.animeProjectCount`/`.animeProjectProgress*`/`.animeProjectNext`/`.animeProjectMilestones*`/`.animeProjectMarker`/`.animeProjectMilestoneName`/`.animeProjectThreshold`, own `container-type: inline-size`, unnamed `@container (max-width: 700px)`
- `frontend/src/components/profile/PointsAchievementStage.module.css` - New; `.pointsAchievementStage*`/`.pointsStage*`/`.pointsHeroArtwork`/`.pointsProgress*`, own `container-type: inline-size`, unnamed `@container (max-width: 900px/520px)`
- `frontend/src/components/profile/ContributionAchievementStage.module.css` - New; `.contributionAchievementStage*`/`.contributionStage*`/`.contributionTier*`/`.contributionHeroArtwork`, no local container, `@container member-badge-carousel (max-width: 900px/1100px/520px)` reusing the existing named container
- `frontend/src/components/profile/MembershipStage.module.css` - New; `.membershipStage*`/`.membershipHeroArtwork`/`.membershipStageInfo`/`.membershipProgress*`/`.membershipDurationTrack*`/`.membershipStageArtwork`/`.foundingMember*`, own `container-type: inline-size`, unnamed `@container (max-width: 900px/520px)`
- `frontend/src/components/profile/MemberBadgeChain.module.css` - The above selectors' non-compound rules removed; five compound-selector groups intentionally kept behind (see key-decisions); unscoped "no card surface" rule narrowed to `.roleBadgeRow` only; scoped `.group[data-badge-group]`-twin left unnarrowed (deviation)
- `frontend/src/components/profile/MemberBadgeChain.tsx` - Four new aliased imports; all `chainStyles.animeProject*`/`.points*`/`.contribution*`/`.membership*`/`.foundingMember*` references repartitioned to the new aliases; 11 JSX sites gained dual-class application (Card roots for all four stages; `AnimeProjectAchievementStage`'s artwork wrapper span and milestones `<ol>`; `ContributionAchievementStage`'s title/info/hero/heroArtwork/tierTrack)
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - 4 new `readFileSync` constants; ~35 CSS-source-locking assertions repointed at the correct constant or split between a new file and `memberBadgeChainCss`; no assertion content changed, only the string/regex-source variable and (for one `.membershipStageHero` breakpoint check) the `@media`→`@container` literal text to match the actual converted output

## Decisions Made
See `key-decisions` in frontmatter above (compound-selector-stays-behind + dual-class pattern applied five times; mixed `@container` block split; unscoped rule fully narrowed while the scoped twin is deliberately not narrowed).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kept five cross-file compound-selector groups behind in MemberBadgeChain.module.css instead of moving them verbatim, applying dual-class JSX at 11 render sites**
- **Found during:** Task 1 (items a, b, c below) and Task 2 (items d, e below), while grepping the whole file for every occurrence of this plan's owned selector tokens (not just the isolated 1940-2118 line range the plan's `<interfaces>` section described) as instructed by the mandatory pre-read of `133-04-SUMMARY.md`.
- **Issue:** A literal grep-and-cut move of every selector containing this plan's owned tokens would also move rules that combine an owned token with a class that stays chainStyles-local (or vice versa: a compound rule combining a moving ancestor with a chainStyles-local descendant). Because CSS Modules hashes class selectors per source file, either direction of this mismatch produces a class-name hash in the destination file that the actual DOM element never carries, silently breaking the override:
  - (a) `.animeProjectArtwork .roleArtworkMist,.roleArtworkBackdrop { display:none }`, `.animeProjectArtwork .roleArtworkMotif {...}`, `.animeProjectArtwork[data-anime-project-art='first_contribution'] .roleArtworkMotif {...}` — `.animeProjectArtwork` was moving to `AnimeProjectStage.module.css`, but `.roleArtworkMist`/`.roleArtworkBackdrop`/`.roleArtworkMotif` stayed chainStyles-local per Plan 133-04's own prior decision.
  - (b) `.animeProjectMilestones .currentChip { position: static; transform: none; }` plus its `@media (max-width: 700px)` variant — `.animeProjectMilestones` was moving, but `.currentChip` is a shared chainStyles utility class used at three other unrelated sites (`familyStageButton`, `roleProgression`, badge-chip rendering).
  - (c) The `.group[data-badge-group] :is(.roleBadgeRow, .animeProjectStage, .pointsAchievementStage, .contributionAchievementStage, .membershipStage) { border:0; ... }` "no card surface" specificity-boost twin — `.group[data-badge-group]` is chainStyles-local; all four of this plan's Card-root selectors were moving.
  - (d) `.group[data-badge-group='contributions'] .badgeWindow:not(.badgeWindowActive) .contributionAchievementStage/:is(.contributionStageTitle,.contributionStageInfo,.contributionTierTrack)/.contributionStageHero/.contributionHeroArtwork {...}` and `.group[data-badge-group='contributions'] [data-carousel-expanded='true'] .contributionAchievementStage {...}` — `.group`/`.badgeWindow`/`.badgeWindowActive` are chainStyles-local; the five contribution selectors were moving.
  - (e) `.badgeWindowActive .contributionStageHero/.contributionHeroArtwork {...}` inside the `@container member-badge-carousel (min-width: 640px) and (max-width: 1100px)` block, plus the unrelated `.group[data-badge-group='contributions'] .chain { --focal-item-size: 88%; }` rule mixed into the SAME `@container member-badge-carousel (max-width: 1100px)` block as four genuinely-movable contribution rules.
- **Fix:** Left all five rule groups untouched, byte-identical, in `MemberBadgeChain.module.css` (converting the two `@media` cases in (b) to `@container` since unnamed container-query matching is DOM-tree-based and still resolves correctly even though the query text lives in a different CSS module than the ancestor's `container-type` declaration). At each affected JSX render site the element now carries BOTH the new module's class and the still-local `chainStyles` class of the same name: the four stage Card roots (for (c)); `AnimeProjectAchievementStage`'s artwork wrapper span (for (a)) and its milestones `<ol>` (for (b), the leaf `<span>Aktuell</span>` needed no change since `.currentChip` was never moving); `ContributionAchievementStage`'s Card, `<h3>` title, info `<div>`, hero `<div>`, heroArtwork `<span>`, and tierTrack `<ol>` (for (d) and (e)). For the split `@container` block in (e), only the one `.group[...] .chain` rule stayed behind in its own `@container member-badge-carousel (max-width: 1100px)` block in chainStyles; the four genuinely contribution-owned rules moved to `ContributionAchievementStage.module.css`'s own identical `@container` block.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.tsx`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` after each task showed the identical 5 pre-existing failures (none newly introduced, none newly fixed); the scoped-twin test (`'uses a higher-specificity section rule than the global Card class...'`) and the six `.group[data-badge-group='contributions']`-compound contribution tests pass unchanged since their regexes still match `memberBadgeChainCss` verbatim; `npx tsc --noEmit` shows zero new errors.
- **Committed in:** `395bd381` (Task 1, items a-c) and `e53f0967` (Task 2, items d-e)
- **Plan text impact:** This makes the plan's literal Task 2 acceptance criterion ("MemberBadgeChain.module.css's shared 'no card surface' rule now lists only .roleBadgeRow") technically true only for the UNSCOPED copy of that rule (correctly narrowed) — the SCOPED `.group[data-badge-group]`-twin still lists all five selectors, unchanged, per the correctness-preserving fix above. Likewise the plan's interfaces text describing the two `@container member-badge-carousel` blocks as "already correct, move as-is, no conversion needed" is satisfied for four of the five rules inside the first block, with the fifth (`.group[...] .chain`) correctly identified as never having been contribution-owned in the first place and therefore staying. Per the deviation-rules priority order (Rule 1 correctness over literal instruction-following, same precedent as Plan 133-04), the plan's deeper must-have truth — pixel-identical rendering and the "section qualifier wins over the global Card surface regardless of CSS injection order" cascade guarantee — takes priority and is fully satisfied.

---

**Total deviations:** 1 auto-fixed (Rule 1, correctness-preserving, applied across 5 distinct compound-selector groups). No scope creep — every fix is contained within this plan's own four files/eleven JSX sites, uses no new dependencies, and required test-assertion updates only for the CSS-source strings the plan already asked to be repointed.

## Issues Encountered
- **Pre-existing test failures, confirmed unrelated and unchanged:** `MemberBadgeChain.test.tsx` shows the same 5 failing tests both before and after this plan's changes (`renders the generated contribution artwork without a fallback icon` — the already-documented `containe`/`container` TS2552 typo; the three `Phase 119 collection cards`/`Phase 127 RED chain suppresses`/`Phase 120 Task 2` DOM/heading-content assertions already logged in `deferred-items.md` since Plan 133-03/133-04). None of these reference CSS selectors this plan touched. Additionally, a broader `src/components/profile/` + `src/app/members/` sweep surfaced the same two other pre-existing failures already logged in `deferred-items.md` (`MembershipsSection.test.tsx`'s stale `auto-fit` grid-strategy lock from 133-03, and `page.test.tsx`'s stale `styles.familyCard` source-string assertion from 133-05, which this plan's `familyCard`-untouched scope does not resolve). Not auto-fixed per SCOPE BOUNDARY.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The five-alias CSS-module-import pattern (`chainStyles` + `lockedStageArtworkStyles`/`layeredBadgeArtworkStyles`/`animeProjectStageStyles`/`pointsAchievementStageStyles`/`contributionAchievementStageStyles`/`membershipStageStyles`) is established and ready for Plan 133-09's remaining `MemberBadgeChain.module.css` split targets (`.roleBadgeRow` and `.familyCard`/family-collection-card styles).
- Future plans that touch selectors combining a moved class with a still-file-local ancestor OR descendant class should check for the CSS-Modules per-file scoping constraint documented across Plans 133-04 and 133-07 before doing a literal grep-and-cut move, and should reuse the dual-class-application pattern (now demonstrated in both directions: moved-ancestor+staying-descendant, and staying-ancestor+moved-descendant).
- Pre-existing unrelated failures remain open, unchanged — see `deferred-items.md` (5 in `MemberBadgeChain.test.tsx`, 1 in `MembershipsSection.test.tsx`, 1 in `page.test.tsx`).
- The `.group[data-badge-group]`-scoped "no card surface" twin still lists all five selectors (`.roleBadgeRow`/`.animeProjectStage`/`.pointsAchievementStage`/`.contributionAchievementStage`/`.membershipStage`) in `MemberBadgeChain.module.css` by design; Plan 133-09 (which extracts `.roleBadgeRow`) should reuse this same dual-class pattern rather than attempting to narrow or relocate that rule.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

All four new CSS module files exist (`AnimeProjectStage.module.css`, `PointsAchievementStage.module.css`, `ContributionAchievementStage.module.css`, `MembershipStage.module.css`). Task commits `395bd381` and `e53f0967` verified present in `git log`. `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — 101/107 passing, the identical 5 pre-existing failures confirmed unchanged from before this plan, 1 skipped (unchanged). `npx tsc --noEmit` and `npx eslint` show zero new errors/warnings attributable to this plan.
