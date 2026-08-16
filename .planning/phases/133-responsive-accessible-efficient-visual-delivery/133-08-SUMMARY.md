---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 08
subsystem: ui
tags: [css, css-modules, container-queries, member-badge-chain, refactor]

# Dependency graph
requires:
  - phase: 133-07
    provides: "The five-alias CSS-module-import pattern (chainStyles/lockedStageArtworkStyles/layeredBadgeArtworkStyles/animeProjectStageStyles/pointsAchievementStageStyles/contributionAchievementStageStyles/membershipStageStyles) and the compound-selector-crosses-file-boundary dual-class-application pattern (both directions)."
provides:
  - "frontend/src/components/profile/BadgeFamilyCard.module.css (296 lines) — FamilyCollectionCard()'s .familyCard/.familyHero*/.familyStages/.familyStage*/.specialAwardCard*/.specialAwardArtwork* styles, reuses the existing member-badge-carousel named container (FocalCarousel item, no local container)"
  - "frontend/src/components/profile/BadgeChip.module.css (257 lines) — the generic non-role badge-row/badge-step rendering plus ContributionProgress()'s .contributionProgress* styles, reuses the same named container"
  - "FAMILY_CARD_COMPACT_QUERY module-scope constant in MemberBadgeChain.tsx, reconciling the JS scroll-centering breakpoint with the CSS @container breakpoint at exactly 820px"
  - "MemberBadgeChain.tsx's seven-alias CSS-module-import pattern (chainStyles + 6 split-target aliases), ready for Plan 133-09's remaining split target (.roleBadgeRow)"
affects: [133-09]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compound-selector-crosses-file-boundary rule (extended again from Plans 133-04/07): applied to two new selector groups this plan — .familyStageButton:has(.currentChip)/.familyStageButton .currentChip (moved ancestor + staying .currentChip descendant), and four badge-chip groups (.badgeWindowActive .badgeArtwork, six .group[data-badge-group=...] .badgeRow/.badgeArtwork/.badgeRowCompact rules across three breakpoints, .badgeWindowActive .badgeStep) where .badgeWindowActive/.group stay chainStyles-local while the descendant moved. All eight stayed behind in MemberBadgeChain.module.css with dual-class JSX application."
    - "Magic-number-to-constant reconciliation: a JS behavior threshold (window.matchMedia scroll-centering breakpoint) and its matching CSS layout breakpoint (@container max-width) are kept numerically identical via one named constant (FAMILY_CARD_COMPACT_QUERY) referenced by both the JS call sites and documented alongside the CSS rule it must stay in sync with."
    - "Mixed @media block splitting (continuing 133-07's pattern): the 520px and 521-900px range blocks each contained a mix of pure-move selectors (.badgeRow/.badgeRowCompact/.badgeArtwork), unrelated chainStyles-local content (.chain/.badgeWindow/roles-only rules), and group-compound rules that stay behind but convert to @container — each concern split into its own correctly-scoped block rather than force-fit into one."

key-files:
  created:
    - frontend/src/components/profile/BadgeFamilyCard.module.css
    - frontend/src/components/profile/BadgeChip.module.css
  modified:
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
    - frontend/src/app/members/[slug]/page.test.tsx

