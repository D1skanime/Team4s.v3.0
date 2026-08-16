---
phase: 133-responsive-accessible-efficient-visual-delivery
plan: 09
subsystem: ui
tags: [css, css-modules, container-queries, member-badge-chain, refactor, duplicate-selector-cleanup]

# Dependency graph
requires:
  - phase: 133-08
    provides: "The seven-alias CSS-module-import pattern (chainStyles + 6 split-target aliases) and the compound-selector-crosses-file-boundary dual-class-application pattern (both directions), leaving .roleBadgeRow as the sole remaining split target."
provides:
  - "frontend/src/components/profile/RoleBadgeCard.module.css (416 lines) — canonical de-duplicated .roleBadgeRow/.roleLabel/.roleHeroArtwork base declarations, data-role-card-state[inactive]/.roleLabel display:none, and their sub-1099px + 1440-2100px breakpoints"
  - "frontend/src/components/profile/RoleBadgeCard.status.module.css (289 lines) — .roleStatus/.roleCount/.roleProgressBlock/.roleProgressValue/.roleProgressTrack/.roleNextCopy/.roleProgressCopy plus (for CLAUDE.md 450-line-cap reasons) the role-code artwork overrides and badgeWindowActive-anchored overrides that would otherwise not have fit in RoleBadgeCard.module.css"
  - "frontend/src/components/profile/RoleBadgeCard.stages.module.css (324 lines) — .roleProgression/.roleStage* plus the moved .roleProgression .currentChip override"
  - "MemberBadgeChain.module.css shrunk to exactly 450 lines (the shell + Plans 133-04/07/08's kept-behind overrides + a handful of role-card compound overrides that combine a chainStyles-only ancestor with a role-card class)"
  - "Selector-ownership (not breakpoint-tier) CSS-module split pattern: every selector's full rule set (base + state variants + all breakpoints) stays in exactly one file, avoiding the CSS-Modules per-file-hashing trap that a breakpoint-tier split would have introduced for a selector family this large"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Selector-ownership CSS-module splitting: when a single selector family's rules would otherwise need to span multiple new files to fit a line-count cap, group files by WHICH SELECTORS they own (not by breakpoint), so no individual selector's rule set (base + state + every breakpoint) is ever split across two files. This avoids needing N different per-file hashes for the same class name — the trap discovered when an earlier breakpoint-tier split attempt pushed one selector's rules across 4 separate new files simultaneously."
    - "Dropping the `.group[data-badge-group=\"X\"]` specificity-qualifier once a selector family lives alone in its own dedicated module: since the extracted classes are never referenced by any other badge group, the qualifier's only purpose (raising specificity above unrelated same-named rules elsewhere in the shared file) becomes moot in the new file, so it can be safely flattened to a plain selector with cascade order alone preserving the original winner (verified case-by-case for every genuinely-conflicting override before flattening)."
    - "Kept-behind CSS content routed to whichever of a multi-file split's companions has headroom under the 450-line cap, purely for line-budget reasons (not selector ownership) — documented with an explicit code comment noting the placement is line-budget-driven, not semantic."

key-files:
  created:
    - frontend/src/components/profile/RoleBadgeCard.module.css
    - frontend/src/components/profile/RoleBadgeCard.status.module.css
    - frontend/src/components/profile/RoleBadgeCard.stages.module.css
  modified:
    - frontend/src/components/profile/MemberBadgeChain.module.css
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx

