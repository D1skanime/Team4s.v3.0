---
phase: 71
plan: "02"
type: summary
subsystem: frontend-profile
tags:
  - phase-71
  - badges
  - display-edit-separation
key-files:
  modified:
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/MemberBadgeChips.tsx
    - frontend/src/components/profile/MemberBadgeHighlights.tsx
    - frontend/src/app/me/profile/components/AchievementBadgesCard.tsx
    - frontend/src/app/me/profile/components/AchievementBadgesCard.test.tsx
    - frontend/src/components/profile/profile.module.css
    - frontend/src/components/profile/MemberBadgeHighlights.module.css
    - frontend/src/app/me/profile/page.module.css
metrics:
  tests: 1 focused badge test
---

# Phase 71-02 Summary: Badge Display/Edit Separation

## What Changed

- Badge labels now return plain German text without glyph prefixes.
- `memberBadgeLabels.ts` now exposes shared badge presentation metadata: label, global Badge variant, and lucide icon.
- `MemberBadgeChips` is display-only. It no longer imports `patchMyBadgeVisibility`, no longer accepts token-shaped props, and no longer renders inline `Ausblenden` controls.
- `MemberBadgeHighlights` renders badges through the global `Badge` primitive with icon + label.
- `AchievementBadgesCard` remains the edit-context visibility manager and now uses the same badge presentation metadata for icon + label.

## Behavior

Display surfaces show badges only. Badge visibility changes remain in `/me/profile` through the existing `AchievementBadgesCard` `FormField` + `Select` flow.

## Checks

- `npm --prefix frontend run test -- src/app/me/profile/components/AchievementBadgesCard.test.tsx src/components/profile/MemberRoleTimeline.test.tsx src/components/profile/RecentMediaSection.test.tsx src/app/admin/my-groups/[id]/page.test.tsx`
- `npm --prefix frontend run typecheck`
- `npm exec eslint -- ...` for the Phase 71 touched frontend files from `frontend/`
- `rg -n "patchMyBadgeVisibility|Ausblenden|badgeHideBtn|badgeError|onVisibilityChanged|token\?" frontend/src/components/profile/MemberBadgeChips.tsx`
- `rg -n "★|♦|◆|✦|✓|◈|⬡" frontend/src/components/profile/memberBadgeLabels.ts`

## Remaining Risks

No backend or DTO changes were made. Unknown future badge codes fall back to neutral presentation with the raw code as label.

## Self-Check

PASSED. Public/display badge components are read-only, and the edit surface still owns visibility changes.
