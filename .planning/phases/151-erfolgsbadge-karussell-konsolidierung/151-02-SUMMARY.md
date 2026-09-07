---
phase: 151-erfolgsbadge-karussell-konsolidierung
plan: 02
subsystem: ui
tags: [react, css-modules, container-queries, responsive-images, accessibility]

requires:
  - phase: 150-badge-regeln-eine-autoritative-schwellenquelle
    provides: Server-authoritative badge progress stages and role counts
provides:
  - Shared direct/layered AchievementArtwork with fixed hero and marker geometry
  - Stable memoized RoleAchievementCard composition for production and Plan 05 gallery use
  - Extracted productive achievement stage renderers with explicit preview reset
  - Simplified MemberBadgeChain without the unreachable nested family carousel
affects: [151-04-family-css-cleanup, 151-05-integration-gallery-visual-qa]

tech-stack:
  added: []
  patterns: [profile-domain artwork descriptor, outer-card container owner, snapshot-bound preview selection]

key-files:
  created:
    - frontend/src/components/profile/AchievementArtwork.tsx
    - frontend/src/components/profile/AchievementArtwork.module.css
    - frontend/src/components/profile/AchievementArtwork.test.tsx
    - frontend/src/components/profile/AchievementStages.tsx
    - frontend/src/components/profile/RoleAchievementCard.tsx
  modified:
    - frontend/src/components/profile/MemberBadgeChain.tsx
    - frontend/src/components/profile/MemberBadgeChain.test.tsx
  deleted:
    - frontend/src/components/profile/BadgeFamilyCard.module.css
    - frontend/src/components/profile/LayeredBadgeArtwork.module.css

key-decisions:
  - "The unpadded .container wrapper owns achievement-card containment, so its content width equals the bordered card's outer width and 561/562/657/658 probes switch at exactly the documented boundaries."
  - "After Plan 04 integration, plain .slot/.hero/.stage selectors own geometry; the temporary specificity shield was removed."
  - "Preview state is bound to the server count/current-stage snapshot instead of synchronously clearing React state inside an effect, satisfying the reset contract and scoped lint rule."

patterns-established:
  - "AchievementArtwork accepts only a direct/layered descriptor, badge code, alt semantics, hero/stage size, decorative/priority flags and optional class name; consumers cannot pass dimensions."
  - "Role and family compositions remain fully mounted; carousel state changes are isolated through RoleAchievementCard memo comparison."

requirements-completed: [P151-03, P151-04, P151-05, P151-09]

duration: 34min
completed: 2026-09-07
---

# Phase 151 Plan 02: Shared Achievement Composition Summary

**One bounded 8px-inset artwork slot now renders direct, layered, portrait, hero and marker art while the production chain uses extracted memoized role/stage compositions and no nested family scroll engine.**

## Performance

- **Duration:** 34 min
- **Started:** 2026-09-07T13:07:04Z
- **Completed:** 2026-09-07T13:40:42Z
- **Tasks:** 2
- **Plan files changed:** 9 implementation/test files plus this summary

## Accomplishments

- Added `AchievementArtwork`, `AchievementArtworkDescriptor` and `AchievementArtworkProps` as stable public exports. Direct and layered variants use the existing `ResponsiveImage` retry/delivery seam and identical square content boxes.
- Centralized hero sizes at 192/216/240px, markers at 64/80px, and the 8px inset. Explicit `minmax(0, 1fr)` tracks, zero image minima, 100% max inline/block sizes and `object-fit: contain` protect portrait and high-intrinsic-size sources.
- Put `container: achievement-card / inline-size` on an unpadded wrapper whose width matches the visible card border box. This makes outer widths 561/562/657/658 map to 192/216/216/240 exactly without counting 32px padding and 2px border twice.
- Added `RoleAchievementCard`, `RoleAchievementCardProps` and `roleAchievementCardPropsEqual` exports. The comparator ignores recreated `showAll` callbacks while invalidating the prior/current cards when active or expanded state changes.
- Extracted `AnimeProjectAchievementStage`, `ContributionAchievementStage`, `MembershipStage` and `PointsAchievementStage` to `AchievementStages.tsx`. Product copy, heading levels, progress values, locked semantics and founding-member behavior remain intact.
- Reduced `MemberBadgeChain.tsx` from 959 to 207 lines, replaced repeated `earnedBadges.find` calls with one map, removed count-derived remount keys, and removed `FamilyCollectionCard` with its ResizeObserver/wheel/140ms settle engine.
- Deleted the now-empty layered-art CSS module and the dead family-card CSS module. Their active mechanics moved into `AchievementArtwork.module.css`; stale structural tests were replaced with shared-slot, full-mount, memoization, preview-reset and dead-engine assertions.