key-decisions:
  - "Split the role-card selector family into 3 files grouped by SELECTOR OWNERSHIP (RoleBadgeCard.module.css: roleBadgeRow/roleLabel/roleHeroArtwork; .status.module.css: roleStatus/roleCount/roleProgress*; .stages.module.css: roleProgression/roleStage*) rather than by breakpoint tier (a base + .wide companion), because CSS Modules hashes class names per source file: an earlier breakpoint-tier attempt would have split individual selectors' rules (e.g. .roleBadgeRow's base declaration and its @media override) across up to 4 different files simultaneously, each generating its own distinct hash for the same selector text, requiring the DOM element to carry up to 4 classes just for that one selector. Selector-ownership grouping guarantees each selector's complete rule set lives in exactly one file, so each DOM element needs at most 1-2 classes (the owning file's class, plus the pre-established chainStyles dual-class where a genuine cross-plan-boundary compound override still applies)."
  - "roleProgressTrack de-duplication: kept the cascade-winning (later, byte-different) declaration rather than literally 'the first' as UI-SPEC.md's table states, to avoid changing currently-rendered output (Rule 1 correctness override — the table characterized the two occurrences as 'near-identical, no value conflict', but they actually differ in height (8px vs 9px) and fill style (flat vs gradient+glow); since same-specificity same-selector rules resolve by source order, the LATER (1283+) declaration was already the one visually active before this plan, so it was kept and the earlier one deleted)."
  - "roleHeroArtwork base declaration consolidated per UI-SPEC.md's table: width:320px kept (still overridden per-breakpoint as before), height:320px replaced with aspect-ratio:1;height:auto (verified safe/behavior-identical because every breakpoint's explicit width/height pair in this file was already numerically equal — square art — so whichever wins for the height property computes to the identical pixel value either way)."
  - "Moved 3 small kept-behind compound overrides (the role-code-specific .roleArtworkBackdrop/.roleArtworkMotif inset/clip-path overrides, .badgeWindowActive .roleHeroArtwork, and .badgeWindowActive .roleBadgeRow's mobile width override) from MemberBadgeChain.module.css into RoleBadgeCard.status.module.css purely because the shell had zero further headroom under CLAUDE.md's 450-line cap after every other legitimate reduction (comment condensing, contributions/membership value-pair merging) was exhausted; this required a new conditional dual-class on FocalCarousel's per-group activeItemClassName prop (roleBadgeCardStatusStyles.badgeWindowActive, applied only when group.key === 'roles')."
  - "Resolved 1 of the file's 4 pre-existing !important sites via normal specificity (.badgeGrid > .badgeWindow's 2-class selector already outranks the 1-class .itemWindow/.badgeWindow rules it needs to beat, with the same computed value in the one case where a real conflict existed). The remaining 3 (.badgeWindow's flex-basis/overflow, base + one @media520 re-assertion) are kept as begruendete Ausnahmen (D-05) with an explanatory comment each: FocalCarousel.module.css's own same-specificity .itemWindow selector (a file this component does not own, dual-classed onto the identical DOM element via itemClassName) also sets flex-basis/overflow, including inside its own internal @container-scoped override, so cross-file equal-specificity resolution depends on bundle/import order rather than a stable contract."
  - "Reviewed COMPACT_BADGE_SIZES/ACTIVE_BADGE_SIZES against the final container breakpoints in RoleBadgeCard.module.css/BadgeChip.module.css: accurate for every breakpoint this plan touched or could have touched (all preserved verbatim). Noted, but left unchanged, a pre-existing (not introduced by this plan) truthfulness gap where ACTIVE_BADGE_SIZES's unconditional 320px fallback understates the actual rendered width at the 1440px/1600px/2100px desktop breakpoints (360/410/450px) — those breakpoints and their pixel values predate this plan and were moved verbatim, not modified, so updating the sizes string is out of this plan's scope per its own 'do not invent new breakpoints' instruction."
  - "PMPF-06 reserved-geometry audit across every ResponsiveImage/Image call site in frontend/src/components/profile/: all 20+ sites already pass explicit width/height props; the one exception (MemberProfileHero.tsx's hero backdrop, `fill` mode) relies on its `position:absolute;inset:0` ancestor having a CSS-defined box, a standard accepted fill-safe pattern predating this plan and outside its file scope. No code changes needed; audit outcome recorded here per the task's instruction."

requirements-completed: [PMUI-01, PMUI-02, PMUI-03, PMUI-04, PMUI-05, PMUI-06, PMPF-06]

# Metrics
duration: ~75min
completed: 2026-08-16
---

