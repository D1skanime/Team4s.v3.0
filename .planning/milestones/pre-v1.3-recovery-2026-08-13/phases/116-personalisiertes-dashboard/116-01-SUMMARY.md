---
phase: 116-personalisiertes-dashboard
plan: 01
subsystem: api
tags: [typescript, dto-contract, dashboard, badges, contributions]

# Dependency graph
requires: []
provides:
  - "OwnDashboardData/OwnDashboardRoleVolumeEntry/OwnDashboardCategoryProgress/OwnDashboardResponse TS contract in frontend/src/types/dashboard.ts"
  - "MeAnimeContribution.created_at/confirmed_at additive fields"
  - "Exported POINT_MILESTONES/ROLE_VOLUME_TIER_THRESHOLDS/RoleVolumeTier plus resolveNextPointMilestone/resolveNextRoleVolumeThreshold helpers in memberBadgeLabels.ts"
  - "attentionHelpers.ts with ATTENTION_WINDOW_DAYS/isRecentlyAssigned/resolveWorkspaceHref"
affects: [116-02, 116-03, 116-04, 116-05, 116-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dashboard DTO contracts live in frontend/src/types/dashboard.ts as the single source of truth for /me/dashboard shapes"
    - "Threshold values (POINT_MILESTONES, ROLE_VOLUME_TIER_THRESHOLDS) are exported once from memberBadgeLabels.ts and never re-derived by consumers"
    - "Pure, isolated-testable helper modules per dashboard section (attentionHelpers.ts) rather than logic embedded in components"

key-files:
  created:
    - frontend/src/types/dashboard.ts
    - frontend/src/app/me/dashboard/components/attentionHelpers.ts
    - frontend/src/app/me/dashboard/components/attentionHelpers.test.ts
  modified:
    - frontend/src/types/contributions.ts
    - frontend/src/components/profile/memberBadgeLabels.ts
    - frontend/src/components/profile/memberBadgeLabels.test.ts
    - frontend/src/components/contributions/AnimeGroupCard.test.tsx
    - frontend/src/components/contributions/ContributionCard.test.tsx
    - frontend/src/components/contributions/ContributionInbox.test.tsx
    - frontend/src/components/contributions/ContributionSummary.test.tsx
    - frontend/src/components/contributions/reportTargets.test.ts

key-decisions:
  - "category_progress intentionally excludes point-milestone/role-volume rows; those are computed client-side in Plan 116-05 from total_points/role_volume plus the exported memberBadgeLabels.ts threshold helpers"
  - "resolveNextRoleVolumeThreshold returns currentTier: '' (not a RoleVolumeTier) below Bronze so callers can distinguish 'no tier yet' from an actual tier"

patterns-established:
  - "Pattern 2/3 from 116-RESEARCH.md (resolveWorkspaceHref, isRecentlyAssigned) implemented verbatim in attentionHelpers.ts for AttentionSection.tsx (Plan 116-04/05) to import directly"

requirements-completed: [D-02, D-04]

# Metrics
duration: 12min
completed: 2026-07-29
---

# Phase 116 Plan 01: Dashboard-Contracts-Foundation Summary

**Additive TS-Contracts (OwnDashboardData/Response) plus D-02-Attention-Pure-Functions und D-04-Schwellen-Export in memberBadgeLabels.ts — kein UI, kein Backend, reine Wave-0-Grundlage für die restlichen fünf Phase-116-Pläne**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-07-29T09:19:00+02:00
- **Completed:** 2026-07-29T09:22:09+02:00
- **Tasks:** 3
- **Files modified:** 11 (3 created, 8 modified)

## Accomplishments
- `frontend/src/types/dashboard.ts` established as the single source of truth for the `/me/dashboard` DTO shape (`OwnDashboardData`, `OwnDashboardRoleVolumeEntry`, `OwnDashboardCategoryProgress`, `OwnDashboardResponse`)
- `MeAnimeContribution` additively carries `created_at`/`confirmed_at`, mirroring backend fields that already serialize today
- `memberBadgeLabels.ts` exports `POINT_MILESTONES`, `ROLE_VOLUME_TIER_THRESHOLDS`, `RoleVolumeTier`, plus two new pure helpers (`resolveNextPointMilestone`, `resolveNextRoleVolumeThreshold`) so later category-progress UI never redefines threshold values
- New `attentionHelpers.ts` module with `ATTENTION_WINDOW_DAYS`, `isRecentlyAssigned`, `resolveWorkspaceHref` — fully unit-tested pure functions implementing D-02's "neu" classification and workspace-link resolution

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared dashboard DTO contract + additive contribution timestamp fields** - `c3e6ac14` (feat)
2. **Task 2: Export badge thresholds + next-threshold helpers in memberBadgeLabels.ts (D-04)** - `dcb3efde` (feat)
3. **Task 3: attentionHelpers.ts — isRecentlyAssigned / resolveWorkspaceHref (D-02)** - `0d37a78a` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `frontend/src/types/dashboard.ts` - New OwnDashboardData/Response DTO contract (D-03/D-04 foundation)
- `frontend/src/types/contributions.ts` - Additive `created_at`/`confirmed_at` on `MeAnimeContribution`
- `frontend/src/components/profile/memberBadgeLabels.ts` - Additive exports (`POINT_MILESTONES`, `ROLE_VOLUME_TIER_THRESHOLDS`, `RoleVolumeTier`) + two new helpers
- `frontend/src/components/profile/memberBadgeLabels.test.ts` - Six new test cases covering the two new helpers
- `frontend/src/app/me/dashboard/components/attentionHelpers.ts` - New pure-function module (D-02)
- `frontend/src/app/me/dashboard/components/attentionHelpers.test.ts` - Five new test cases with mocked system time
- `frontend/src/components/contributions/AnimeGroupCard.test.tsx` - Added `created_at` to fixture (Rule 3 fix)
- `frontend/src/components/contributions/ContributionCard.test.tsx` - Added `created_at` to fixture (Rule 3 fix)
- `frontend/src/components/contributions/ContributionInbox.test.tsx` - Added `created_at` to fixture (Rule 3 fix)
- `frontend/src/components/contributions/ContributionSummary.test.tsx` - Added `created_at` to fixture (Rule 3 fix)
- `frontend/src/components/contributions/reportTargets.test.ts` - Added `created_at` to both fixture objects (Rule 3 fix)

## Decisions Made
- `category_progress` in `OwnDashboardData` deliberately excludes point-milestone and role-volume rows — those are derived client-side in Plan 116-05 from `total_points`/`role_volume` via the newly exported `memberBadgeLabels.ts` helpers, per the RESEARCH anti-pattern warning against duplicating threshold values.
- `resolveNextRoleVolumeThreshold` uses `currentTier: '' ` (empty string, not a `RoleVolumeTier` member) to represent "below Bronze", giving callers an explicit way to detect "no tier reached yet" without a nullable union.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made `created_at` required on `MeAnimeContribution` broke five pre-existing test fixtures**
- **Found during:** Task 1 (adding `created_at: string` per plan's explicit interface spec)
- **Issue:** `npx tsc --noEmit` failed with TS2322/TS2741 in `AnimeGroupCard.test.tsx`, `ContributionCard.test.tsx`, `ContributionInbox.test.tsx`, `ContributionSummary.test.tsx`, and `reportTargets.test.ts` — none of these files previously constructed a `created_at` field, and the plan's acceptance criteria required `tsc --noEmit` to pass with zero new errors.
- **Fix:** Added `created_at: '2026-01-01T00:00:00Z'` to each fixture object/factory default.
- **Files modified:** `frontend/src/components/contributions/AnimeGroupCard.test.tsx`, `ContributionCard.test.tsx`, `ContributionInbox.test.tsx`, `ContributionSummary.test.tsx`, `reportTargets.test.ts`
- **Verification:** `npx tsc --noEmit` clean afterward
- **Committed in:** `c3e6ac14` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking compile issue directly caused by this plan's required-field change)
**Impact on plan:** Necessary to satisfy the plan's own `tsc --noEmit` zero-new-errors acceptance criterion. No scope creep — only `created_at` fixture values were touched, no other fixture fields changed.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `frontend/src/types/dashboard.ts`, the additive `MeAnimeContribution` fields, the exported badge-threshold helpers, and `attentionHelpers.ts` are all in place, unit-tested, and compile clean.
- Later Phase 116 plans (backend aggregation endpoint, `frontend/src/lib/api.ts` `getOwnDashboard`, and the five dashboard section components) can import these directly without re-deriving shapes or duplicating thresholds.
- No blockers identified for Plan 116-02.

---
*Phase: 116-personalisiertes-dashboard*
*Completed: 2026-07-29*

## Self-Check: PASSED

All created files verified present on disk; all four task/summary commit hashes (`c3e6ac14`, `dcb3efde`, `0d37a78a`, `d9d042c3`) verified present in git history.