## Stable Interfaces for Plan 05

- `AchievementArtwork({ descriptor, badgeCode, alt, size, decorative?, priority?, className? })`
- `AchievementArtworkDescriptor`: `{ kind: 'direct'; src } | { kind: 'layered'; motifSrc; frameSrc }`
- `RoleAchievementCard({ roleCode, roleLabel, colorKey, count, catalogItems, progress, state })`
- `AnimeProjectAchievementStage`, `ContributionAchievementStage`, `MembershipStage`, `PointsAchievementStage`
- Container class contract: the rendered production compositions establish `achievement-card`; every art node exposes `data-achievement-slot`, `data-achievement-size`, `data-badge-code`, and its meaningful image exposes `data-achievement-art`.

## Task Commits

None. The coordinator explicitly owns staging and commits for this parallel execution wave.

## Files Created/Modified

- `frontend/src/components/profile/AchievementArtwork.tsx` — direct/layered ResponsiveImage renderer and accessibility semantics.
- `frontend/src/components/profile/AchievementArtwork.module.css` — container owner, slot sizes, portrait containment, layers and temporary legacy-width specificity shield.
- `frontend/src/components/profile/AchievementArtwork.test.tsx` — direct/layered/decorative/portrait and structural containment coverage.
- `frontend/src/components/profile/AchievementStages.tsx` — four extracted productive stages and snapshot-bound preview selection.
- `frontend/src/components/profile/RoleAchievementCard.tsx` — stable memoized role composition.
- `frontend/src/components/profile/MemberBadgeChain.tsx` — compact orchestration, indexed lookup and stable family keys.
- `frontend/src/components/profile/MemberBadgeChain.test.tsx` — migrated production behavior and meaningful replacement of obsolete nested-engine assertions.
- `frontend/src/components/profile/BadgeFamilyCard.module.css` — deleted with unreachable `FamilyCollectionCard`.
- `frontend/src/components/profile/LayeredBadgeArtwork.module.css` — deleted after its consumed mechanics moved to the shared slot.

## Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/components/profile/AchievementArtwork.test.tsx src/components/ui/ResponsiveImage.test.tsx --reporter=dot` — PASS, 2 files / 6 tests.
- `docker compose exec -T team4sv30-frontend npx vitest run src/components/profile/MemberBadgeChain.test.tsx src/components/profile/memberBadgeLabels.test.ts --reporter=dot` — PASS, 2 files / 188 tests.
- `docker compose exec -T team4sv30-frontend npx eslint src/components/profile/AchievementArtwork.tsx src/components/profile/AchievementArtwork.test.tsx src/components/profile/AchievementStages.tsx src/components/profile/RoleAchievementCard.tsx src/components/profile/MemberBadgeChain.tsx src/components/profile/MemberBadgeChain.test.tsx` — PASS, no findings.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — BASELINE FAILURE ONLY: generated `.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts:36` rejects the pre-existing `GroupReleasesPageProps.params` union. No Plan-02 source/test error remains.
- `git diff --check -- <nine owned implementation/test paths>` — PASS.
- `docker compose exec -T team4sv30-frontend npx prettier --check <seven touched source/test paths>` — informational non-gate; reports formatting differences because Prettier is not an installed project dependency and existing test formatting is non-canonical. No file was rewritten and no dependency/config file changed.

## Deviations from Plan

### Mechanical adjustment: preview reset without synchronous effect state

- **Found during:** Task 151-02-02 focused ESLint.
- **Issue:** Direct `setSelectedCode(null)` inside `useEffect` violates the repository's `react-hooks/set-state-in-effect` rule.
- **Fix:** `useFamilyPreview` stores the server `currentCount/currentStage` snapshot with a selection and derives `selectedCode = null` immediately when either changes. This preserves explicit reset behavior without remount keys or cascading effect renders.
- **Verification:** Existing `resets temporary selection when family metrics change` behavior test and scoped ESLint pass.