key-decisions:
  - "Kept .familyStageButton:has(.currentChip) and .familyStageButton .currentChip in MemberBadgeChain.module.css (not moved to BadgeFamilyCard.module.css) since .currentChip is a chainStyles-local shared utility class used at three other unrelated sites (roles progression, anime-project milestones). The rendered <button> now carries both badgeFamilyCardStyles.familyStageButton and chainStyles.familyStageButton so both the base declaration (new file) and the compound override (kept file) apply."
  - "Kept four badge-chip compound-selector groups in MemberBadgeChain.module.css: .badgeWindowActive .badgeArtwork (plain rule), six .group[data-badge-group='contributions'/'membership'/'special'] .badgeRow/.badgeArtwork/.badgeRowCompact rules repeated across the base declaration plus two breakpoints (converted from @media to @container member-badge-carousel), and .badgeWindowActive .badgeStep (plain rule). Four JSX sites (the badgeRow div, the badgeStep/badgeStepLocked span, the badgeArtwork/badgeIcon span) now carry dual classes."
  - "The .chain.specialChain rule and the dead/unused .selectedChip rule were left untouched in MemberBadgeChain.module.css — neither matches the plan's explicit family-selector list (.chain is the shared FocalCarousel wrapper class, only combined with the family-scoped .specialChain modifier at the carouselClassName call site, not a FamilyCollectionCard-owned selector; .selectedChip has zero references anywhere in the current .tsx)."
  - "Split the 520px and 521-900px @media blocks each into three pieces: the bare .badgeRow/.badgeRowCompact/.badgeArtwork rules moved to BadgeChip.module.css as @container; the .chain/.badgeWindow/roles-only rules stayed untouched as @media in chainStyles (unrelated content, out of this plan's scope); the six .group[data-badge-group=...] compound rules per breakpoint stayed in chainStyles but converted to their own @container member-badge-carousel block, mirroring Plan 133-07's mixed-block-splitting precedent."
  - "Fixed the pre-existing stale styles.familyCard source-string assertion in page.test.tsx (documented in deferred-items.md since Plan 133-05, never yet fixed) to badgeFamilyCardStyles.familyCard, since Task 1 directly changes that exact source line — leaving it unfixed would have compounded a known-stale assertion this plan is the direct cause of re-breaking."

requirements-completed: [PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMUI-07]

# Metrics
duration: ~25min
completed: 2026-08-16
---

# Phase 133 Plan 08: Extract BadgeFamilyCard and BadgeChip CSS Modules Summary