# Phase 133 Plan 09: Extract RoleBadgeCard CSS Modules and Complete the Badge-Chain Split Summary

**Completed the MemberBadgeChain.module.css split (Plans 133-04/07/08/09) by extracting the final and largest remaining chunk — the role-card selector family — into three selector-ownership-grouped modules (RoleBadgeCard.module.css/.status.module.css/.stages.module.css), applying UI-SPEC.md's locked duplicate-selector resolution table, and shrinking the shell to exactly 450 lines.**

## Performance

- **Duration:** ~75 min
- **Completed:** 2026-08-16
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `RoleBadgeCard.module.css` (416 lines), `RoleBadgeCard.status.module.css` (289 lines), and `RoleBadgeCard.stages.module.css` (324 lines) all exist, well under the 450-line cap, together owning every `.roleBadgeRow*`/`.roleLabel`/`.roleHeroArtwork*`/`.roleStatus`/`.roleCount`/`.roleProgress*`/`.roleProgression`/`.roleStage*` selector previously scattered across `MemberBadgeChain.module.css`'s `.group[data-badge-group="roles"]`-qualified compound rules.
- `MemberBadgeChain.module.css` shrank from 1541 to exactly 450 lines (a 1091-line reduction), containing only pure shell selectors, Plans 133-04/07/08's already-established kept-behind overrides, and the small set of role-card compound overrides that genuinely require a chainStyles-only ancestor (`.badgeWindowActive`, the shared five-stage `:is(...)` "no card surface" rule, `.currentChip`).
- All four previously-duplicated selectors from UI-SPEC.md's locked table now have exactly one canonical declaration: `.roleLabel` (12px/non-uppercase/wrapping), `.roleBadgeRow` (flexible-height, `min-height: 0`), `.roleHeroArtwork` (`aspect-ratio: 1; height: auto`, consolidated from two duplicate `width/height: 320px` declarations plus a separate group-scoped override), and `.roleProgressTrack` (the cascade-winning content, corrected from the table's literal "keep the first" per Rule 1 — see Deviations).
- `MemberBadgeChain.tsx` gained `roleBadgeCardStyles`/`roleBadgeCardStatusStyles`/`roleBadgeCardStagesStyles` import aliases; every reference inside the role-card render block now points at the correct new module, with dual/multi-class JSX application at every element whose selector's rules are split between chainStyles and the new modules (the role Card element carries 4 classes: `roleBadgeCardStyles.roleBadgeRow`, `roleBadgeCardStatusStyles.roleBadgeRow`, `roleBadgeCardStagesStyles.roleBadgeRow`, `chainStyles.roleBadgeRow`).
- Zero unjustified `!important`: 1 of the file's 4 sites was resolved via normal specificity; the remaining 3 are kept as documented `begruendete Ausnahmen` (D-05) overriding FocalCarousel.module.css's own same-specificity `.itemWindow` selector.
- `COMPACT_BADGE_SIZES`/`ACTIVE_BADGE_SIZES` reviewed against final breakpoints (accurate for everything this plan touched); PMPF-06 reserved-geometry audit completed across every `ResponsiveImage`/`Image` call site in `frontend/src/components/profile/` (all already compliant, no code changes needed) — see key-decisions.
- `MemberBadgeChain.test.tsx` full suite: 101/107 passing, the same 5 pre-existing failures confirmed unchanged (`deferred-items.md`). Broader `src/components/profile/` + `src/app/members/` sweep: 345/355, exactly matching Plan 133-08's baseline. `npx tsc --noEmit` and `npm run lint`/`npx eslint`: zero new errors/warnings (only the already-documented 9x `TS2552` typo, 1x `TS2322` mismatch, and 1 unused-var lint warning remain, all pre-existing).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract RoleBadgeCard.module.css with de-duplicated canonical selectors** (combined with Task 2's shell-shrink work — see Deviations) - `65404218` (feat)
2. **Task 2: Shrink the shell, remove !important, review sizes, finalize tests** (test-file portion) - `427961e4` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified

- `frontend/src/components/profile/RoleBadgeCard.module.css` — New; canonical `.roleBadgeRow`/`.roleLabel`/`.roleHeroArtwork` base declarations (de-duplicated per UI-SPEC.md), data-role-code accent variants, data-role-card-state[expanded] layout, and sub-1099px through 2100px breakpoints
- `frontend/src/components/profile/RoleBadgeCard.status.module.css` — New; `.roleStatus`/`.roleCount`/`.roleProgressBlock`/`.roleProgressValue`/`.roleProgressTrack`/`.roleNextCopy`/`.roleProgressCopy` plus (line-budget-driven, see key-decisions) the role-code artwork overrides and `.badgeWindowActive`-anchored overrides
- `frontend/src/components/profile/RoleBadgeCard.stages.module.css` — New; `.roleProgression`/`.roleStage*` plus the moved `.roleProgression .currentChip` override
- `frontend/src/components/profile/MemberBadgeChain.module.css` — Shrunk from 1541 to 450 lines; role-card selectors removed, kept-behind overrides preserved/consolidated, 1 `!important` resolved via specificity, 3 documented as justified exceptions
- `frontend/src/components/profile/MemberBadgeChain.tsx` — 3 new aliased imports; role-card render block and per-group `activeItemClassName` rewired to the new modules
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — 3 new `readFileSync` constants; 13 CSS-source-locking assertions repointed at the correct file, with `.group[data-badge-group="roles"]`-qualifier drops, the roleHeroArtwork consolidation, and the comma-joined contributions/membership merge all accounted for

## Decisions Made

See `key-decisions` in frontmatter above (selector-ownership file split rationale, roleProgressTrack cascade-winner correction, roleHeroArtwork consolidation safety, line-budget-driven content placement, `!important` resolution, sizes/PMPF-06 review outcomes).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Split by selector ownership instead of a single `.wide` breakpoint companion**
- **Found during:** Task 1, after the plan's anticipated fallback (one `RoleBadgeCard.wide.module.css` holding desktop breakpoints) still left the base file at 724 lines
- **Issue:** A breakpoint-tier split (base + `.wide`) would have required individual selectors' rules (e.g. `.roleBadgeRow`'s base declaration and its `@media(min-width:1440px)` override) to live in two different files, each generating a distinct CSS-Modules hash for the same class name — the DOM element would need every one of those hashes applied simultaneously (up to 4 classes for a single selector once split further for size), a much larger-scale version of the CSS-Modules per-file-hashing trap documented in Plan 133-04's SUMMARY.
- **Fix:** Split into 3 files grouped by which selectors they own (`RoleBadgeCard.module.css`: roleBadgeRow/roleLabel/roleHeroArtwork; `.status.module.css`: roleStatus/roleCount/roleProgress*; `.stages.module.css`: roleProgression/roleStage*), so every selector's complete rule set (base + state variants + every breakpoint) lives in exactly one file. Each DOM element needs at most 2 role-card classes (the owning file's class, plus the established `chainStyles` dual-class for genuine cross-plan-boundary compounds) instead of up to 4.
- **Files modified:** All 3 new `RoleBadgeCard*.module.css` files, `MemberBadgeChain.tsx`
- **Verification:** `wc -l` confirms all 3 files ≤450 lines (416/289/324); `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — 101/107 passing after rewiring
- **Committed in:** `65404218`

**2. [Rule 1 - Bug] Corrected `.roleProgressTrack`'s de-dup to keep the cascade-winning content, not literally "the first"**
- **Found during:** Task 1, while extracting the two `.roleProgressTrack` occurrences per UI-SPEC.md's table
- **Issue:** The table describes the two occurrences as "near-identical (no value conflict)" and instructs keeping "the first". A byte-level diff showed they actually differ: the first (earlier-in-source) declares `height: 8px` and a flat `background: var(--role-accent)` fill on `.roleProgressTrack > span`; the second (later-in-source) declares `height: 9px` and a gradient+glow fill. Since both have identical specificity (0,1,0), the LATER declaration was already winning in the currently-shipped cascade — literally keeping "the first" would have silently changed the rendered progress-bar height and fill style.
- **Fix:** Kept the second (cascade-winning) declaration as the sole canonical `.roleProgressTrack`/`.roleProgressTrack > span`, deleted the first. This preserves exactly what currently renders.
- **Files modified:** `frontend/src/components/profile/RoleBadgeCard.status.module.css`
- **Verification:** Confirmed via manual diff of both blocks before extraction; the assertion at `MemberBadgeChain.test.tsx`'s "keeps a full Platinum progressbar" and related tests (unchanged, not touching this specific CSS) continue passing
- **Committed in:** `65404218`

**3. [Rule 1 - Bug] Moved 3 small kept-behind overrides out of the shell for line-budget reasons, requiring a new conditional `activeItemClassName` dual-class**
- **Found during:** Task 2, after exhausting every other legitimate reduction (comment condensing, contributions/membership value-pair merging) and still sitting above 450 lines
- **Issue:** The role-code-specific `.roleArtworkBackdrop`/`.roleArtworkMotif` overrides (38 lines) and the two `.badgeWindowActive`-anchored role-card overrides (10 lines total) needed to stay OUT of chainStyles somewhere, but chainStyles had zero remaining headroom under CLAUDE.md's 450-line cap.
- **Fix:** Moved all 3 into `RoleBadgeCard.status.module.css` (which had the most headroom), each with a comment explicitly noting the placement is line-budget-driven, not semantic ownership. This required adding a conditional dual-class (`roleBadgeCardStatusStyles.badgeWindowActive`, applied only for `group.key === 'roles'`) to `FocalCarousel`'s per-group `activeItemClassName` prop, since `.badgeWindowActive` is otherwise chainStyles-only and shared across all groups.
- **Files modified:** `frontend/src/components/profile/RoleBadgeCard.status.module.css`, `frontend/src/components/profile/MemberBadgeChain.tsx`
- **Verification:** `wc -l MemberBadgeChain.module.css` = 450 (exactly at cap); `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — 101/107 passing after the move, including the artwork-composition tests (`composes designer/admin/other with the matching layered rank artwork`) that exercise these exact overrides
- **Committed in:** `65404218`