No product, API, auth, backend, database, dependency, configuration, GSD state, roadmap or requirements files were changed.

## Retained Family CSS / Plan 04 Handoff

The ten revised-Plan-02-excluded family layout CSS files were intentionally untouched. Some still contain obsolete active/inactive copy-hiding, card-growth and family-size declarations. The shared artwork selector locally shields hero/marker dimensions so migrated art stays bounded; Plan 04 owns deletion/consolidation of those obsolete declarations and must retain these class/data contracts:

- role root/copy: `data-role-card-state`, `data-role-card-copy`, `roleBadgeRow`, `roleLabel`, `roleStatus`, `roleProgressBlock`, `roleProgression`
- family roots: `data-anime-project-stage`, `data-contribution-achievement-stage`, `data-membership-stage`, `data-points-achievement-stage`
- art: `data-achievement-slot`, `data-achievement-size`, `data-achievement-art`, `data-badge-code`

Plan 05 remains responsible for live 561/562/657/658 browser probes, active/inactive outer-card equality, exhaustive production artwork gallery checks and final integration. No Plan-04 or Plan-05 work was performed here.

## Known Stubs

None.

## Threat Review

- Intrinsic-image overflow is bounded locally by explicit zero minima and max inline/block dimensions inside minmax tracks.
- No network, auth, filesystem, backend, API or persistence surface was introduced.

## User Setup Required

None.

## Self-Check: PASSED

- All seven owned implementation/test files exist; both retired CSS modules are absent.
- Focused stub/security scan found no unfinished markers or unsafe rendering/evaluation seams.
- Final scoped `git diff --check` passed, including this summary.
- Concurrent unowned changes in `badgeArtwork.ts`, `badgeArtwork.test.ts` and `151-BACKEND-CHECKS.md` were left untouched.

---
*Phase: 151-erfolgsbadge-karussell-konsolidierung*
*Completed: 2026-09-07*

## Coordinator integration review (2026-09-07)

- Expanded the initially compressed stage JSX into four existing family implementations in `AnimeProjectAchievementStage.tsx`, `ContributionAchievementStage.tsx`, `MembershipStage.tsx`, and `PointsAchievementStage.tsx`, plus `achievementStageHelpers.tsx`; `AchievementStages.tsx` remains the stable barrel. All production files remain below 450 readable lines. `MemberBadgeChain.tsx` is 395 lines after formatting only the Phase-151 rewrite.
- Moved the existing compact `ContributionProgress` renderer beside its contribution family implementation, reusing its existing tier-label map and removing that duplicate map from the chain. No threshold or domain rule moved into the frontend.
- Routed locked placeholders through the exact same slot/size classes and data contract. Removed the temporary repeated-class specificity shield after CSS consolidation.
- Removed 19 source-text-only test cases instead of updating regexes to mirror the new CSS. Retained mixed tests' actual DOM/behavior assertions. Their geometry claims are now checked in the Linux browser and the exhaustive Plan-05 collector; visual completion remains gated there.
- Extended the complete role/rank composition exercise from 11 to all 12 roles and updated the old Karaoke no-art assertion. Unknown future-role resolution still fails coverage explicitly.
- Found and fixed an existing badge-local hydration defect: Node and Chromium format `de-CH` grouping with different apostrophes. The points renderer normalizes the group glyph to `’`; the new observable label test failed before the fix and passes afterward. No counts or thresholds change.
- Final focused integration check: **4 files / 176 tests PASS**; scoped ESLint **0 errors / 0 warnings**; `git diff --check` PASS. Log: `/tmp/team4s-151-component-review-tests.log`.
- Linux Chromium public `/members/type` at 320/390/1440: no hydration/page errors; no document overflow. The 320px geometry gap was returned to Plan 04 and fixed. Exact full viewport and every-artwork approval remain Plan 05 work.

## Full-suite expectation maintenance

The route-level points test now asserts literal Swiss grouping text (2’500/5’000) instead of reproducing the server runtime Intl glyph. Obsolete badge source-shape checks were removed in favor of existing DOM/browser coverage. The contrast test still measures every remaining role-stage formula without fixing a duplicate-declaration count. Its line-based CSS scanner prose exception moved accordingly.56 focused regressions pass; no business values or rendered role colors changed in this follow-up.