**Cut the two largest remaining chunks of MemberBadgeChain.module.css (BadgeFamilyCard.module.css for FamilyCollectionCard, BadgeChip.module.css for the generic badge-row/badge-step rendering and ContributionProgress) into container-query-driven modules, and closed the RESEARCH.md-documented 820px magic-number duplication by introducing a single FAMILY_CARD_COMPACT_QUERY constant that keeps the JS scroll-centering behavior and the CSS layout breakpoint numerically reconciled.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `BadgeFamilyCard.module.css` (296 lines) and `BadgeChip.module.css` (257 lines) both exist, both well under the 450-line cap, and both correctly declare no local container — each reuses the existing named `member-badge-carousel` container from `.carouselShell` since their content renders inside a `FocalCarousel` item.
- `MemberBadgeChain.module.css` shrank from 2017 to 1541 lines (476 lines removed, net of the ~90 lines of intentionally-kept compound-override comments and rules).
- `FAMILY_CARD_COMPACT_QUERY = '(max-width: 820px)'` is now the sole occurrence of that string literal in `MemberBadgeChain.tsx` (verified: `grep -c` returns 1); both `window.matchMedia(...)` call sites inside `FamilyCollectionCard()` reference the constant instead of duplicating the literal.
- `MemberBadgeChain.tsx` gained two new import aliases (`badgeFamilyCardStyles`, `badgeChipStyles`) alongside the existing five; every reference inside `FamilyCollectionCard()`, `ContributionProgress()`, and the generic badge-row render block now uses the correct new alias, with 5 JSX sites carrying an additional dual `chainStyles.*` class where a compound override stayed behind (see Deviations/key-decisions).
- All device-width `@media` breakpoints owned by these two selector groups converted to `@container member-badge-carousel` at the same pixel values (520px/1099px/820px for family; 520px/521-900px for badge-chip); `prefers-reduced-motion` queries stayed as `@media` per plan instruction.
- `MemberBadgeChain.test.tsx` gained `badgeFamilyCardCss`/`badgeChipCss` `readFileSync` constants; every CSS-source-locking assertion that referenced a now-relocated selector was repointed at the correct constant (including the `@media`→`@container` text conversions), with zero assertions deleted or weakened.
- `MemberBadgeChain.test.tsx` full suite: 101/107 passing (5 pre-existing failures confirmed unchanged from Plan 133-07 — see Issues Encountered; 1 skipped, unchanged). Broader `src/components/profile/` + `src/app/members/` sweep: 345/355 passing — one better than Plan 133-07's 344/355, because this plan's Task 1 fixed the previously-stale `page.test.tsx` `styles.familyCard` assertion flagged in `deferred-items.md` since Plan 133-05.
- `npx tsc --noEmit` and `npx eslint`: zero new errors/warnings; only the already-documented pre-existing `MemberBadgeChain.test.tsx` typecheck errors (9x `TS2552` `containe`/`container` typo, 1x `TS2322` `badgeProgress` prop-shape mismatch) and one pre-existing unused-variable lint warning remain.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract BadgeFamilyCard.module.css and the FAMILY_CARD_COMPACT_QUERY constant** - `7fd91b13` (feat)
2. **Task 2: Extract BadgeChip.module.css and update MemberBadgeChain.test.tsx** - `11b1ff4f` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/components/profile/BadgeFamilyCard.module.css` - New; `.familyCard`/`.familyEyebrow`/`.familyHero*`/`.familyStatus`/`.familyProgress*`/`.familyStages*`/`.specialAwardCard`/`.specialAwardArtwork*`/`.familyStageItem`/`.familyStageButton`/`.familyStageButtonActive`/`.familyStageLocked`/`.familyStageArtwork`, own container-less `@container member-badge-carousel` breakpoints at 1099px/520px/820px, `prefers-reduced-motion` kept as `@media`
- `frontend/src/components/profile/BadgeChip.module.css` - New; `.badgeRow`/`.badgeRowCompact`/`.badgeStep`/`.badgeStepLocked` (+ 7 palette variants)/`.badgeItem`/`.badgeItemWithImage`/`.badgeText`/`.badgeDetail`/`.badgeIcon`/`.badgeArtwork`/`.contributionProgress*`, `@container member-badge-carousel` breakpoints at 520px/521-900px, `prefers-reduced-motion` kept alongside the moved `.badgeArtwork` rule
- `frontend/src/components/profile/MemberBadgeChain.module.css` - The above selectors' non-compound rules removed; `.familyStageButton:has(.currentChip)`/`.familyStageButton .currentChip` and four badge-chip compound groups intentionally kept behind (see key-decisions), each with an explanatory comment
- `frontend/src/components/profile/MemberBadgeChain.tsx` - Two new aliased imports; `FAMILY_CARD_COMPACT_QUERY` constant added to the module-scope constants block; all `chainStyles.family*`/`.specialAward*`/`.badgeRow*`/`.badgeStep*`/`.badgeItem*`/`.badgeIcon`/`.badgeArtwork`/`.badgeText`/`.badgeDetail`/`.contributionProgress*` references repartitioned to the new aliases; 5 JSX sites gained dual-class application (family stage button; generic badge-row div, badgeStep span, badgeArtwork span)
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` - 2 new `readFileSync` constants; ~10 CSS-source-locking assertions repointed at the correct constant or split between a new file and `memberBadgeChainCss`, including `@media`→`@container` text conversions; no assertion content changed
- `frontend/src/app/members/[slug]/page.test.tsx` - Fixed the pre-existing stale `styles.familyCard` source-string assertion to `badgeFamilyCardStyles.familyCard` (see key-decisions)