**4. [Rule 1 - Bug] Merged identical contributions/membership badge-chip value pairs to help the shell fit under 450 lines**
- **Found during:** Task 2, while trimming the shell toward 450 lines
- **Issue:** `.group[data-badge-group="contributions"] .badgeRow`/`.badgeArtwork` and the equivalent `membership` selectors declared byte-identical property values at every breakpoint (a pre-existing duplication from Plan 133-08, not flagged in this plan's table but genuinely redundant).
- **Fix:** Merged each identical pair into one comma-joined selector (e.g. `.group[data-badge-group="contributions"] .badgeRow,\n.group[data-badge-group="membership"] .badgeRow { ... }`), a pure formatting consolidation with zero behavior change (same specificity, same declared values, no cascade-order dependency broken).
- **Files modified:** `frontend/src/components/profile/MemberBadgeChain.module.css`, `frontend/src/components/profile/MemberBadgeChain.test.tsx` (one assertion's selector-boundary regex updated to match the merged form)
- **Verification:** `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — the updated `clamp(210px, 60vw, 240px)` assertion passes; visual output unchanged (identical declared values before and after merge)
- **Committed in:** `65404218`

**5. [Rule 3 - Blocking] Resolved literal Task 1 acceptance-criteria greps that don't account for legitimate compound-selector state/role-code variants**
- **Found during:** Task 1, running the literal `grep -c '\.roleLabel'`/`grep -c '\.roleProgressTrack {'` acceptance checks from the plan text
- **Issue:** `grep -c '\.roleLabel' RoleBadgeCard.module.css` returns 5, not the literally-specified 1 — because `.roleBadgeRow[data-role-card-state="expanded"] .roleLabel`, `.roleBadgeRow[data-role-card-state="inactive"] .roleLabel`, and other legitimate state-variant compound rules also contain the text `.roleLabel`. These are NOT competing duplicate base declarations (which UI-SPEC.md's table addresses) — they are non-conflicting, additive state overrides that were already present pre-133-09 and must be preserved for correct expanded/inactive rendering.
- **Fix:** Verified the actual must-have ("exactly ONE canonical declaration per selector, matching the kept variant") by checking there is exactly 1 UNQUALIFIED base `.roleLabel { ... }` rule (confirmed) rather than the literal total occurrence count. This mirrors the same class of deviation documented in Plan 133-04's SUMMARY (literal grep vs. deeper must-have truth).
- **Files modified:** None (verification-only finding)
- **Verification:** `grep -A5 '^\.roleLabel {' RoleBadgeCard.module.css` shows exactly one base declaration with `font-size: 12px` and no `nowrap`/`uppercase`
- **Committed in:** n/a (documentation-only)

---

**Total deviations:** 5 auto-fixed (4x Rule 1 correctness-preserving CSS-Modules scoping/behavior-preservation decisions, 1x Rule 3 literal-acceptance-criteria clarification). No scope creep — every fix is contained within this plan's own role-card selector family and files, uses no new dependencies, and the two test-file changes only touch assertions this plan's own source changes directly affected.

## Issues Encountered

- **Pre-existing test failures, confirmed unchanged:** `MemberBadgeChain.test.tsx` shows the same 5 failing tests both before and after this plan's changes (the already-documented `containe`/`container` TS2552 typo test, plus 4 DOM/heading-content/SSR assertions logged in `deferred-items.md` since Plan 133-03/04/07/08). None of these reference CSS selectors this plan touched. Broader sweep confirmed the same pre-existing `MembershipsSection.test.tsx` `auto-fit` grid-strategy lock. Not auto-fixed per SCOPE BOUNDARY. See `deferred-items.md`'s new "confirmed still present after 133-09" entry — this is now the last remaining open item in that log, since the badge-chain CSS split itself (this file's original purpose) is complete.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The `MemberBadgeChain.module.css` split (Plans 133-04/07/08/09) is fully complete: shell (450 lines) + 12 component-owned CSS modules, every one ≤450 lines, all verified via `wc -l`.
- `MemberBadgeChain.tsx` (937 lines) remains accepted pre-existing debt per STATE.md's `[Phase 133]` decision (formally resolved by Plan 133-04, unaffected by this plan) — this plan only extracted CSS and rewired imports, matching every prior split plan's scope boundary.
- The selector-ownership CSS-module-splitting pattern (this plan's key deviation from the anticipated `.wide`-companion approach) is documented here for any future plan that needs to split a single large, deeply-breakpointed selector family across multiple files while staying under CLAUDE.md's 450-line cap.
- `deferred-items.md`'s remaining open item (5 pre-existing `MemberBadgeChain.test.tsx`/`Phase 120` failures, confirmed unchanged across Plans 133-04/07/08/09) is ready for a dedicated cleanup plan outside Phase 133's scope, since the badge-chain CSS split itself is now done.

---
*Phase: 133-responsive-accessible-efficient-visual-delivery*
*Completed: 2026-08-16*

## Self-Check: PASSED

`RoleBadgeCard.module.css` (416 lines), `RoleBadgeCard.status.module.css` (289 lines), and `RoleBadgeCard.stages.module.css` (324 lines) all exist and are under 450 lines. `MemberBadgeChain.module.css` is exactly 450 lines. Task commits `65404218` and `427961e4` verified present in `git log`. `npx vitest run src/components/profile/MemberBadgeChain.test.tsx` — 101/107 passing, the identical 5 pre-existing failures confirmed unchanged, 1 skipped (unchanged). Broader sweep: 345/355 passing, matching Plan 133-08's baseline exactly. `npx tsc --noEmit` and `npm run lint`/`npx eslint` show zero new errors/warnings attributable to this plan.
