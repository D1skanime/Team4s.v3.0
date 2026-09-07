---
phase: 151-erfolgsbadge-karussell-konsolidierung
plan: 04
status: complete
subsystem: ui-css
tags: [container-queries, responsive-layout, achievement-cards]
requires: [151-02]
provides:
  - Mobile-first family/card layout driven by the existing achievement-card container
  - Stable active/inactive card and copy geometry without family-owned artwork sizes
  - Profile CSS free of FocalCarousel interaction and snap overrides
---

# Phase 151 Plan 04: Family/Card CSS Consolidation Summary

## Completed

- Consolidated all ten owned CSS modules around the unpadded `achievement-card` container. Stage/card roots use `box-sizing: border-box`, 16px inline padding and a 1px border, so the existing outer container counts the documented 32px padding plus 2px border exactly once.
- Made hero/copy layouts stacked by default and side-by-side from `@container achievement-card (min-width: 562px)`. `AchievementArtwork.module.css` remains the only source of 192/216/240 hero, 64/80 marker and 8px inset geometry; its 658px query owns the roomy art transition.
- Kept explicit `minmax(0, 1fr)` tracks and zero minima. The five-role track uses three columns below 562px and five columns from 562px so shared 64px markers are not forced into five undersized mobile columns. The native horizontal points tier list remains intentionally local.
- Removed legacy 248/280/320 and 360/410/450 hero sizing, viewport-driven 520/900/1099/1440/1600/2100 growth blocks, active artwork scaling/card widening, inactive copy/progress/stage hiding, and inactive padding/min-height changes.
- Removed profile-side FocalCarousel `flex-basis`, overflow, control-layout, active z-index and deep interaction overrides. Existing `--focal-item-size` consumer properties remain; FocalCarousel owns its scroll, snap, transform and interaction behavior.
- Preserved existing colors, typography, progress styling, focus treatment and minimum 44px interactive targets.

## Files Changed

- `frontend/src/components/profile/AnimeProjectStage.module.css`
- `frontend/src/components/profile/BadgeChip.module.css`
- `frontend/src/components/profile/ContributionAchievementStage.module.css`
- `frontend/src/components/profile/LockedStageArtwork.module.css`
- `frontend/src/components/profile/MemberBadgeChain.module.css`
- `frontend/src/components/profile/MembershipStage.module.css`
- `frontend/src/components/profile/PointsAchievementStage.module.css`
- `frontend/src/components/profile/RoleBadgeCard.module.css`
- `frontend/src/components/profile/RoleBadgeCard.stages.module.css`
- `frontend/src/components/profile/RoleBadgeCard.status.module.css`
- `.planning/phases/151-erfolgsbadge-karussell-konsolidierung/151-04-SUMMARY.md`

## Verification

- `docker compose exec -T team4sv30-frontend npx vitest run src/components/profile/AchievementArtwork.test.tsx src/components/profile/MemberBadgeChain.test.tsx --reporter=dot` — PASS, 2 files / 97 tests.
- `git diff --check -- <ten Plan 04 CSS paths>` — PASS.
- Scoped source audit for viewport width queries, active `scale`, legacy hero sizes, Focal `flex-basis`, and inactive-card copy hiding — PASS, no matches.
- `docker compose exec -T team4sv30-frontend npm run typecheck` — known baseline failure only in generated `.next/dev/types/app/anime/[id]/group/[groupId]/releases/page.ts:36`; no Plan 04 CSS error.
- The full resolver gate was not run: its pending missing-PNG failures belong to the parallel artwork work and were not weakened.

## Integration Concern (closed by coordinator)

`LockedStageArtwork` is still emitted as a direct `<span>` by `achievementStageHelpers.tsx`, without the shared `data-achievement-slot`/size shell. CSS cannot give locked heroes and markers the exact shared 192/216/240 and 64/80 geometry without creating the forbidden second geometry owner. Plan 04 removed its competing 320px/96px maxima; the coordinating TSX/shared-artwork owner must route locked placeholders through the shared slot shell before final geometry UAT.

No TSX, tests, shared artwork CSS, FocalCarousel, resolver, assets, API/backend/auth, dependency/config, plan/state/roadmap, Git index or commit was changed by Plan 04.

PLAN COMPLETE

## Coordinator browser corrections (2026-09-07)

- Shared TSX now supplies locked hero/marker slot classes, closing the integration concern above; repeated specificity shields in the shared artwork CSS were removed.
- Real 320px browser measurement found heroes constrained to 161–188px width while retaining 192px height, and tier markers overlapping their grid lanes. Reduced outer chain padding to the existing `--space-3` token and used near-full-width contribution cards below the existing 562px container transition. Card roots retain their 16px inner padding; art is not reduced.
- Role, contribution and membership marker grids use a real 80px minimum lane and wrap when needed; progress uses two mobile columns and four from 562px. The progress connector line appears only for its single-row layout. Native horizontal point tiers remain intentionally scrollable as specified in UI-SPEC.
- Replaced the progress artwork's layout-changing border with non-layout outline/shadow treatment, retaining the shared 8px image inset.
- Repeated Linux Chromium 320px measurement: **0 non-square slots, 0 marker/lane overlaps, 0 page errors, 0 document overflow**. Machine result `/tmp/team4s-151-320-fixed.json`; screenshots `/tmp/team4s-phase151-root/{role,progress}-320-fixed.png` in frontend container.
- Final integration component suite **176 PASS**; scoped ESLint and diff check PASS. Final exhaustive viewport/artwork gate remains Plan 05.