## Decisions Made
See `key-decisions` in frontmatter above (kept two compound-selector groups behind with dual-class application; left `.chain.specialChain`/`.selectedChip` untouched; split mixed `@media` blocks into three correctly-scoped pieces each; fixed the pre-existing stale `page.test.tsx` assertion this plan's own change re-breaks).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Kept .familyStageButton:has(.currentChip)/.familyStageButton .currentChip in MemberBadgeChain.module.css instead of moving them, applying dual-class JSX at the family stage button**
- **Found during:** Task 1, while grepping `MemberBadgeChain.module.css` for the plan's owned `.familyStage*` selectors as instructed by the mandatory pre-read of `133-04-SUMMARY.md`/`133-07-SUMMARY.md`.
- **Issue:** A literal grep-and-cut move of every `.familyStageButton`-containing rule would also move `.familyStageButton:has(.currentChip)` and `.familyStageButton .currentChip`, both of which combine the moving `.familyStageButton` ancestor with `.currentChip` — a chainStyles-local shared utility class also used at the roles-progression track and anime-project milestones (unrelated to `FamilyCollectionCard`). Moving these two rules into `BadgeFamilyCard.module.css` would make their `.currentChip` token resolve to a hash the DOM's actual "Aktuell" chip span (which uses `chainStyles.currentChip`) never carries, silently breaking the padding/positioning treatment applied only when a family stage button contains the current-stage chip.
- **Fix:** Left both rules untouched, byte-identical, in `MemberBadgeChain.module.css` with an explanatory comment. The rendered `<button>` now carries both `badgeFamilyCardStyles.familyStageButton` (base declaration) and `chainStyles.familyStageButton` (selector target for the two kept-behind compound rules).
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.tsx`
- **Verification:** `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` after Task 1 showed the identical 5 pre-existing failures (none newly introduced); `npx tsc --noEmit` showed zero new errors.
- **Committed in:** `7fd91b13` (Task 1 commit)

**2. [Rule 1 - Bug] Kept four badge-chip compound-selector groups in MemberBadgeChain.module.css instead of moving them verbatim, applying dual-class JSX at 4 render sites**
- **Found during:** Task 2, while grepping the whole file for every occurrence of `.badgeRow`/`.badgeStep`/`.badgeArtwork` tokens (not just the plan's owned-selector list in isolation) as instructed.
- **Issue:** `.badgeWindowActive .badgeArtwork`, six `.group[data-badge-group="contributions"/"membership"/"special"] .badgeRow/.badgeArtwork/.badgeRowCompact` rules (repeated at the base declaration and two breakpoints), and `.badgeWindowActive .badgeStep` all combine a staying chainStyles-local ancestor (`.badgeWindowActive`/`.group[data-badge-group=...]`, both used across every group) with a moving descendant (`.badgeRow`/`.badgeArtwork`/`.badgeRowCompact`/`.badgeStep`). Moving these into `BadgeChip.module.css` would break every group-specific badge sizing override and the active-carousel-item artwork scale-up, since the DOM element would only carry the new file's hash for the descendant class, not the kept file's.
- **Fix:** Left all eight rules untouched (converting the six group-compound breakpoint rules from `@media` to `@container member-badge-carousel`, since unnamed/named container-query matching is DOM-tree-based, not CSS-module-file-based — same precedent as Plan 133-07). The generic badge-row render site's `<div>` (badgeRow/badgeRowCompact), `<span>` (badgeStep/badgeStepLocked), and inner `<span>` (badgeArtwork/badgeIcon) now each carry both the new module's class and the kept-behind chainStyles class where applicable.
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.tsx`, `frontend/src/components/profile/MemberBadgeChain.test.tsx`
- **Verification:** `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` after Task 2 showed the identical 5 pre-existing failures; the `.badgeWindowActive .badgeArtwork`/`.group[data-badge-group="contributions"] .badgeArtwork` assertions pass unchanged since their regexes now match `memberBadgeChainCss` with the `@container` text; `npx tsc --noEmit` showed zero new errors.
- **Committed in:** `11b1ff4f` (Task 2 commit)

**3. [Rule 1 - Bug] Fixed the pre-existing stale `styles.familyCard` source-string assertion in page.test.tsx**
- **Found during:** Task 1, cross-referencing `deferred-items.md`'s note (logged since Plan 133-05) that this exact assertion was already stale after Plan 133-04's `styles`→`chainStyles` rename.
- **Issue:** `page.test.tsx` asserted `memberBadgeChainSource` (the raw `.tsx` file text) contains `'<Card className={styles.familyCard} data-family={family.key}>'`. This was already failing before this plan (documented, not auto-fixed by 133-05/07 since neither touched that exact line). This plan's Task 1 changes that exact line to `badgeFamilyCardStyles.familyCard`, which would leave the assertion permanently unfixable by any future plan without re-touching this line again.
- **Fix:** Updated the assertion to expect `badgeFamilyCardStyles.familyCard`, matching the source line this task now produces. Since Task 1 is the direct cause of this line's current content, fixing the stale assertion is in scope per Rule 1 (this task's own change is what the assertion needs to track).
- **Files modified:** `frontend/src/app/members/[slug]/page.test.tsx`
- **Verification:** `npx vitest run 'src/app/members/[slug]/page.test.tsx'` — 30/30 passing (was 29/30 passing before, with this assertion the sole failure).
- **Committed in:** `7fd91b13` (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (2x Rule 1 correctness-preserving CSS-Modules scoping fixes mirroring the established Plan 133-04/07 precedent; 1x Rule 1 stale pre-existing test-assertion fix directly caused by this plan's own source change). No scope creep — every fix is contained within this plan's own files/JSX sites, uses no new dependencies, and the test-file fix only touches the one line whose content this plan directly changed.

## Issues Encountered
- **Pre-existing test failures, confirmed unchanged:** `MemberBadgeChain.test.tsx` shows the same 5 failing tests both before and after this plan's changes (`renders the generated contribution artwork without a fallback icon` — the already-documented `containe`/`container` TS2552 typo; the three `Phase 119 collection cards`/`Phase 127 RED chain suppresses`/`Phase 120 Task 2` DOM/heading-content assertions already logged in `deferred-items.md` since Plan 133-03/133-04/133-07). None of these reference CSS selectors this plan touched. A broader `src/components/profile/` + `src/app/members/` sweep confirmed the same pre-existing `MembershipsSection.test.tsx` `auto-fit` grid-strategy lock (also from `deferred-items.md`, unrelated to this plan's scope). Not auto-fixed per SCOPE BOUNDARY.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The seven-alias CSS-module-import pattern (`chainStyles` + `lockedStageArtworkStyles`/`layeredBadgeArtworkStyles`/`animeProjectStageStyles`/`pointsAchievementStageStyles`/`contributionAchievementStageStyles`/`membershipStageStyles`/`badgeFamilyCardStyles`/`badgeChipStyles`) is established and ready for Plan 133-09's remaining split target (`.roleBadgeRow` and its role-specific descendants).
- Future plans that touch selectors combining a moved class with a still-file-local ancestor OR descendant class (in either direction) should check for the CSS-Modules per-file scoping constraint documented across Plans 133-04/07/08 before doing a literal grep-and-cut move, and should reuse the dual-class-application pattern.
- Pre-existing unrelated failures remain open, unchanged — see `deferred-items.md` (5 in `MemberBadgeChain.test.tsx`, 1 in `MembershipsSection.test.tsx`). The previously-open `page.test.tsx` `styles.familyCard` deferred item is now resolved by this plan.
- `MemberBadgeChain.module.css` is now 1541 lines (down from the original 2282 lines across Plans 133-04/07/08); the remaining bulk is almost entirely `.roleBadgeRow`-owned content plus the intentionally-kept compound-override comments/rules from all three split plans, matching Plan 133-07's readiness note for Plan 133-09.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`BadgeFamilyCard.module.css` (296 lines) and `BadgeChip.module.css` (257 lines) both exist and are under 450 lines. Task commits `7fd91b13` and `11b1ff4f` verified present in `git log`. `MemberBadgeChain.tsx` contains exactly one occurrence of the string literal `'(max-width: 820px)'` (verified by `grep -c`). `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — 101/107 passing, the identical 5 pre-existing failures confirmed unchanged, 1 skipped (unchanged). Broader sweep: 345/355 passing (one better than Plan 133-07's 344/355 due to the `page.test.tsx` fix). `npx tsc --noEmit` and `npx eslint` show zero new errors/warnings attributable to this plan.
